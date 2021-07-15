#!/bin/zsh
typeset -i COUNTER=0


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	f)		format=${VALUE} ;;
	d)    		day=${VALUE} ;;     
	i)		inp=${VALUE} ;;
	*)   		echo $KEY  " " $VALUE ;;
    esac    

done

if [ -z  "$inp" ]
then
	echo  "you must use i= to set an input"
	exit
fi

if [ -z "$format" ] 
then
	format="mov"
fi
if [ -n "$day" ]
then
	echo "running in directory $day "
	cd $day
fi
cwd=$(pwd)



function make_event 
{
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
  echo "$COUNTER == $cwd/event$COUNTER.mkv"

  typeset -Z 2 -i minp=00
  for ((i = $stime; i <= $etime; i++)) 
  do
	minp=$i
	echo $cwd/$hour/$minp".mp4"
  done



ffmpeg -y \
  -f concat \
  -safe 0 \
  -i <(  for ((i = $stime; i <= $etime; i++)) ; do  minp=$i; echo "file "$cwd/$hour/$minp".mp4"; done) \
  -c copy "$cwd/$hour-$stime-event$COUNTER$desc.$format"

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





IFS="VVV"
echo $inp
for i in $(echo "$inp" )
do
	IFS=">"
        typeset -i piece=0
        typeset -Z 2 -i hour=00

	for part in $(echo "$i" | sed -E -e 's/:[0-9]+$//'  ) 
	do
		let piece++
		if [ "$piece" = "1" ]
		then
			hour=$part
		else	
			make_events $hour $part
		fi
		
	done
	
done
