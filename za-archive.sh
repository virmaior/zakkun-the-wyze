#!/usr/bin/env bash

set -euo pipefail

# ────────────────────────────────────────────────
#  Change only this line when you want a new date
DATE="20260212"
HOUR="00"
# ────────────────────────────────────────────────

TARGET_PARENT="emexit"

# Optional: dry-run mode (comment out mv and uncomment echo to test)
DRY_RUN=""          # normal mode: actually move
# DRY_RUN="echo Would move:"   # dry-run mode: just show what would happen

for dir in "${DATE}"_* "${DATE}"-*; do
    # Skip if not a directory
    [ -d "$dir" ] || continue

    src="$dir/$HOUR"

    # Skip if no 00 subfolder
    [ -d "$src" ] || {
        echo "→ Skipping $dir (no $HOUR folder found)"
        continue
    }

    target_dir="${TARGET_PARENT}/${dir}/$HOUR"

    echo "Planning to move contents of:"
    echo "  $src/"
    echo "→ $target_dir/"

    mkdir -p "$target_dir" || {
        echo "Error: cannot create $target_dir"
        exit 1
    }

    # The actual move command
    $DRY_RUN rsync -a "$src/." "$target_dir/"


    # Optional: remove empty 00 folder after moving contents
    rmdir "$src" 2>/dev/null || true
done

echo "Finished processing for date $DATE"
