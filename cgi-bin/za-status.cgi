#!/bin/zsh
. /usr/lib/cgi-bin/za-web-common.sh


web_start

cd /var/www/html
. /var/www/html/za-status.sh mode=web
