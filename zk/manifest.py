"""Per-hour JSON manifest builder.

Produces a single JSON document per (date, cam, hour) that the new viewer can
render without any server-side HTML generation. The document lists, for *each
configured source*, which minute mp4s and which screenshot JPEGs exist on disk
right now — so the viewer can flip between the SD and RTSP copies of the same
minute.

The manifest is written next to the existing artefacts as
    <day_dir>/zk-HH.json
in the *first* source directory that exists (preferred order from config), so
it is reachable over the same static webserver that already serves
screensHH.html. It is also returned to callers for direct CGI delivery.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import config, sources, store


def build(date: str, cam: str | int, hour: str | int,
          root: Optional[Path] = None, record: bool = False) -> Dict[str, Any]:
    """Assemble the manifest. Pure read of the filesystem by default.

    `record=True` additionally upserts the minute inventory into SQLite; this
    is used by the CLI/daemon paths which run as a user that owns the DB. The
    CGI GET path leaves it False so a www-data process never needs write
    access just to *serve* a manifest (root cause of the "attempt to write a
    readonly database" error).
    """
    cam = str(cam)
    hour_i = int(hour)
    hour_s = f"{hour_i:02d}"
    root = root or config.webroot()

    src_objs = sources.for_camera(cam)
    src_info: Dict[str, Dict[str, Any]] = {}
    minute_rows: List[Dict[str, Any]] = []

    # union of minutes across all sources
    all_minutes: set[str] = set()
    per_src_minutes: Dict[str, set[str]] = {}
    per_src_screens: Dict[str, Dict[str, List[str]]] = {}

    for src in src_objs:
        hdir = src.hour_dir(date, cam, hour_i, root)
        day_dir = src.day_dir(date, cam, root)
        rel_day = day_dir.name if day_dir else src.day_dirname(date, cam)
        src_info[src.id] = {
            "label": src.label,
            "sep": src.sep,
            "day_dir": rel_day,            # relative to webroot, for URL building
            "hour_dir": f"{rel_day}/{hour_s}" if hdir else None,
            "present": hdir is not None,
        }
        if not hdir:
            per_src_minutes[src.id] = set()
            per_src_screens[src.id] = {}
            continue
        mins = set(sources.list_minutes(hdir))
        screens = sources.list_screens(hdir)
        per_src_minutes[src.id] = mins
        per_src_screens[src.id] = screens
        all_minutes |= mins | set(screens.keys())

        # feed the sqlite inventory while we have the data in hand
        for mm in sorted(mins | set(screens.keys())):
            mp4 = hdir / f"{mm}.mp4"
            minute_rows.append({
                "date": date, "cam": cam, "source": src.id,
                "hour": hour_i, "minute": int(mm),
                "has_video": 1 if mm in mins else 0,
                "screenshots": len(screens.get(mm, [])),
                "bytes": mp4.stat().st_size if mp4.is_file() else 0,
            })

    if record and minute_rows:
        try:
            store.upsert_minutes(minute_rows)
        except Exception as e:  # never let inventory write break a read
            print(f"zk.manifest: inventory write skipped: {e}")

    minutes_out: List[Dict[str, Any]] = []
    for mm in sorted(all_minutes):
        entry: Dict[str, Any] = {"minute": mm, "sources": {}}
        for src in src_objs:
            sd: Dict[str, Any] = {"video": mm in per_src_minutes[src.id]}
            shots = per_src_screens[src.id].get(mm, [])
            if shots:
                sd["screens"] = shots
            entry["sources"][src.id] = sd
        minutes_out.append(entry)

    manifest = {
        "date": date,
        "cam": cam,
        "hour": hour_s,
        "sources": src_info,
        "source_order": [s.id for s in src_objs],
        "minutes": minutes_out,
        "capture": config.load()["capture"],
        "orders" : config.cam_orders(),
        "neighbors": _neighbors(date, cam, hour_i, root),
    }
    # attach precomputed motion scores if zk score has run for this hour
    scores = _load_scores(date, cam, hour_s, root, src_objs)
    if scores is not None:
        manifest["scores"] = scores
    return manifest


def _load_scores(date, cam, hour_s, root, src_objs):
    for src in src_objs:
        d = src.day_dir(date, cam, root)
        if not d:
            continue
        f = d / f"zk-score-{hour_s}.json"
        if f.is_file():
            try:
                return json.loads(f.read_text())
            except Exception:
                pass
    return None


def _neighbors(date: str, cam: str, hour: int, root: Path) -> Dict[str, Any]:
    """Best-effort prev/next cam + prev/next hour links so the viewer doesn't
    have to guess separators (the choke point that broke za-miru.js)."""
    cams = config.camera_ids() or [cam]
    try:
        idx = cams.index(cam)
    except ValueError:
        cams = sorted(set(cams) | {cam}, key=lambda s: int(s))
        idx = cams.index(cam)

    def cam_exists(c: str) -> bool:
        return bool(sources.any_hour_dir(date, c, hour, root))

    def hr_exists(h: int) -> bool:
        return 0 <= h <= 23 and bool(sources.any_hour_dir(date, cam, h, root))

    return {
        "cams": cams,
        "prev_cam": next((c for c in reversed(cams[:idx]) if cam_exists(c)), None),
        "next_cam": next((c for c in cams[idx + 1:] if cam_exists(c)), None),
        "prev_hour": hour - 1 if hr_exists(hour - 1) else None,
        "next_hour": hour + 1 if hr_exists(hour + 1) else None,
    }


def write(date: str, cam: str | int, hour: str | int,
          root: Optional[Path] = None) -> Optional[Path]:
    root = root or config.webroot()
    m = build(date, cam, hour, root, record=True)
    # write into the first source dir that exists, so it's served statically
    for sid in m["source_order"]:
        info = m["sources"][sid]
        if info["present"]:
            out = root / info["day_dir"] / f"zk-{m['hour']}.json"
            out.write_text(json.dumps(m, separators=(",", ":")))
            return out
    return None


def write_day(date: str, cam: str | int, s_hour: int = 0, e_hour: int = 23,
              root: Optional[Path] = None) -> List[Path]:
    written: List[Path] = []
    for h in range(s_hour, e_hour + 1):
        p = write(date, cam, h, root)
        if p:
            written.append(p)
    return written
