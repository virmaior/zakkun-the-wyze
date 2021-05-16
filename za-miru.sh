#!/bin/zsh
typeset -Z 2 -i COUNTER=0
cwd=$(pwd)
typeset -Z 2 minute=0


for FILE in ./*/
do
	typeset -i -Z 2 cminute=00
	hour=${FILE:2:2}
	echo "$COUNTER == $FILE "	
	target=$cwd/screens$hour.html
	cp za-miru-top.html  $target
	
	echo '<div class="zminute_DIV" minute="00"><div class="zm_marker">00</div>' >> $target
	cd "$FILE"
	for i in screen*.jpg
	do
		minute=${i:6:2}
		screen=${i:9:3}
		if [[ "${minute}" != "${cminute}" ]] 
		then
			echo '</div>' >> $target

			echo '<div class="zminute_DIV" minute="'$minute'"><div class="zm_marker">'$minute'</div>' >> $target
			cminute=$minute
		
		fi

		#echo  "$COUNTER - $i - " $minute $screen
		echo '<div class="za_DIV"><IMG minute='$minute' screen='$screen' class="za_img" src="'$hour'/'$i'" />'$screen'</div>' >> $target
	done
	cd "$cwd"
	echo '</div>' >> $target
	cat za-miru-bottom.html  >> $target
	let COUNTER++

done
