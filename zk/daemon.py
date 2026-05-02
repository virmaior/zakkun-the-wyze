"""Process supervisor that replaces the cron lines.

Responsibilities (all derived from zk.config.json, nothing hard-coded):

  1. RTSP recorders — one long-running `ffmpeg -f segment` per camera, writing
     to the existing  YYYYMMDD_<cam>/HH/MM.mp4  layout. A camera records only
     during the hours in cameras.<id>.schedule.rtsp (so cam 1 = "*", others =
     "18-05"). The legacy tmp/record-<cam> flag file is still honoured so
     `za-manage.sh stop` keeps working.

  2. Daily reset — at daemon.rtsp_restart_hour:00 every running recorder is
     cycled once (matches the old `za-manage.sh restart` cron).

  3. Hourly SD pull — after each wall-clock hour rolls over (plus
     daemon.sd_pull_delay_minutes), queue a za-toru.sh pull for every camera
     whose schedule.sd includes that hour. Pulls run *sequentially* so the
     heaviest hours never have N scp's competing with N ffmpeg recorders.

  4. Post-hour processing — after a pull (or, for hours that are rtsp-only,
     after the hour ends) write the JSON manifest and, if Pillow is present,
     the server-side motion scores. These run in the same sequential queue
     under nice(daemon.nice).

State (which hours have been pulled/scored) lives in the SQLite hour_job
table, so a daemon restart does not re-pull yesterday.

This module performs no media deletion and never touches za-horu / clips —
those stay on their existing path.
"""
from __future__ import annotations

import datetime as _dt
import os
import shlex
import signal
import subprocess
import sys
import time
from collections import deque
from pathlib import Path
from typing import Deque, Dict, Optional, Tuple

from . import config, manifest, store

try:
    from . import score as _score
except Exception:
    _score = None


# --------------------------------------------------------------------------- #
#  RTSP recorder
# --------------------------------------------------------------------------- #

