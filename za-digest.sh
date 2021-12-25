#!/bin/zsh
typeset -i COUNTER=0
cwd=$(pwd)


typeset -i vidlength
typeset -A minarray
typeset -Z 4 vcurrent
typeset -Z 4 smin=0
typeset -Z 4 emin=1440

scaler4='scale=iw/2:ih/2'
scaler2='scale=iw/2:ih/2'
scaler5='scale=iw/3:ih/3'

for ARGUMENT in "$@"
do
    AKEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)
    case "$AKEY" in
        d)      day=${VALUE} ;;
 	s)	smin=${VALUE} ;;
	e)	emin=${VALUE} ;;
        *)	echo "unknown paramater"${AKEY};;
 
   esac
done



if [ -n "$day" ]
then
	echo "Ran with parameter d=$day "
else
	echo "no parameter given - you need to set a date using d="  
    	exit 
fi

function decode_part
{
  IFS=";"
  fname="";
  
for ARGUMENT in $(echo "$1" )
do
    KEY=$(echo $ARGUMENT | cut -f1 -d:)
    VALUE=$(echo $ARGUMENT | cut -f2 -d:)   

    case "$KEY" in
        m)            typeset -Z 2 -i vidmin=${VALUE} ;; 
        f)            fname=${VALUE} ;;
        *)   
    esac    

done

  if [ -n "$fname" ]; then
	let "vidsec = (vidmin )  * 60 "
	echo ' -ss '"$vidsec"' -t 60 -i '$fname
  fi
}


function decode_minute
{
	typeset -Z 4 realmin=$1
	typeset -i pcount=0
	typeset -A ffmap
	IFS="|"
	
	echo 'Minute '$realmin' of day '$day
	for PART in $(echo "$2")
	do
	  try=$(decode_part "$PART")   
	  if [ -n "$try" ] 
 	  then
	    let "pcount = pcount + 1"
	    ffmap[$pcount]="$try"
	  fi
	done


	if [[ $pcount -eq 3 ]]
	then	
		ffmap[4]=' -f lavfi -i color=size=1920x1080:rate=15:color=blue:d=60'
		let "pcount = pcount + 1"
	fi

	case "$pcount" in
		1) echo "1 file so copy mode";;
		2) filter='[0:v]'"$scaler2"'[4:v];[1:v]'"$scaler2"'[5:v];[4:v][5:v]hstack=inputs=2[v]';;
		4) filter='[0:v]'"$scaler4"'[4:v];[1:v]'"$scaler4"'[5:v];[4:v][5:v]hstack=inputs=2[top];[2:v]'"$scaler4"'[6:v];[3:v]'"$scaler4"'[7:v];[6:v][7:v]hstack=inputs=2[bottom];[top][bottom]vstack=inputs=2[v]';;
		5) filter='[0:v]'"$scaler5"'[5:v];[1:v]'"$scaler5"'[6:v];[2:v]'"$scaler5"'[7:v];[5:v][6:v][7:v]hstack=inputs=3[top];[3:v]'"$scaler4"'[8:v];[4:v]'"$scaler4"'[9:v];[8:v][9:v]hstack=inputs=2[bottom];[top][bottom]vstack=inputs=2[v]';;
		*) minute_output "$pcount $realmin"  "$ffmap";;
	esac

	IFS=" ";
	outfile="clips/digest-$day-$realmin"
	echo "producing $outfile with $pcount inputs"
	accel="h264_v4l2m2m"
	#accel="h264_omx"
	elevel="error"
	#elevel="debug"
	brate="2500k"
	if [[ $pcount -eq 1 ]] 
	then
		echo ffmpeg -hide_banner -loglevel  "$elevel"  $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done) -c copy "$outfile.mkv" 
		ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done) -c copy "$outfile.mkv" 
	else if [[ $pcount -gt 1 ]]
		echo ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done)  -filter_complex "\"$filter\"" -map '"[v]"' -b:v "$brate" -vsync 2 -c:v "$accel" -an "$outfile.mp4"
		ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done)  -filter_complex "$filter" -map "[v]" -b:v "$brate" -vsync 2 -c:v "$accel" -an  "$outfile.mp4"
	fi 	

}


function minute_output
{
	echo "unknown minute output $1 $2"
	exit;
}



for FILE in $cwd/clips/$day/$day-*
do
  echo $FILE
  fparts=("${(@s/-/)FILE}")
  hour=$fparts[2]
  minute=$fparts[3]
  cam=$fparts[4]
   let "vstart= (hour * 60) + minute "
  echo "h:" $hour "m:" $minute "cam:" $cam
  vidlength=$(ffprobe -i $FILE -show_entries format=duration -v quiet -of csv="p=0") 
	let "vidlength = vidlength / 60"
  for ((i = 00; i < vidlength; i++)) 
  do
   	let "vcurrent = vstart + i"
   	minarray[$vcurrent]="$minarray[$vcurrent]|f:$FILE;m:$i"
  done
done
keys=("${(@k)minarray}")
ZKEYS=""
ZKEYS=`echo $keys | tr ' ' '\012' | sort | tr '\012' ' '`
IFS=" ";
echo $ZKEYS


for KEY in $(echo "$ZKEYS") 
do
	if [[ "$KEY" -ge "$smin" ]] 
	then
		if [[ "$KEY" -le "$emin" ]]
		then 
			value=${minarray[$KEY]}
			#echo 'key'  $KEY 'value'  $value
			decode_minute $KEY $value
		fi  
	fi
done
