#!/bin/zsh
typeset -i COUNTER=0
clips=$(pwd)"/clips"
cwd=$(pwd)



rclone_day() 
{
  rclone copy clips --include "$1*.mkv" zgd:"/ ^b  ^c^c ^p^{/$1"
  mkdir clips/$1
  mv clips/$1*.mkv clips/$1
}



for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	d)    		day=${VALUE} ;;     
	f)		format=${VALUE} ;;
        debug)          debug=${VALUE} ;;
	cron)		cron=${VALUE} ;;
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
	odate="20220101"
	dates=()
	for file in $clips/*.$format
	do
		fname=${file##*/} 
		fdate=${fname:0:8}
		if [ $fdate -ne $odate ] 
		then
			dates+="$fdate"	
			odate=$fdate
		fi
	done
		dcount=$#dates
		if [ $dcount -gt 1 ]; then
		echo "$dcount dates found"
		for  (( i = 1 ; i <  $dcount ; i++ )) 
		do
			echo $dates[i]
			rclone_day $dates[i]
		done
		else
			echo "only one date ... skipping"
		fi
	exit
fi


if [ -z  "$day" ]
then
	echo  "you must set a date"
	exit
fi



if [ -n "$day" ]
then
	echo "running in directory $day "
	rclone_day $day
fi


