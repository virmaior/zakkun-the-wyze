#!/bin/zsh
typeset -i COUNTER=0
digs=$(pwd)"/digests"
cwd=$(pwd)


cron_search()
{
        odate="20220101"
        dates=()
        for file in $1/digest-*.m*
        do
                fname=${file##*/} 
                fdate=${fname:7:8}
                if [ $fdate -ne $odate ] 
                then
                        dates+="$fdate" 
                        odate=$fdate
                fi
        done
	echo "$dates"
	echo $#dates
}

rc_day()
{
	day=$1
	format=$2
	cwd=$(pwd)

   	ffmap=""
   	for i in $digs/digest-$day*.m*
   	do
   		ffmap="$ffmap\n-i $i "
   	done
	echo $ffmap

	product="day-digest-$day.$format"


	elevel="error" #elevel="debug"
ffmpeg -hide_banner -loglevel $elevel  -y \
  -safe 0 \
  -f concat \
  -i <(for i in $digs/digest-$day*.m*; do echo "file '$i'"; echo "outpoint 60";  done;) \
  -an \
  -c copy -r 15  "$product"

	target="zgd:/ザッ君/digests"
	echo "rcloning file from $product to $target"
	rclone copy $product  "$target"
}

for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	d)    		day=${VALUE} ;;     
	f)		format=${VALUE} ;;
        debug)          debug=${VALUE} ;;
	cron)		cron=${VALUE}} ;;
	*)   		echo "unknown: " $KEY  " " $VALUE ;;
    esac    

done

if [ -z "$format" ] 
then
        format="mkv"
fi


if [ -n "$cron" ]
then
	echo "cron mode"
	{
		read -r days
		read -r  day_count
	} <<< "$(cron_search $digs)"

	my_count=0
	for  goday in $(echo "$days")
	do
                my_count=$(($my_count+1))
		if [[ $my_count -eq $day_count ]] 
		then
			echo "last day $goday - might be incomplete skipping "
		else
                        echo "test for >$goday<"
			test=$(echo "$cwd/day-digest-$goday.$format")
			if [ -f  "$test" ]
			then
				echo "found $goday"
			else 
				echo "file not found for $goday"
				rc_day $goday $format
			fi
		fi
	done
	exit
fi

if [ -z  "$day" ]
then
	echo  "you must set a date"
	exit
else
	rc_day $day $format
fi

