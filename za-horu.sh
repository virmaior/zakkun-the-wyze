#!/bin/zsh
typeset -i COUNTER=0
cwd=$(pwd)
#for FILE in $(find  . -mindepth 2 -maxdepth 2 -type d -print0 )
for FILE in ./*/*/
do
	let	COUNTER++
	echo "$COUNTER == $FILE "  
	cd "$FILE"
	inputfiles=($(ls *.mp4  ))
	echo "files: " $inputfiles

	echo "$cwd/event$COUNTER.mkv"
ffmpeg -y \
  -f concat \
  -safe 0 \
  -i <(for f in $inputfiles; do echo "file '$PWD/$f'"; done) \
  -c copy "$cwd/event$COUNTER.mkv"
	cd "$cwd"
done  

