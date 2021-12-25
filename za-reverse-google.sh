#!/bin/zsh
typeset -i COUNTER=0
clips=$(pwd)"/clips"


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	d)    		day=${VALUE} ;;     
	f)		format=${VALUE} ;;
        debug)          debug=${VALUE} ;;
	*)   		echo "unknown: " $KEY  " " $VALUE ;;
    esac    

done

if [ -z  "$day" ]
then
	echo  "you must set a date"
	exit
fi


if [ -n "$day" ]
then
	echo "running in directory $day "

fi
cwd=$(pwd)


mkdir clips/$day
rclone copy  zgd:"/ザッ君/$day" "clips/$day"
