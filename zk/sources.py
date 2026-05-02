"""Source-aware path resolution.

A *source* is one independent on-disk copy of footage for a given (date, cam).
Today there are two:

    sd    →  YYYYMMDD-N/HH/MM.mp4   (and historically bare YYYYMMDD/ for cam 1)
    rtsp  →  YYYYMMDD_N/HH/MM.mp4

Both may exist for the same hour and both are kept. This module is the single
place that knows how those map to directories, so every caller (manifest
builder, CGI, future za-horu replacement) resolves paths identically.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

from . import config


_SCREEN_RE = re.compile(r"^screen(?P<min>\d{2})-(?P<idx>\d{3})\.(?:jpg|jpeg|png)$")


@dataclass(frozen=True)
class Source:
    id: str
    label: str
    sep: str            # "-" or "_"
    bare_cam1: bool     # True → cam 1 may appear as YYYYMMDD/ with no suffix

    def day_dirname(self, date: str, cam: str | int) -> str:
        cam = str(cam)
        if self.bare_cam1 and cam == "1":
            # Historical layout: cam 1 from the SD source had no suffix at all.
            # We still *prefer* the suffixed form if it exists; callers use
            # day_dir() below which checks both.
            return date
        return f"{date}{self.sep}{cam}"

    def day_dir(self, date: str, cam: str | int, root: Optional[Path] = None) -> Optional[Path]:
        root = root or config.webroot()
        cam = str(cam)
        # Prefer suffixed form even for cam 1 (newer convention), fall back to bare.
        suffixed = root / f"{date}{self.sep}{cam}"
        if suffixed.is_dir():
            return suffixed
        if self.bare_cam1 and cam == "1":
            bare = root / date
            if bare.is_dir():
                return bare
        return None

    def hour_dir(self, date: str, cam: str | int, hour: str | int,
                 root: Optional[Path] = None) -> Optional[Path]:
        d = self.day_dir(date, cam, root)
        if not d:
            return None
        h = d / f"{int(hour):02d}"
        return h if h.is_dir() else None

    def minute_file(self, date: str, cam: str | int, hour: str | int,
                    minute: str | int, root: Optional[Path] = None) -> Optional[Path]:
        h = self.hour_dir(date, cam, hour, root)
        if not h:
            return None
        f = h / f"{int(minute):02d}.mp4"
        return f if f.is_file() else None


# ---------------------------------------------------------------------------

def registry() -> Dict[str, Source]:
    out: Dict[str, Source] = {}
    for sid, spec in config.sources().items():
        if sid.startswith("_"):
            continue
        out[sid] = Source(
            id=sid,
            label=spec.get("label", sid),
            sep=spec["sep"],
            bare_cam1=bool(spec.get("bare_cam1", False)),
        )
    return out


def get(source_id: str) -> Source:
    return registry()[source_id]


def for_camera(cam: str | int) -> List[Source]:
    reg = registry()
    return [reg[s] for s in config.source_order(cam) if s in reg]


def any_hour_dir(date: str, cam: str | int, hour: str | int,
                 root: Optional[Path] = None) -> Dict[str, Path]:
    """Return {source_id: hour_dir} for every source that has this hour on disk."""
    found: Dict[str, Path] = {}
    for src in for_camera(cam):
        h = src.hour_dir(date, cam, hour, root)
        if h:
            found[src.id] = h
    return found


def list_screens(hour_dir: Path) -> Dict[str, List[str]]:
    """Return {minute: [filenames]} for screenshot JPEGs in an hour directory.

    Matches the naming produced by za-miru.sh: screenMM-NNN.jpg
    """
    out: Dict[str, List[str]] = {}
    if not hour_dir.is_dir():
        return out
    for p in sorted(hour_dir.iterdir()):
        m = _SCREEN_RE.match(p.name)
        if not m:
            continue
        out.setdefault(m.group("min"), []).append(p.name)
    return out


def list_minutes(hour_dir: Path) -> List[str]:
    """Return sorted list of MM strings that have an MM.mp4 in hour_dir."""
    if not hour_dir.is_dir():
        return []
    mins: List[str] = []
    for p in hour_dir.iterdir():
        if p.suffix == ".mp4" and len(p.stem) == 2 and p.stem.isdigit():
            if p.stat().st_size > 0:
                mins.append(p.stem)
    return sorted(mins)


def discover_dates(root: Optional[Path] = None) -> Iterable[str]:
    """Yield distinct YYYYMMDD strings present under webroot, any source."""
    root = root or config.webroot()
    seen = set()
    pat = re.compile(r"^(20\d{6})(?:[_-]\d+)?$")
    for p in root.iterdir():
        if not p.is_dir():
            continue
        m = pat.match(p.name)
        if m and m.group(1) not in seen:
            seen.add(m.group(1))
            yield m.group(1)
