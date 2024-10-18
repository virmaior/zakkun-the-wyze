#!/bin/zsh
. /usr/lib/cgi-bin/za-web-common.sh

web_start

#echo $param

x=$(date +%s)

pi=${param["i"]}
d=${param["d"]}
h=${param["h"]}


echo $param

echo "pi $pi"
echo "d $d"
echo "h $h"


xaram=${pi//$'\n'/}
xaram=${xaram//$' '/}
xaram=${xaram//&gt;/>}



echo "$xaram" > "/var/www/html/tmp/$d-$h-$x.tmp"   

echo "saved to $d-$h-$x.tmp"

exit

cd /var/www/html
. /var/www/html/za-horu.sh mode=web


