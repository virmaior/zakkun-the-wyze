"""Bridge between JSON range objects and the legacy `i=` wire format.

The new viewer speaks JSON. za-harau.sh / za-horu.sh still expect the
delimiter string documented in README.md (V > , ; :). This module is the only
place that knows that encoding, so when za-horu is eventually retrofitted to
read JSON the format dies here and nowhere else.

Range JSON shape (superset of what za-horu.sh consumes):
    {
      "date": "20260101", "hour": "03", "cam": "5",
      "start": 12, "end": 14, "label": "emk_pouch",
      "source": "rtsp",        # stored in SQLite; NOT encoded for za-horu
      "ps": "07", "pe": "41"   # optional partial-second trim
    }

Note on `source`: za-horu.sh:switch_camera_dir already prefers the `_` (rtsp)
directory when both exist, falling back to `-` (sd). Encoding a per-range
source choice would require touching za-horu.sh, which is out of scope for the
additive pass; the field is recorded so a later retrofit can honour it.
"""
from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

from . import config


_LABEL_BAD = re.compile(r"[;,>:V]")


def _clean_label(label: str | None) -> str:
    if not label:
        return "blank"
    out = label.replace(" ", "_")
    return _LABEL_BAD.sub("-", out)


def _seg(r: Dict[str, Any]) -> str:
    parts = [
        f"d:{r['date']}",
        f"h:{int(r['hour']):02d}",
        f"c:{r['cam']}",
        f"s:{int(r['start']):02d}",
        f"e:{int(r['end']):02d}",
        f"l:{_clean_label(r.get('label'))}",
    ]
    if r.get("ps"):
        parts.append(f"ps:{r['ps']}")
    if r.get("pe"):
        parts.append(f"pe:{r['pe']}")
    return ";".join(parts)


def encode(ranges: Iterable[Dict[str, Any]]) -> str:
    """Produce the exact string za-horu.sh parses from `i=`.

    Groups by (hour, cam) → header `h:HH;c:C>` then comma-joined segments,
    blocks joined by `V` (no trailing newline; za-horu.sh splits on V).
    """
    groups: Dict[Tuple[str, str], List[Dict[str, Any]]] = {}
    for r in ranges:
        key = (f"{int(r['hour']):02d}", str(r["cam"]))
        groups.setdefault(key, []).append(r)

    blocks: List[str] = []
    for (hh, cam), segs in groups.items():
        header = f"h:{hh};c:{cam}"
        body = ",".join(_seg(r) for r in segs)
        blocks.append(f"{header}>{body}")
    return "V".join(blocks) + ("V" if blocks else "")


def write_tmp(ranges: List[Dict[str, Any]]) -> Path:
    """Write ranges into tmp/<date>-<hour>-<epoch>.tmp exactly as za-horu.cgi
    does, so za-harau.sh picks it up unchanged."""
    if not ranges:
        raise ValueError("no ranges to write")
    date = ranges[0]["date"]
    hour = f"{int(ranges[0]['hour']):02d}"
    payload = encode(ranges)
    tdir = config.tmp_dir()
    tdir.mkdir(parents=True, exist_ok=True)
    out = tdir / f"{date}-{hour}-{int(time.time())}.tmp"
    out.write_text(payload)
    out.chmod(0o644)
    return out
