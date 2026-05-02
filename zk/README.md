# zk — additive layer

Runs beside the existing `za-*.sh` scripts. Reads the same `YYYYMMDD/`,
`YYYYMMDD-N/` (SD pull) and `YYYYMMDD_N/` (RTSP) trees; writes the same
`tmp/*.tmp` job files that `za-harau.sh` already consumes.

## Install

```sh
cd /var/www/html
cp zk.config.json.example zk.config.json     # edit cameras / subnet / creds
sudo python3 -m pip install Pillow           # optional: server-side motion scores
python3 -m zk init
```

### CGI

On Debian/Raspbian the executable cgi-bin is `/usr/lib/cgi-bin`:

```sh
sudo ln -s /var/www/html/cgi-bin/zk.cgi /usr/lib/cgi-bin/zk.cgi
```

### Permissions (fixes "attempt to write a readonly database")

The CGI runs as the web user (`www-data` on Debian). Only the **Send** action
writes; viewing a manifest is read-only as of this version. For Send to work
the web user needs write access to the SQLite file **and its directory**, and
to `tmp/`:

```sh
sudo chown www-data:www-data /var/www/html/zk.sqlite3 /var/www/html
sudo chown -R www-data:www-data /var/www/html/tmp
# or point sqlite_path / tmp_dir in zk.config.json at a www-data-writable dir
```

If you saw the readonly error simply *opening* the viewer: that was the
manifest GET trying to update the minute inventory as a side effect. That
write has been removed from the GET path; pull the latest `zk/manifest.py`
and `cgi-bin/zk.cgi`.

## Viewer

```
http://<host>/zk-viewer.html?d=YYYYMMDD&cam=N&h=HH
```

The page renders both sources for the hour (badges per minute, radio toggle to
flip the displayed copy). If `zk-score-HH.json` exists it is used directly and
the browser skips its own pixel diff.

## Daemon

Replaces these crons:

* per-cam `za-mono-adv.sh` start/stop at 18:00 / 05:00 (cam 1 24h)
* hourly `za-toru.sh ... cron=1` per cam

Run in foreground:

```sh
cd /var/www/html && python3 -m zk daemon
```

or as a systemd unit:

```ini
# /etc/systemd/system/zk-daemon.service
[Unit]
Description=zk camera supervisor
After=network-online.target

[Service]
WorkingDirectory=/var/www/html
ExecStart=/usr/bin/python3 -m zk daemon
Restart=always
User=root

[Install]
WantedBy=multi-user.target
```

What it does each tick (`daemon.tick_seconds`):

1. For every camera, start/stop an `ffmpeg -f segment` RTSP recorder so it is
   running exactly during `cameras.<id>.schedule.rtsp`. Output goes to
   `YYYYMMDD_<cam>/HH/MM.mp4` (same as `za-mono-adv.sh`). The legacy
   `tmp/record-<cam>` flag is maintained, so `za-manage.sh stop` still works
   and the daemon will not start a second recorder if one already holds the
   flag.
2. At `daemon.rtsp_restart_hour:00`, cycle every recorder once.
3. `daemon.sd_pull_delay_minutes` after each hour rolls over, queue one
   `za-toru.sh scp=<octet> cam=N d=YYYYMMDD s=HH e=HH [m=y]` per camera whose
   `schedule.sd` includes that hour. The queue is **strictly sequential** so
   the 18:00–05:00 window never has N scp transfers competing with N
   recorders. After each pull it writes `zk-HH.json` and (if Pillow is
   installed) `zk-score-HH.json` under `nice(daemon.nice)`.
4. Hours that are RTSP-only (in `schedule.rtsp` but not `schedule.sd`) get a
   `post` job for manifest+score without a pull.

Per-hour job state is persisted in SQLite (`hour_job` table) so a daemon
restart does not re-pull completed hours.

### Per-camera RTSP credentials

`cameras.<id>.rtsp` overrides any field of the global `rtsp` block:

```json
"7": { "rtsp": { "username": "alt", "password": "…", "endpoint": "ch1" } }
```

## CLI

```
python3 -m zk init
python3 -m zk manifest d=20260413 cam=3 s=18 e=23
python3 -m zk score    d=20260413 cam=3 s=18 e=23
python3 -m zk status   d=20260413
python3 -m zk daemon   [dry=1] [once=1]
```
