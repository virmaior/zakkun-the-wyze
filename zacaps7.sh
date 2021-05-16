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
	typeset -i smallcounter=0
	for ((seconds =00; seconds <= 59; seconds= seconds + capjump))
	do
		let smallcounter++
		ffmpeg  -ss 00:00:$seconds.00 -i "$i"  -frames:v 1 screen$name-$smallcounter.jpg
	done 
	
done
cd "$cwd"
done
