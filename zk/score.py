"""Server-side motion scoring.

Reproduces the browser's frame-diff (zk-viewer.js / za-miru.js imgComparer) so
the heavy 18:00–05:00 hours don't push 240 JPEG decodes onto the client. The
algorithm is intentionally identical: downscale to 192×108, quantise each
channel to 8 levels, sum |Δ| per pixel weighted by an optional per-camera
heatmap, bucket into a 3×3 region grid.

Output: <day_dir>/zk-score-HH.json — picked up automatically by manifest.build
and shipped to the viewer, which then skips its own canvas pass.

Dependency: Pillow. If unavailable the function logs once and returns None so
callers (daemon, CLI) keep going and the viewer falls back to client-side.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import config, sources

W, H = 192, 108
STEP = 255 / 8 
SENSITIVITY = 10 * 100  # raw-diff 10 × default heat weight 100

try:
    from PIL import Image  # type: ignore
    _PIL_OK = True
except Exception:
    _PIL_OK = False


def available() -> bool:
    return _PIL_OK


# ---- pixel helpers ---------------------------------------------------------

def _ninth_map() -> List[str]:
    pw, ph = W / 3, H / 3
    out: List[str] = [""] * (W * H)
    for y in range(H):
        v = "b" if y > 2 * ph else ("m" if y > ph else "t")
        for x in range(W):
            h = "r" if x > 2 * pw else ("c" if x > pw else "l")
            out[y * W + x] = v + h
    return out


_NINTH = _ninth_map()


def _load_heat(cam: str) -> Optional[List[int]]:
    p = config.heatmap_dir() / f"{cam}.json"
    if not p.is_file():
        return None
    try:
        j = json.loads(p.read_text())
        data = j.get("data")
        if isinstance(data, list) and len(data) == W * H:
            return data
    except Exception:
        pass
    return None


def _quantised_bytes(path: Path) -> bytes:
    img = Image.open(path).convert("RGB").resize((W, H))
    raw = bytearray(img.tobytes())  # RGBRGB...
    for i in range(len(raw)):
        raw[i] = int(raw[i] // STEP * STEP)
    return bytes(raw)


def _compare(a: bytes, b: bytes, heat: Optional[List[int]]) -> Dict[str, Any]:
    dsize = 0
    reg = {"tl": 0, "tc": 0, "tr": 0, "ml": 0, "mc": 0, "mr": 0,
           "bl": 0, "bc": 0, "br": 0}
    for p in range(W * H):
        i = p * 3
        raw = abs(a[i] - b[i]) + abs(a[i + 1] - b[i + 1]) + abs(a[i + 2] - b[i + 2])
        ds = raw * (heat[p] if heat else 100)
        if ds > SENSITIVITY:
            dsize += ds
            reg[_NINTH[p]] += ds
    best = max(reg, key=lambda k: reg[k])
    return {"dsize": dsize, "region": best}

def _is_mostly_one_color_bytes(rgb_bytes: bytes, W: int, H: int, threshold: float = 0.83) -> bool:
    if len(rgb_bytes) != W * H * 3:
        return True
    
    # Take the first pixel as reference
    r, g, b = rgb_bytes[0], rgb_bytes[1], rgb_bytes[2]
    
    count = 0
    for i in range(0, len(rgb_bytes), 3):
        if rgb_bytes[i] == r and rgb_bytes[i+1] == g and rgb_bytes[i+2] == b:
            count += 1
    
    return (count / (W * H)) >= threshold

# ---- public API ------------------------------------------------------------

def score_hour(date: str, cam: str | int, hour: str | int,
               source_id: Optional[str] = None,
               root: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Score one (date,cam,hour). Uses the first source that has screenshots
    unless `source_id` is given. Returns the score dict or None if no
    screenshots / Pillow missing."""
    if not _PIL_OK:
        print("zk.score: Pillow not installed; skipping server-side scoring "
              "(pip install Pillow)")
        return None

    cam = str(cam)
    hour_s = f"{int(hour):02d}"
    root = root or config.webroot()
    heat = _load_heat(cam)

    src_list = ([sources.get(source_id)] if source_id
                else sources.for_camera(cam))
    chosen = None
    screens: Dict[str, List[str]] = {}
    hdir: Optional[Path] = None
    for src in src_list:
        hd = src.hour_dir(date, cam, hour, root)
        if not hd:
            continue
        sc = sources.list_screens(hd)
        if sc:
            chosen, hdir, screens = src, hd, sc
            break
    if not chosen or not hdir:
        return None

    shots: List[Dict[str, Any]] = []
    prev: Optional[bytes] = None
    for mm in sorted(screens):
        for idx, fn in enumerate(screens[mm], start=1):
            cur = _quantised_bytes(hdir / fn)
            if _is_mostly_one_color_bytes(cur, W, H):
                continue
            if prev is not None:
                d = _compare(prev, cur, heat)
                d["mm"] = mm
                d["idx"] = idx
                shots.append(d)
            prev = cur

    # it also creates per-minute maxes, which are not used
    per_min: Dict[str, int] = {}
    for s in shots:
        per_min[s["mm"]] = max(per_min.get(s["mm"], 0), s["dsize"])
    sorted_d = sorted((s["dsize"] for s in shots), reverse=True)
    maxd = sorted_d[1] if len(sorted_d) > 1 else (sorted_d[0] if sorted_d else 1)

    return {
        "date": date, "cam": cam, "hour": hour_s, "source": chosen.id,
        "W": W, "H": H, "maxd": maxd,
        "per_minute": per_min,
        "shots": shots,
        "top": sorted(shots, key=lambda s: -s["dsize"])[:10],
    }


def write(date: str, cam: str | int, hour: str | int,
          source_id: Optional[str] = None,
          root: Optional[Path] = None) -> Optional[Path]:
    root = root or config.webroot()
    res = score_hour(date, cam, hour, source_id, root)
    if res is None:
        return None
    # write alongside the manifest, into the first existing source dir
    for src in sources.for_camera(cam):
        d = src.day_dir(date, cam, root)
        if d:
            out = d / f"zk-score-{res['hour']}.json"
            out.write_text(json.dumps(res, separators=(",", ":")))
            return out
    return None
