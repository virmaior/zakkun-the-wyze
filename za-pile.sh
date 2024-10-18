#!/bin/zsh
. /var/www/html/za-common.sh


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
        d)              day=${VALUE} ;;
        *)   
    esac    

done



if [ -z "$day" ]; then
 day=$(datediff -v-1H %Y%m%d ) 
fi


makepng $day-2/02/55.mp4 pile/$day.png 20.00

