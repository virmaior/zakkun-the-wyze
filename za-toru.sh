#!/bin/zsh
typeset -i COUNTER=0
wyzeip=192.168.3.17
cwd=$(pwd)
day=20210510
uname=root
pword=WYom2020
echo $day "\n"


function start_wyze_boa
{
printf "starting boa on WYZE"
printf "$uname\r\n $pword\r\n cp /usr/boa/boa.conf /tmp/boa.conf \r\n /usr/boa/boa /media/mmc \r\n" | nc $wyzeip 1-8443 &&

printf "started boa on WYZE"
}

function twodigit
{
 # echo "what $1 "
  if (( "$1" < 10)); then
    echo 0$1
  else
    echo $1 
  fi
}



start_wyze_boa

for ((hour =00; hour <= 23; hour++)) 
do

	hourp=$(twodigit $hour)
	echo $hourp
	mkdir $hourp
	cd $hourp
	for ((i = 00; i <= 59; i++)) 
	do
		minp=$(twodigit $i)
		url=$day/$hourp/$minp.mp4
		fullurl=$wyzeip/SDPath/record/$url
		echo $fullurl
  		curl -O $fullurl 
	done
	cd ..
done