class Recorder:
    """One ffmpeg segment process per camera. File-compatible with za-mono-adv.sh."""

    def __init__(self, cam: str):
        self.cam = cam
        self.proc: Optional[subprocess.Popen] = None
        self.flag = config.tmp_dir() / f"record-{cam}"

    # -- ffmpeg command ----------------------------------------------------
    def _cmd(self) -> list[str]:
        cfg = config.load()
        r = config.rtsp_for(self.cam)
        ip = config.camera_ip(self.cam)
        out_pat = str(config.webroot() / f"%Y%m%d_{self.cam}" / "%H" / "%M.mp4")
        url = f"rtsp://{r['username']}:{r['password']}@{ip}/{r['endpoint']}"
        return [
            cfg["ffmpeg"], "-hide_banner", "-loglevel", "error",
            "-rtsp_transport", r.get("transport", "tcp"),
            "-i", url,
            "-c:v", "copy",
            "-c:a", "aac", "-b:a", "64k", "-ar", "16000", "-ac", "1",
            "-map", "0",
            "-f", "segment", "-segment_time", "60",
            "-reset_timestamps", "1", "-strftime", "1",
            out_pat,
        ]

    def _ensure_dirs(self, now: _dt.datetime) -> None:
        for t in (now, now + _dt.timedelta(hours=1)):
            d = config.webroot() / f"{t:%Y%m%d}_{self.cam}" / f"{t:%H}"
            d.mkdir(parents=True, exist_ok=True)

    # -- lifecycle ---------------------------------------------------------
    def running(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def start(self, now: _dt.datetime) -> None:
        if self.running():
            return
        if self.flag.exists() and self.proc is None:
            # A za-mono-adv.sh instance (or a previous daemon) already owns
            # this camera; don't fight it.
            log(f"cam {self.cam}: record flag present, not starting a second recorder")
            return
        self._ensure_dirs(now)
        self.flag.parent.mkdir(parents=True, exist_ok=True)
        self.flag.touch()
        log(f"cam {self.cam}: starting recorder → {' '.join(shlex.quote(a) for a in self._cmd()[:6])} …")
        self.proc = subprocess.Popen(
            self._cmd(),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            preexec_fn=os.setsid,
        )

    def stop(self) -> None:
        if self.flag.exists():
            try: self.flag.unlink()
            except OSError: pass
        if self.running():
            log(f"cam {self.cam}: stopping recorder")
            self.proc.send_signal(signal.SIGTERM)
            try:
                self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        self.proc = None

    def tick(self, now: _dt.datetime, should_run: bool) -> None:
        # honour external stop: if someone removed the flag, shut down.
        if self.running() and not self.flag.exists():
            log(f"cam {self.cam}: flag removed externally → stopping")
            self.stop()
            return
        if should_run:
            self._ensure_dirs(now)
            if not self.running():
                self.start(now)
        else:
            if self.running():
                self.stop()


# --------------------------------------------------------------------------- #
#  Hourly job queue (sequential)
# --------------------------------------------------------------------------- #

HourKey = Tuple[str, str, int]  # (date, cam, hour)


class JobQueue:
    """FIFO of (kind, date, cam, hour). One job runs at a time so SD pulls and
    scoring never pile onto the recorders during the busy window."""

    def __init__(self, dcfg: dict):
        self.q: Deque[Tuple[str, str, str, int]] = deque()
        self.current: Optional[subprocess.Popen] = None
        self.current_job: Optional[Tuple[str, str, str, int]] = None
        self.dcfg = dcfg

    def enqueue(self, kind: str, date: str, cam: str, hour: int) -> None:
        if store.job_state(date, cam, kind, hour) in ("queued", "running", "done"):
            return
        store.set_job_state(date, cam, kind, hour, "queued")
        self.q.append((kind, date, cam, hour))
        log(f"queue + {kind} {date} cam{cam} h{hour:02d} (depth={len(self.q)})")

    # -- execution ---------------------------------------------------------
    def _spawn_sd(self, date: str, cam: str, hour: int) -> subprocess.Popen:
        script = self.dcfg["toru_script"]
        args = ["zsh", script, f"d={date}", f"s={hour:02d}", f"e={hour:02d}",
                f"cam={cam}", f"scp={self.dcfg['toru_scp_octet']}"]
        if self.dcfg.get("sd_pull_miru"):
            args.append("m=y")
        log(f"  → {' '.join(args)}")
        return subprocess.Popen(
            args, cwd=str(config.webroot()),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            preexec_fn=lambda: os.nice(self.dcfg.get("nice", 10)),
        )

    def _run_post(self, date: str, cam: str, hour: int) -> None:
        """Manifest + score run in-process (cheap, and we want their errors)."""
        try:
            os.nice(self.dcfg.get("nice", 10))
        except OSError:
            pass
        try:
            manifest.write(date, cam, hour)
        except Exception as e:
            log(f"  manifest failed: {e}")
        if self.dcfg.get("post_hour_score") and _score and _score.available():
            try:
                p = _score.write(date, cam, hour)
                log(f"  score → {p}")
            except Exception as e:
                log(f"  score failed: {e}")

    def tick(self) -> None:
        # reap current
        if self.current is not None:
            rc = self.current.poll()
            if rc is None:
                return  # still running; one-at-a-time
            kind, date, cam, hour = self.current_job  # type: ignore
            ok = (rc == 0)
            store.set_job_state(date, cam, kind, hour,
                                "done" if ok else "failed", f"rc={rc}")
            log(f"queue ✓ {kind} {date} cam{cam} h{hour:02d} rc={rc}")
            if kind == "sd":
                # chain post-processing for the same hour
                self._run_post(date, cam, hour)
                store.set_job_state(date, cam, "post", hour, "done")
            self.current = None
            self.current_job = None

        # launch next
        if self.current is None and self.q:
            kind, date, cam, hour = self.q.popleft()
            store.set_job_state(date, cam, kind, hour, "running")
            self.current_job = (kind, date, cam, hour)
            if kind == "sd":
                self.current = self._spawn_sd(date, cam, hour)
            elif kind == "post":
                self._run_post(date, cam, hour)
                store.set_job_state(date, cam, "post", hour, "done")
                self.current_job = None
            else:
                store.set_job_state(date, cam, kind, hour, "failed", "unknown kind")
                self.current_job = None


# --------------------------------------------------------------------------- #
#  Main loop
# --------------------------------------------------------------------------- #

def log(msg: str) -> None:
    ts = _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[zk-daemon {ts}] {msg}", flush=True)


def _prev_hour(now: _dt.datetime) -> Tuple[str, int]:
    t = now - _dt.timedelta(hours=1)
    return t.strftime("%Y%m%d"), t.hour


def run(dry_run: bool = False, once: bool = False) -> None:
    dcfg = config.daemon()
    cams = config.camera_ids()
    if not cams:
        log("no cameras configured; nothing to do")
        return

    recorders: Dict[str, Recorder] = {c: Recorder(c) for c in cams}
    queue = JobQueue(dcfg)
    last_reset_day: Optional[str] = None
    last_queued_hour: Optional[Tuple[str, int]] = None

    stop = {"flag": False}
    def _sig(_s, _f):
        stop["flag"] = True
    signal.signal(signal.SIGTERM, _sig)
    signal.signal(signal.SIGINT, _sig)

    log(f"started; cams={cams} tick={dcfg['tick_seconds']}s "
        f"dry_run={dry_run} pillow={'yes' if (_score and _score.available()) else 'no'}")

    while not stop["flag"]:
        now = _dt.datetime.now()

        # ---- 1. recorder supervision -----------------------------------
        for cam, rec in recorders.items():
            should = now.hour in config.schedule_for(cam, "rtsp")
            if dry_run:
                pass
            else:
                rec.tick(now, should)

        # ---- 2. daily reset --------------------------------------------
        if (now.hour == dcfg["rtsp_restart_hour"] and now.minute == 0
                and last_reset_day != now.strftime("%Y%m%d")):
            log("daily rtsp reset")
            if not dry_run:
                for rec in recorders.values():
                    rec.stop()
                time.sleep(3)
                for cam, rec in recorders.items():
                    if now.hour in config.schedule_for(cam, "rtsp"):
                        rec.start(now)
            last_reset_day = now.strftime("%Y%m%d")

        # ---- 3/4. hourly pull + post queue -----------------------------
        if now.minute >= dcfg["sd_pull_delay_minutes"]:
            pdate, phour = _prev_hour(now)
            if last_queued_hour != (pdate, phour):
                for cam in cams:
                    sd_hours = config.schedule_for(cam, "sd")
                    rtsp_hours = config.schedule_for(cam, "rtsp")
                    if phour in sd_hours:
                        queue.enqueue("sd", pdate, cam, phour)
                    elif phour in rtsp_hours:
                        # no SD copy for this hour but we still want manifest+score
                        queue.enqueue("post", pdate, cam, phour)
                last_queued_hour = (pdate, phour)

        if not dry_run:
            queue.tick()

        if once:
            break
        time.sleep(dcfg["tick_seconds"])

    log("shutting down")
    for rec in recorders.values():
        rec.stop()
