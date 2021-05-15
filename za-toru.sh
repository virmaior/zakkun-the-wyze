#!/bin/zsh
typeset -i COUNTER=0
wyzeip=192.168.3.17
cwd=$(pwd)
day=20210512
uname=root
pword=WYom2020
echo $day "\n"


function start_wyze_boa
{
printf "starting boa on WYZE"
printf "$uname\r\n $pword\r\n cp /usr/boa/boa.conf /tmp/boa.conf \r\n /usr/boa/boa /media/mmc \r\n" | nc $wyzeip 1-8443 &&

printf "started boa on WYZE"
}



#start_wyze_boa

typeset -Z 2 -i hourp=0
typeset -Z 2 -i minp

for ((hour =00; hour <= 23; hour++)) 
do

	hourp=$hour
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
done
