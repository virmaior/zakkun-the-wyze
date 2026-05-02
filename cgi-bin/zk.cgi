#!/usr/bin/env python3
"""JSON API for the zk viewer.

Lives alongside the existing zsh CGIs in /usr/lib/cgi-bin. Speaks only JSON.

GET  ?a=config                        → public camera/source config
GET  ?a=manifest&d=YYYYMMDD&cam=N&h=HH[&force=1]
GET  ?a=status&d=YYYYMMDD&cam=N       → per-hour minute counts per source
POST ?a=submit   (body: {"ranges":[...]})
        → writes tmp/*.tmp in the legacy format for za-harau.sh
          AND records the ranges in SQLite.

The package is imported from $ZK_ROOT (default /var/www/html) so the cgi-bin
directory stays a thin shim.
"""
import json
import os
import re
import sys

ZK_ROOT = os.environ.get("ZK_ROOT", "/var/www/html")
# Try ZK_ROOT first (production: package lives next to za-*.sh under webroot),
# then the repo checkout this cgi sits inside (development).
_here = os.path.dirname(os.path.abspath(__file__))
for _p in (ZK_ROOT, os.path.dirname(_here)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from zk import config, legacy, manifest, store  # noqa: E402

DATE_RE = re.compile(r"^20\d{6}$")
INT_RE = re.compile(r"^\d{1,2}$")


def emit(status: str, obj):
    sys.stdout.write(f"Status: {status}\r\n")
    sys.stdout.write("Content-Type: application/json\r\n\r\n")
    sys.stdout.write(json.dumps(obj))
    sys.stdout.flush()


def bad(msg: str):
    emit("400 Bad Request", {"ok": False, "error": msg})
    sys.exit(0)


def parse_qs(qs: str):
    out = {}
    for pair in qs.split("&"):
        if not pair:
            continue
        k, _, v = pair.partition("=")
        out[k] = v
    return out


def require_date(q):
    d = q.get("d", "")
    if not DATE_RE.match(d):
        bad("d must be YYYYMMDD")
    return d


def require_int(q, key, lo, hi):
    v = q.get(key, "")
    if not INT_RE.match(v) or not (lo <= int(v) <= hi):
        bad(f"{key} must be {lo}..{hi}")
    return int(v)


def main():
    method = os.environ.get("REQUEST_METHOD", "GET")
    q = parse_qs(os.environ.get("QUERY_STRING", ""))
    action = q.get("a", "")

    if action == "config":
        emit("200 OK", {"ok": True, "config": config.public_config()})
        return

    if action == "manifest":
        d = require_date(q)
        cam = str(require_int(q, "cam", 1, 99))
        h = require_int(q, "h", 0, 23)
        # GET is read-only: never touch SQLite from the web user.
        emit("200 OK", {"ok": True, "manifest": manifest.build(d, cam, h, record=False)})
        return

    if action == "status":
        d = require_date(q)
        cam = str(require_int(q, "cam", 1, 99))
        emit("200 OK", {"ok": True, "coverage": store.hour_coverage(d, cam)})
        return

    if action == "submit" and method == "POST":
        try:
            n = int(os.environ.get("CONTENT_LENGTH", "0"))
            body = sys.stdin.read(n) if n > 0 else sys.stdin.read()
            payload = json.loads(body or "{}")
            ranges = payload.get("ranges") or []
        except Exception as e:
            bad(f"invalid JSON body: {e}")
            return
        if not isinstance(ranges, list) or not ranges:
            bad("ranges must be a non-empty list")
        for r in ranges:
            if not DATE_RE.match(str(r.get("date", ""))):
                bad("range.date must be YYYYMMDD")
            for k in ("hour", "cam", "start", "end"):
                if k not in r:
                    bad(f"range.{k} is required")
        tmp_path = legacy.write_tmp(ranges)
        ids = store.record_clip_requests(ranges, str(tmp_path))
        emit("200 OK", {
            "ok": True,
            "tmp_file": str(tmp_path),
            "legacy_string": legacy.encode(ranges),
            "clip_request_ids": ids,
        })
        return

    bad(f"unknown action '{action}' for {method}")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        emit("500 Internal Server Error", {"ok": False, "error": str(e)})
