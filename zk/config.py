"""Configuration loader.

Search order for zk.config.json:
  1. $ZK_CONFIG (explicit path)
  2. $ZK_ROOT/zk.config.json
  3. <dir containing this package>/../zk.config.json
  4. /var/www/html/zk.config.json
If none found, DEFAULTS are used so the layer still functions read-only
against an existing tree.
"""
from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

# Mirrors zk.config.json.example so the package degrades gracefully when the
# real config has not been copied yet.
DEFAULTS: Dict[str, Any] = {
    "webroot": "/var/www/html",
    "tmp_dir": "/var/www/html/tmp",
    "clips_dir": "/var/www/html/clips",
    "digests_dir": "/var/www/html/digests",
    "sqlite_path": "/var/www/html/zk.sqlite3",
    "ffmpeg": "/usr/bin/ffmpeg",
    "sources": {
        "sd":   {"label": "SD card pull",  "sep": "-", "bare_cam1": True,  "acquirer": "scp"},
        "rtsp": {"label": "RTSP capture",  "sep": "_", "bare_cam1": False, "acquirer": "rtsp"},
    },
    "default_source_order": ["rtsp", "sd"],
    "network": {"subnet": "192.168.9", "ip_pattern": "{subnet}.10{cam}"},
    "rtsp": {"username": "thingino", "password": "thingino", "endpoint": "ch0",
             "transport": "tcp", "fps": 25},
    "cameras": {},
    "capture": {"caps_per_minute": 4, "screen_prefix": "screen", "screen_ext": "jpg"},
    "heatmap_dir": "/var/www/html/heatmap",
    "daemon": {
        "tick_seconds": 20,
        "rtsp_restart_hour": 18,
        "sd_pull_delay_minutes": 2,
        "sd_pull_miru": True,
        "post_hour_score": True,
        "nice": 10,
        "toru_script": "/var/www/html/za-toru.sh",
        "toru_scp_octet": "9",
    },
}


def _candidate_paths() -> List[Path]:
    out: List[Path] = []
    if os.environ.get("ZK_CONFIG"):
        out.append(Path(os.environ["ZK_CONFIG"]))
    root = os.environ.get("ZK_ROOT")
    if root:
        out.append(Path(root) / "zk.config.json")
    here = Path(__file__).resolve().parent.parent
    out.append(here / "zk.config.json")
    out.append(Path("/var/www/html/zk.config.json"))
    return out


def _deep_merge(base: Dict[str, Any], over: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(base.get(k), dict):
            out[k] = _deep_merge(base[k], v)
        else:
            out[k] = v
    return out


@lru_cache(maxsize=1)
def load() -> Dict[str, Any]:
    cfg = dict(DEFAULTS)
    for p in _candidate_paths():
        if p.is_file():
            try:
                with p.open() as fh:
                    user = json.load(fh)
                cfg = _deep_merge(cfg, user)
                cfg["_config_path"] = str(p)
            except Exception as e:  # surface but don't crash callers
                cfg["_config_error"] = f"{p}: {e}"
            break
    cfg.setdefault("_config_path", None)
    return cfg


# ---- convenience accessors -------------------------------------------------

def webroot() -> Path:
    return Path(load()["webroot"])


def tmp_dir() -> Path:
    return Path(load()["tmp_dir"])


def sqlite_path() -> Path:
    return Path(load()["sqlite_path"])


def sources() -> Dict[str, Dict[str, Any]]:
    return load()["sources"]


def source_order(cam: str | int | None = None) -> List[str]:
    cfg = load()
    if cam is not None:
        c = cfg["cameras"].get(str(cam))
        if c and c.get("sources"):
            return list(c["sources"])
    return list(cfg["default_source_order"])

def cam_orders() -> Dict[str, int]:
    orders = {}
    for cam_id, cam_data in cameras().items():
        if isinstance(cam_data, dict):
            order = cam_data.get("order")
            if order is not None:
                orders[cam_id] = order 
    return orders


def cameras() -> Dict[str, Dict[str, Any]]:
    return load()["cameras"]


def camera_ids() -> List[str]:
    cams = cameras()
    if cams:
        return sorted(cams.keys(), key=lambda s: int(s))
    return []


def camera(cam: str | int) -> Dict[str, Any]:
    return cameras().get(str(cam), {})


def camera_ip(cam: str | int) -> str:
    net = load()["network"]
    return net["ip_pattern"].format(subnet=net["subnet"], cam=cam)


def rtsp_for(cam: str | int) -> Dict[str, Any]:
    """Global rtsp block overlaid with cameras.<id>.rtsp if present."""
    base = dict(load()["rtsp"])
    over = camera(cam).get("rtsp") or {}
    base.update({k: v for k, v in over.items() if not k.startswith("_")})
    return base


def daemon() -> Dict[str, Any]:
    return load()["daemon"]


def heatmap_dir() -> Path:
    return Path(load()["heatmap_dir"])


def parse_hours(spec) -> set[int]:
    """'*' | 'HH-HH' (may wrap midnight) | [int,...] → set of hours 0-23."""
    if spec in (None, "", "*"):
        return set(range(24))
    if isinstance(spec, (list, tuple)):
        return {int(h) % 24 for h in spec}
    s = str(spec)
    if "-" in s:
        a, b = s.split("-", 1)
        a, b = int(a) % 24, int(b) % 24
        if a <= b:
            return set(range(a, b + 1))
        return set(range(a, 24)) | set(range(0, b + 1))
    return {int(s) % 24}


def schedule_for(cam: str | int, source_id: str) -> set[int]:
    sch = camera(cam).get("schedule", {})
    return parse_hours(sch.get(source_id, "*"))


def public_config() -> Dict[str, Any]:
    """Config subset safe to ship to the browser (no credentials)."""
    cfg = load()
    return {
        "sources": {k: {"label": v.get("label", k), "sep": v["sep"]}
                    for k, v in cfg["sources"].items()},
        "default_source_order": cfg["default_source_order"],
        "cameras": {k: {"label": v.get("label", k),
                        "sources": v.get("sources", cfg["default_source_order"])}
                    for k, v in cfg["cameras"].items()},
        "capture": cfg["capture"],
    }
