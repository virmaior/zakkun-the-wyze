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

if [ -z "$format" ] 
then
	format="mkv"
fi
if [ -n "$day" ]
then
	echo "running in directory $day "

fi
cwd=$(pwd)

   ffmap=""
   for i in $clips/digest-$day*.m*
   do
   ffmap="$ffmap-i $i "
   done
#
#   for i in "$pieces"; do echo "file $i"; done;
#�  echo $( for i in $pieces; do echo "-i $i"; done)
 #exit;
echo $ffmap

product="day-digest-$day.mkv"


elevel="error"
elevel="debug"
ffmpeg -hide_banner -loglevel $elevel  -y \
  -safe 0 \
  -f concat \
  -i <(for i in $clips/digest-$day*.m*; do echo "file '$i'"; echo "duration 60";  done;) \
  -an \
  -c copy -r 15  "$product"


rclone copy $product  zgd:"/ザッ君/digests"
#mkdir clips/digest-$day
#mv clips/digest-$day*.mkv clips/digest-$day
