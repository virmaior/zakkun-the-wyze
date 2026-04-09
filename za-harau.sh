#!/bin/zsh
. /var/www/html/za-common.sh
typeset -i COUNTER=0
clips=$(pwd)"/clips"


cwd=$(pwd)

for file in tmp/*.tmp; do
  echo "$file"
  echo "zsh za-horu.sh -i(< $file)"
  i=$(< "$file")

. /var/www/html/za-horu.sh i="$i"
za_horu_exit=$?
# Only rename if everything before succeeded
if [ $za_horu_exit -eq 0 ]; then
    cd "$cwd"
    mv -- "$file" "${file%.tmp}.done" || {
        echo "Warning: mv failed for $file" >&2
        # You can decide: exit 1  or just continue
    }
else
    echo "za-horu.sh exited with status $za_horu_exit → not renaming $file" >&2
    # Optional: exit with the same status
    # exit $za_horu_exit
fi

  cd "$cwd"
done

