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
#scaler5='scale=iw/3:ih/3'
scaler5='scale=640x360'
scalerb='scale=960x540'

for ARGUMENT in "$@"
do
    AKEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)
    case "$AKEY" in
        d)      day=${VALUE} ;;
 	s)	smin=${VALUE} ;;
	e)	emin=${VALUE} ;;
	prun)	prun=${VALUE};; 
        *)	echo "unknown paramater"${AKEY};;
   esac
done

if (( ${+prun} )) 
then
	echo "running with prun $prun"
fi



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

	# https://stackoverflow.com/questions/42336195/after-merge-videos-the-duration-is-too-long-ffmpeg
	# https://stackoverflow.com/questions/63429206/ffmpeg-xstack-mutiple-inputs-for-mosaic-video-output-extra-output-blank-scre

	case "$pcount" in
		1) echo "1 file so copy mode";;
		2) filter='[0:v]'"$scaler2"'[z1];[1:v]'"$scaler2"'[z2];[z1][z2]xstack=inputs=2:layout=0_0|w0_0[vi];[vi]pad=1920:1080[v]';;
		3) filter='[0:v]'"$scaler4"'[z1];[1:v]'"$scaler4"'[z2];[2:v]'"$scaler4"'[z3];[z1][z2][z3]xstack=inputs=3:layout=0_0|0_h0|w0_0|w0_h0[v]';;
#		3) filter='[0:v]'"$scaler4"'[z1];[1:v]'"$scaler4"'[z2];[2:v]'"$scaler4"'[z3];[z1][z2][z3]xstack=inputs=3:layout=0_0|0_h0|w0_0|w0_h0:fill=blue[v]';;
		4) filter='[0:v]'"$scaler4"'[z1];[1:v]'"$scaler4"'[z2];[2:v]'"$scaler4"'[z3];[3:v]'"$scaler4"'[z4];[z1][z2][z3][z4]xstack=inputs=4:layout=0_0|0_h0|w0_0|w0_h0[v]';;
		5) filter='[0:v]'"$scaler5"'[z1];[1:v]'"$scaler5"'[z2];[2:v]'"$scaler5"'[z3];[3:v]'"$scalerb"'[z4];[4:v]'"$scalerb"'[z5];[z1][z2][z3][z4][z5]xstack=inputs=5:layout=0_0|w0_0|w0+w1_0|0_h0|960_h0[vi];[vi]pad=1920:1080[v]';;
		6) filter='[0:v]'"$scaler5"'[a1];[1:v]'"$scaler5"'[a2];[2:v]'"$scaler5"'[a3];[3:v]'"$scaler5"'[a4];[4:v]'"$scaler5"'[a5];[5:v]'"$scaler5"'[a6];[a1][a2][a3][a4][a5][a6]xstack=inputs=6:layout=0_0|w0_0|w0+w1_0|0_h0|w0_h0|w0+w1_h0[vi];[vi]pad=1920:1080[v]';;
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
	if (( ${+prun} ))
	then 
		if [[ $pcount -eq "$prun" ]]
		then
			echo "only running for $prun"
			echo ям	ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done)  -filter_complex "$filter" -map "[v]" -pix_fmt yuv420p -b:v "$brate" -vsync 2 -c:v "$accel" -an -s hd1080 -r 15 -video_track_timescale 30k  "$outfile.mp4"
			ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done)  -filter_complex "$filter" -map "[v]" -pix_fmt yuv420p -b:v "$brate" -vsync 2 -c:v "$accel" -an -s hd1080 -r 15 -video_track_timescale 30k  "$outfile.mp4"
		fi
	else if [[ $pcount -eq 1 ]] 
	then
		echo ffmpeg -hide_banner -loglevel  "$elevel"  $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done) -s hd1080 -r 15 -video_track_timescale 30k "$outfile.mp4" 
		ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done) -s hd1080 -r 15 -video_track_timescale 30k "$outfile.mp4" 
	else if [[ $pcount -gt 1 ]]
		echo ям	ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done)  -filter_complex "$filter" -map "[v]" -pix_fmt yuv420p -b:v "$brate" -vsync 2 -c:v "$accel" -an -s hd1080 -r 15 -video_track_timescale 30k  "$outfile.mp4"
		ffmpeg -hide_banner -loglevel "$elevel" $( for mkey mval in "${(@kv)ffmap}"; do  printf "%s" "$mval ";  done)  -filter_complex "$filter" -map "[v]" -pix_fmt yuv420p -b:v "$brate" -vsync 2 -c:v "$accel" -an -s hd1080 -r 15 -video_track_timescale 30k  "$outfile.mp4"
	fi 	
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

echo "completed all assigned parts for $day (modified by s and e)"
