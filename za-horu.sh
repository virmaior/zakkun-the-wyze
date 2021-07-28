#!/bin/zsh
typeset -i COUNTER=0
clips=$(pwd)"/clips"


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	f)		format=${VALUE} ;;
	d)    		day=${VALUE} ;;     
	i)		inp=${VALUE} ;;
        debug)          debug=${VALUE} ;;
	*)   		echo "unknown: " $KEY  " " $VALUE ;;
    esac    

done

if [ -z  "$inp" ]
then
	echo  "you must use i= to set an input"
	exit
fi

if [ -z "$format" ] 
then
	format="mkv"
fi
if [ -n "$day" ]
then
	echo "running in directory $day "
	cd $day
fi
cwd=$(pwd)


function switch_camera_dir
{
	cam=$1
	if  [ "$1" = "1" ]
	then
		cd $cwd
	else
		cd $cwd
		cd ..
		cd $day-$cam
	fi
}


function make_event 
{
  pth=$(pwd)
  IFS=";"
  desc=""
  typeset -i tpiece=0

for ARGUMENT in $(echo "$2" )
do

    KEY=$(echo $ARGUMENT | cut -f1 -d:)
    VALUE=$(echo $ARGUMENT | cut -f2 -d:)   

    case "$KEY" in
        s)            typeset -Z 2 -i stime=${VALUE} ;;
        e)            typeset -Z 2 -i etime=${VALUE} ;; 
        l)              desc=${VALUE} ;;
        *)   
    esac    

done
  echo "outcome : $1 $stime $etime "
	
  let	COUNTER++
  product="$clips/$day-$hour-$stime-$cam-event$COUNTER$desc.$format"
  echo -n "output file:"$product
  typeset -Z 2 -i minp=00
  for ((i = $stime; i <= $etime; i++)) 
  do
	minp=$i
	echo -n " " $pth/$hour/$minp".mp4"
  done


if [ -z  "$debug" ]
then

ffmpeg -y \
  -f concat \
  -safe 0 \
  -i <(  for ((i = $stime; i <= $etime; i++)) ; do  minp=$i; echo "file "$pth/$hour/$minp".mp4"; done) \
  -c copy "$product"


fi

}

function make_events
{
  echo "hour " $1
  IFS=","
  for seg in $(echo "$2" )
  do
   echo "segment: " $seg
   make_event $hour $seg
  done
}





IFS="V"
echo $inp
for i in $(echo "$inp" )
do
	IFS=">"
        typeset -i piece=0
        typeset -Z 2 -i hour=00

	for part in $(echo "$i" | sed -E -e 's/:[0-9]+$//' | sed -e 's/^[ \t]*//'   ) 
	do
		if [ -z "$part" ]; then
			continue	
		fi
		let piece++
		echo $piece
		if [ $(( piece % 2 )) -eq 1 ]; then
			IFS=";"
			for ARGUMENT in $(echo "$part"  )
			do
    				KEY=$(echo $ARGUMENT | cut -f1 -d:)
    				VALUE=$(echo $ARGUMENT | cut -f2 -d:)
    				case "$KEY" in
        				h)            hour=${VALUE} ;;
        				c)            cam=${VALUE} ;; 
        				*)   
    				esac 
			done
			echo "set hour to " $hour " and cam to " $cam 
		else
				switch_camera_dir $cam
				make_events $hour $part
		fi
		
	done
	
done
