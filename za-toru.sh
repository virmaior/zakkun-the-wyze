#!/bin/zsh
typeset -i COUNTER=0
wyzeip=192.168.3.17
cwd=$(pwd)
uname=root
pword=WYom2020


if [ -n "$1" ]
 then
	echo "date set to $1"
	day=$1
else
	echo "no parameter given - assuming yesterday"
	day=$(date -v-1d +%Y%m%d ) 
fi


typeset -Z 2 -i minhour=00
typeset -Z 2 -i maxhour=23
if [ -n "$2" ]
then
 minhour=$2
fi
if [ -n "$3" ]
then
 maxhour=$3
fi


if [ -d "$day" ]; then
   if [ -n "$4"];
   then
     echo "directory exists $day -- override run"
   else
    echo "Directory exists $day -- aborting run"
    exit 
    fi
else
   echo "Directory doesn't exist"
fi

mkdir "$day"
cd "$day" 

function start_wyze_boa
{
printf "starting boa on WYZE"
printf "$uname\r\n $pword\r\n cp /usr/boa/boa.conf /tmp/boa.conf \r\n /usr/boa/boa /media/mmc \r\n" | nc $wyzeip 1-8443 &&

printf "started boa on WYZE"
}


function hour_toru
{
	typeset -Z 2 -i hourp=$1
	typeset -Z 2 -i minp

	echo $hourp

	mkdir $hourp

  	cd $hourp
	for ((i = 00; i <= 59; i++)) 
	do
		minp=$i
		url=$day/$hourp/$minp.mp4
		fullurl=$wyzeip/SDPath/record/$url
		echo $fullurl
  		curl -O $fullurl 
	done
	cd ..
}


#start_wyze_boa

typeset -Z 2 -i hourp=0
typeset -Z 2 -i minp

for ((hour =$minhour; hour <= $maxhour; hour++)) 
do
	hour_toru $hour	
done

