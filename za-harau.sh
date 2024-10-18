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
  cd "$cwd"
  mv -- "$file" "${file%.tmp}.done"
done

