#!/bin/zsh
typeset -i COUNTER=0
cwd=$(pwd)



function make_event 
{
  IFS=" "
  typeset -i tpiece=0
  for tp in $(echo "$2")
  do
	let tpiece++
    	if [ "$tpiece" = "1" ]
	then
	    typeset -Z 2 -i stime=${tp[4,6]}
	elif [ "$tpiece" = "3" ] 
	then
	    typeset -Z 2 -i etime=${tp[4,6]}
	fi
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
  -c copy "$cwd/event$COUNTER.mkv"

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


all=$@




IFS="X"
for i in $(echo "$all" )
do
	echo $i " hour row"
	IFS="="
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