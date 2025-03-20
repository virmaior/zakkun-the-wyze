#!/bin/zsh
. /var/www/html/za-common.sh


typeset -i COUNTER=0
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
	skip)		skip=${VALUE} ;;
	scp)		scp=${VALUE} ;;
	*)   
    esac    

done



if [ -n "$scp" ] 
then
	netmask=192.168.$scp
	echo "working in $netmask"
fi



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
cpath="mnt/mmcblk0p1"

if [ -n "$cam" ] 
then
	echo "running on camera $cam"
	mkdir "$day-$cam"
	cd "$day-$cam"
	wyzeip=$netmask.10$cam
else
	wyzeip=$netmask.101
	mkdir "$day"
	cd "$day"
fi

echo "camera ip is $wyzeip"

function start_wyze_boa
{
 (printf '%s\r\n\r\n' "$uname"; sleep 5; printf '%s\r\n' "$pword"; sleep 5; printf 'cp /usr/boa/boa.conf /tmp/boa.conf\r\n'; sleep 5; printf '/usr/boa/boa /media/mmc \r\n') |   nc -vDt4 $wyzeip 23 -i1 
}


function hour_toru
{
	typeset -Z 2 -i hourp=$1

	echo "hour : " $hourp

	[[ -d $hourp ]] || mkdir $hourp

  	cd $hourp
	curl -O  http://$wyzeip"/SDPath/record/"$day/$hourp"/[00-59].mp4" 
	cd ..
}

function hour_toru2
{
        typeset -Z 2 -i hourp=$1
        echo "hour: " $hourp
        [[ -d $hourp ]] || mkdir $hourp
        cd $hourp
	#echo "root@"$wyzeip"/$cpath/record/"$day/$hourp"/*.mp4"
        scp -r  "root@"$wyzeip":/$cpath/record/"$day/$hourp"/*.mp4"  "."
	cd ..
}


#start_wyze_boa

if [ -z "$skip"]
then

typeset -Z 2 -i minp

for ((hour =$minhour; hour <= $maxhour; hour++)) 
do
	if [ -n "$scp" ] 
	then
		hour_toru2 $hour
	else	 
		hour_toru $hour	
	fi
done
fi

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
