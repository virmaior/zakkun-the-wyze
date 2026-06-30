"""Command-line entry: `python3 -m zk <verb> key=value ...`

Kept in the same `key=value` style as the existing za-*.sh scripts so it slots
into crontab lines without surprise.

Verbs:
    init                              create the SQLite schema
    manifest d=YYYYMMDD cam=N [s=HH e=HH]
    score    d=YYYYMMDD cam=N [s=HH e=HH]   precompute motion scores (needs Pillow)
    scan     d=YYYYMMDD [cam=N]       walk filesystem → minute table
    status   d=YYYYMMDD cam=N         print per-hour coverage per source
    config                            dump resolved config (sans creds)
    daemon   [dry=1] [once=1]         supervisor: rtsp recorders + hourly pull/score

Special meaning:
    d=yesterday will automatically translate to the previous date

"""
from __future__ import annotations

import json
import sys
from datetime import date, datetime, timedelta
from typing import Dict

from . import config, manifest, sources, store


def _kv(argv) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for a in argv:
        if "=" in a:
            k, v = a.split("=", 1)
            out[k] = v
    return out


def _cams(args: Dict[str, str]):
    if "cam" in args:
        return [args["cam"]]
    return config.camera_ids() or ["1"]


def cmd_init(_args):
    store.init()
    print(f"initialised {config.sqlite_path()}")


def cmd_config(_args):
    print(json.dumps(config.public_config(), indent=2))


def cmd_manifest(args):
    d = args["d"]
    s = int(args.get("s", 0))
    e = int(args.get("e", 23))
    for cam in _cams(args):
        for p in manifest.write_day(d, cam, s, e):
            print(p)


def cmd_scan(args):
    d = args["d"]
    n = 0
    for cam in _cams(args):
        for h in range(24):
            m = manifest.build(d, cam, h, record=True)
            n += len(m["minutes"])
    print(f"scanned {n} minute rows for {d}")


def cmd_status(args):
    d = args["d"]
    for cam in _cams(args):
        cov = store.hour_coverage(d, cam)
        print(f"{d} cam {cam}")
        for src in sources.for_camera(cam):
            row = cov.get(src.id, [0] * 24)
            cells = "".join("Y" if c == 60 else ("P" if c > 0 else "N") for c in row)
            print(f"  {src.id:<6} {cells}")


def cmd_score(args):
    from . import score
    if not score.available():
        print("Pillow not installed; install with: pip install Pillow", file=sys.stderr)
        return
    start = datetime.now();
    d = args["d"]
    s = int(args.get("s", 0))
    e = int(args.get("e", 23))
    print(f"for date {d} starting {s} ending {e}")


    # because we look through footage in hours we want to check it by the hour -- not the camera when multiple cameras are involved
    for h in range(s, e + 1):
        for cam in _cams(args):
            sstart = datetime.now();
            p = score.write(d, cam, h, source_id=args.get("source"))
            if p:
                end = datetime.now()
                elapsed = end - sstart
                print(f"{p} ({elapsed})")

    end = datetime.now()
    elapsed = end - start            
    print(f"total elapsed time {elapsed}")

def cmd_daemon(args):
    from . import daemon
    daemon.run(dry_run=args.get("dry") == "1", once=args.get("once") == "1")


VERBS = {
    "init": cmd_init,
    "config": cmd_config,
    "manifest": cmd_manifest,
    "scan": cmd_scan,
    "status": cmd_status,
    "score": cmd_score,
    "daemon": cmd_daemon,
}


def main(argv=None):
    argv = list(argv if argv is not None else sys.argv[1:])
    if not argv or argv[0] not in VERBS:
        print(__doc__)
        return 1
    verb = argv.pop(0)
    try:
        kvs =_kv(argv);
        if ('d' in kvs):
            if kvs.get('d') == 'yesterday':
                yesterday = date.today() - timedelta(days=1)
                kvs['d'] = yesterday.strftime('%Y%m%d');
        VERBS[verb](kvs)
        return 0
    except KeyError as e:
        print(f"missing required arg {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
