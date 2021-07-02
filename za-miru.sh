#!/bin/zsh
typeset -Z 2 -i COUNTER=0
cwd=$(pwd)
typeset -Z 2 minute=0
typeset -i seconds=00
typeset -i capcount=3


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	capcount)	capcount=${VALUE} ;;
	s)    		s_hour=${VALUE} ;;     
	e)		e_hour=${VALUE} ;;
	skipcap)		skipcap=${VALUE} ;;	
	skiphtml)	skiphtml=${VALUE} ;;
            *)   
    esac    


done



((capjump=60 / $capcount))

 if [ -n "$s_hour" ]
then
	 if [ -n "$e_hour" ] 
	then
		echo "run range = " $s_hour to $e_hour

	else
		e_hour=$s_hour
		echo "run range = " $s_hour to $e_hour

	fi
else
echo "run greedy"
fi

echo "capcount=" $capcount " so " $capjump " captures per minute "


overwrite() { echo -e "\r\033[1A\033[0K$@"; }


function folder_tsukamu
{
if [ -n "$skipcap" ] 
then
	echo "skipped capture phase"
	return 1;
fi

	cd "$1"
	echo -n "start $1 - minute: "
for i in *.mp4
  do 
  	name=`echo "$i" | cut -d'.' -f1`
  	echo -n " $name "
	typeset -Z 3 -i smallcounter=0
	ffmap=""
	for ((seconds =00; seconds <= 59; seconds= seconds + capjump))
	do
		let smallcounter++
		((mapnum=$smallcounter -1))
		ffmap="$ffmap "'-ss 00:00:'$seconds'.00 -i '$i' -frames:v 1 -f image2 -map '$mapnum':v:0 screen'$name'-'$smallcounter'.jpg'
	done

	#overwrite $ffmap

	ffmpeg -hide_banner -loglevel error $(echo $ffmap) 
done
	echo " done $1 "

	cd "$cwd"

}

function folder_miru
{
if [ -n "$skiphtml" ] 
then
        echo "skipped HTML generation"
        return 1;
fi

	
	fFILE=$1
	hour=${fFILE:2:2}
	typeset -i -Z 2 cminute=00

	target=$cwd/screens$hour.html
	echo $target
	cp za-miru-top.html  $target
	echo '<div class="za_top_DIV" hour="'$hour'">'$hour'</div>' >> $target	
	echo '<div class="zminute_DIV" minute="00"><div class="zm_marker">00</div>' >> $target
	cd "$fFILE"
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
		echo '<div class="za_DIV" screen="'$screen'"><IMG minute='$minute' screen='$screen' class="za_img" src="'$hour'/'$i'" /></div>' >> $target
	done
	cd "$cwd"
	echo '</div>' >> $target
	cat za-miru-bottom.html  >> $target

}



for FILE in ./*/
do

	echo "$COUNTER == $FILE "
	hour=${FILE:2:2}
	echo "looped"
 	if [ -n "$s_hour" ] 
	then
		if [ "$hour" -ge "$s_hour" ] 
		then
			echo "passed start"
			if [ "$hour" -le "$e_hour" ] 
			then
				folder_tsukamu $FILE
				folder_miru $FILE
			fi
		fi
	else

		folder_tsukamu $FILE
		folder_miru $FILE
	fi

	let COUNTER++
done
