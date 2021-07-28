#!/bin/zsh
typeset -i COUNTER=0
wyzeip=192.168.3.101
cwd=$(pwd)
uname=root
pword=WYom2020

typeset -Z 2 -i minhour=00
typeset -Z 2 -i maxhour=23


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	d)		day=${VALUE} ;;
	s)    		minhour=${VALUE} ;;     
	e)		maxhour=${VALUE} ;;
	m)		miru=${VALUE} ;;	
	cron)		cron=${VALUE} ;;
	ip)		wyzeip=${VALUE}} ;;
	cam)		cam=${VALUE} ;;
	*)   
    esac    

done

myos=$(uname)

function datediff
{
 if [[ "$myos" == "Darwin" ]]
 then
	echo $(date $1 +$2)
 else
	if [[ "$1" == "-v-1H" ]]; then
		echo $(date --date="1 hour ago" \+"$2")
	elif [[ "$1" == "-v-1d" ]]; then
		echo $(date --date="yesterday" \+"$2")
	else
		exit -1
	fi
 fi 
}


if [ -n "$cron" ]
then
	day=$(datediff -v-1H %Y%m%d ) 
	minhour=$(datediff -v-1H %H)
	maxhour=$(datediff -v-1H %H)
	miru=yes
fi



if [ -n "$day" ]
then
	echo "Ran with parameter d=$day "
else
	echo "no parameter given - assuming yesterday"
	day=$(datediff -v-1d %Y%m%d ) 
	if [ -d "$day" ]; then
    		echo "Directory exists $day -- aborting run"
    		exit 
	fi
fi



echo $day " from " $minhour " to " $maxhour

if [ -n "$cam" ] 
then
	echo "running on camera $cam"
	mkdir "$day-$cam"
	cd "$day-$cam"
	if [ "$cam" = "2" ]
	then
		wyzeip=192.168.3.102
	elif [ "$cam" = "3" ]
	then
		wyzeip=192.168.3.103
	elif [ "$cam" = "4" ]
	then
		wyzeip=192.168.3.104
	fi
else
	wyzeip=192.168.3.101
	mkdir "$day"
	cd "$day"
fi

function start_wyze_boa
{
 (printf '%s\r\n\r\n' "$uname"; sleep 5; printf '%s\r\n' "$pword"; sleep 5; printf 'cp /usr/boa/boa.conf /tmp/boa.conf\r\n'; sleep 5; printf '/usr/boa/boa /media/mmc \r\n') |   nc -vDt4 $wyzeip 23 -i1 
}


function hour_toru
{
	typeset -Z 2 -i hourp=$1
	typeset -Z 2 -i minp

	echo $hourp

	mkdir $hourp

  	cd $hourp
	curl -O  http://$wyzeip"/SDPath/record/"$day/$hourp"/[00-59].mp4" 
	#for ((i = 00; i <= 59; i++)) 
	#do
	#	minp=$i
	#	url=$day/$hourp/$minp.mp4
	#	fullurl=$wyzeip/SDPath/record/$url
	#	echo $fullurl
  	#	curl -O $fullurl 
	#done
	cd ..
}


#start_wyze_boa

typeset -Z 2 -i hourp=0
typeset -Z 2 -i minp

for ((hour =$minhour; hour <= $maxhour; hour++)) 
do
	hour_toru $hour	
done

cd ..

if [ -n "$miru" ] 
then
	echo "running miru"
	if [ -n "$cam" ]
	then
		camstring='cam='$cam
	fi
	zsh za-miru.sh d=$day s=$minhour e=$maxhour $camstring
fi


