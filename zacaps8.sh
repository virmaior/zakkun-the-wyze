#!/bin/zsh
typeset -i COUNTER=0
typeset -i capcount=3
((capjump=60 / $capcount))
typeset -i seconds=00

echo $capjump

cwd=$(pwd)
for FILE in ./*/
do
	let	COUNTER++
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

	#ffmpeg -ss 00:00:0.00 -i "00.mp4" -frames:v 1 -f image2 -map 0:v:0 screen00-001.jpg -ss 00:00:20.00 -i "00.mp4" -frames:v 1 -f image2 -map 1:v:0 screen00-002.jpg -ss 00:00:40.00 -i "00.mp4" -frames:v 1 -f image2 -map 2:v:0 screen00-003.jpg
done
cd "$cwd"
done
