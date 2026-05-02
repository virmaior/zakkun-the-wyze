"""SQLite metadata store.

This is the single place that records pipeline state so status views become
queries instead of filesystem globs. It is purely additive: nothing else in
the legacy chain reads it yet, and it never deletes media.
"""
from __future__ import annotations

import json
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from . import config


SCHEMA = """
CREATE TABLE IF NOT EXISTS minute (
    date        TEXT    NOT NULL,           -- YYYYMMDD
    cam         TEXT    NOT NULL,
    source      TEXT    NOT NULL,           -- e.g. 'sd', 'rtsp'
    hour        INTEGER NOT NULL,           -- 0-23
    minute      INTEGER NOT NULL,           -- 0-59
    has_video   INTEGER NOT NULL DEFAULT 0,
    screenshots INTEGER NOT NULL DEFAULT 0, -- count of screenMM-NNN.jpg
    bytes       INTEGER NOT NULL DEFAULT 0,
    seen_at     INTEGER NOT NULL,           -- epoch of last scan
    PRIMARY KEY (date, cam, source, hour, minute)
);

CREATE TABLE IF NOT EXISTS clip_request (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT    NOT NULL,
    cam         TEXT    NOT NULL,
    source      TEXT,                       -- requested source; NULL = let za-horu decide
    hour        INTEGER NOT NULL,
    start_min   INTEGER NOT NULL,
    end_min     INTEGER NOT NULL,
    label       TEXT,
    ps          TEXT,                       -- partial-start seconds (legacy ps:)
    pe          TEXT,                       -- partial-end seconds   (legacy pe:)
    tmp_file    TEXT,                       -- legacy tmp/*.tmp this was written into
    state       TEXT    NOT NULL DEFAULT 'queued',
    created_at  INTEGER NOT NULL,
    payload     TEXT                        -- original JSON range, for round-tripping
);

CREATE INDEX IF NOT EXISTS clip_request_date ON clip_request(date, hour, cam);

CREATE TABLE IF NOT EXISTS review (
    date        TEXT    NOT NULL,
    cam         TEXT    NOT NULL,
    hour        INTEGER NOT NULL,
    reviewed_at INTEGER NOT NULL,
    range_count INTEGER NOT NULL,
    PRIMARY KEY (date, cam, hour)
);

CREATE TABLE IF NOT EXISTS hour_job (
    date        TEXT    NOT NULL,
    cam         TEXT    NOT NULL,
    source      TEXT    NOT NULL,       -- 'sd' pull, 'score', etc.
    hour        INTEGER NOT NULL,
    state       TEXT    NOT NULL,       -- queued|running|done|failed
    detail      TEXT,
    updated_at  INTEGER NOT NULL,
    PRIMARY KEY (date, cam, source, hour)
);
"""


# ---- daemon job state ------------------------------------------------------

def job_state(date: str, cam: str | int, source: str, hour: int) -> Optional[str]:
    with connect() as con:
        con.executescript(SCHEMA)
        row = con.execute(
            "SELECT state FROM hour_job WHERE date=? AND cam=? AND source=? AND hour=?",
            (date, str(cam), source, int(hour)),
        ).fetchone()
        return row["state"] if row else None


def set_job_state(date: str, cam: str | int, source: str, hour: int,
                  state: str, detail: str = "") -> None:
    import time as _t
    with connect() as con:
        con.executescript(SCHEMA)
        con.execute(
            """INSERT INTO hour_job (date,cam,source,hour,state,detail,updated_at)
               VALUES (?,?,?,?,?,?,?)
               ON CONFLICT(date,cam,source,hour) DO UPDATE SET
                 state=excluded.state, detail=excluded.detail,
                 updated_at=excluded.updated_at""",
            (date, str(cam), source, int(hour), state, detail, int(_t.time())),
        )


def _path() -> Path:
    return config.sqlite_path()


@contextmanager
def connect():
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(p)
    con.row_factory = sqlite3.Row
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init() -> None:
    with connect() as con:
        con.executescript(SCHEMA)


# ---- minute inventory ------------------------------------------------------

def upsert_minutes(rows: Iterable[Dict[str, Any]]) -> int:
    now = int(time.time())
    n = 0
    with connect() as con:
        con.executescript(SCHEMA)
        for r in rows:
            con.execute(
                """INSERT INTO minute
                   (date, cam, source, hour, minute, has_video, screenshots, bytes, seen_at)
                   VALUES (?,?,?,?,?,?,?,?,?)
                   ON CONFLICT(date, cam, source, hour, minute) DO UPDATE SET
                     has_video=excluded.has_video,
                     screenshots=excluded.screenshots,
                     bytes=excluded.bytes,
                     seen_at=excluded.seen_at""",
                (r["date"], str(r["cam"]), r["source"], int(r["hour"]),
                 int(r["minute"]), int(r["has_video"]), int(r["screenshots"]),
                 int(r.get("bytes", 0)), now),
            )
            n += 1
    return n


def hour_coverage(date: str, cam: str | int) -> Dict[str, List[int]]:
    """Return {source_id: [count_per_hour]*24} for a (date,cam)."""
    out: Dict[str, List[int]] = {}
    with connect() as con:
        con.executescript(SCHEMA)
        for row in con.execute(
            """SELECT source, hour, COUNT(*) AS n FROM minute
               WHERE date=? AND cam=? AND has_video=1
               GROUP BY source, hour""",
            (date, str(cam)),
        ):
            out.setdefault(row["source"], [0] * 24)[row["hour"]] = row["n"]
    return out


# ---- clip requests ---------------------------------------------------------

def record_clip_requests(ranges: List[Dict[str, Any]], tmp_file: Optional[str]) -> List[int]:
    now = int(time.time())
    ids: List[int] = []
    with connect() as con:
        con.executescript(SCHEMA)
        for r in ranges:
            cur = con.execute(
                """INSERT INTO clip_request
                   (date, cam, source, hour, start_min, end_min, label,
                    ps, pe, tmp_file, state, created_at, payload)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (r["date"], str(r["cam"]), r.get("source"), int(r["hour"]),
                 int(r["start"]), int(r["end"]), r.get("label"),
                 r.get("ps"), r.get("pe"), tmp_file, "queued", now,
                 json.dumps(r, separators=(",", ":"))),
            )
            ids.append(cur.lastrowid)
        # mark the (date,cam,hour)s reviewed
        seen = {(r["date"], str(r["cam"]), int(r["hour"])) for r in ranges}
        for d, c, h in seen:
            con.execute(
                """INSERT INTO review (date, cam, hour, reviewed_at, range_count)
                   VALUES (?,?,?,?,?)
                   ON CONFLICT(date,cam,hour) DO UPDATE SET
                     reviewed_at=excluded.reviewed_at,
                     range_count=excluded.range_count""",
                (d, c, h, now, sum(1 for r in ranges
                                   if r["date"] == d and str(r["cam"]) == c
                                   and int(r["hour"]) == h)),
            )
    return ids
