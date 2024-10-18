#!/bin/zsh
. /var/www/html/za-common.sh
typeset -Z 2 min=0
typeset -Z 2 h=0


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
        d)              day=${VALUE} ;;
	h)		h=${VALUE};;
	cam)		cam=${VALUE};; 
	min)		min=${VALUE};;
	sec)		sec=${VALUE};;
       *)   
    esac    

done



if [ -z "$day" ]; then
 day=$(datediff -v-1H %Y%m%d ) 
fi


if [ "$cam" = "1" ]; then
 dcm=$day
else
 dcm=$day-$cam
fi

makepng $dcm/$h/$min.mp4 captures/$dcm-$h-$min.png $sec

