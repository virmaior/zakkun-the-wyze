#!/bin/zsh
typeset -i COUNTER=0
typeset -i seconds=00
typeset -i capcount=3


if [ -n "$1" ]
then
	capcount=$1
else
	echo "no screenshot count given - assuming 3"
fi

((capjump=60 / $capcount))

echo $capjump

cwd=$(pwd)
for FILE in ./*/
do
	let COUNTER++
	echo "$COUNTER == $FILE "
	cd "$FILE"
	
for i in *.mp4
  do 
  	name=`echo "$i" | cut -d'.' -f1`
  	echo "$name"
	typeset -Z 3 -i smallcounter=0
	ffmap=""
	for ((seconds =00; seconds <= 59; seconds= seconds + capjump))
	do
		let smallcounter++
		((mapnum=$smallcounter -1))
		ffmap="$ffmap "'-ss 00:00:'$seconds'.00 -i '$i' -frames:v 1 -f image2 -map '$mapnum':v:0 screen'$name'-'$smallcounter'.jpg'
	done

	echo $ffmap

	ffmpeg $(echo $ffmap) 

done
cd "$cwd"
done
