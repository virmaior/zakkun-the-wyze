#!/bin/zsh
typeset -Z 2 -i COUNTER=0
. /var/www/html/za-common.sh
cd /var/www/html
typeset -Z 2 minute=0
typeset -i seconds=00
typeset -i capcount=3

for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	capcount)	capcount=${VALUE} ;;
	d)    		day=${VALUE} ;;     
	s)    		s_hour=${VALUE} ;;     
	e)		e_hour=${VALUE} ;;
	skipcap)	skipcap=${VALUE} ;;	
	skiphtml)	skiphtml=${VALUE} ;;
	cam)		cam=${VALUE} ;;
	*)   
    esac    


done

if [ -z "$cam" ]
then

	cam=1
	if [ -n "$day" ]
	then
  		tgtd=$cwd/$day
	else
  		tgtd=$cwd
  		day=$(basename) 
	fi

else 
	tgtd=$cwd/$day-$cam
fi


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

echo "capcount=" $capcount " per minute so 1 capture every  " $capjump " seconds "


overwrite() { echo -e "\r\033[1A\033[0K$@"; }


function folder_tsukamu
{
if [ -n "$skipcap" ] 
then
	echo "skipped capture phase"
	return 1;
fi
	cd $tgtd
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

	$ffmpeg -hide_banner -loglevel error $(echo $ffmap) 
done
	echo " done $1 "
	cd $cwd


}

function write_zminute
{
	printf  '<div class="zminute_DIV" minute="'%02d'"><div class="zm_marker"><a href="%02d/%02d.mp4">%02d</a></div>' $2 $1 $2 $2   >> $target
	
}


function folder_miru
{
if [ -n "$skiphtml" ] 
then
        echo "skipped HTML generation"
        return 1;
fi

	cd $cwd	
	fFILE=$1
	hour=${FILE:0-3:2}
	typeset -i -Z 2 cminute=00

#	target=$tgtd/screens$hour.html
	echo $target
	cp za-miru-top.html  $target
	echo '<div class="za_top_DIV" day="'$day'"  hour="'$hour'" cam="'$cam'"><div class="za_day">'$day '</div><div class="za_hour">'$hour '</div><div class="za_cam">'$cam'</div></div>' >> $target	
	#echo '<div class="zminute_DIV" minute="00"><div class="zm_marker"><a href="'$hour"/"$minute.mp4'">00</a></div>' >> $target
	write_zminute $hour 00
	cd "$fFILE"
	for i in screen*.jpg
	do
		minute=${i:6:2}
		screen=${i:9:3}
		if [[ "${minute}" != "${cminute}" ]] 
		then
			echo '</div>' >> $target

#			echo '<div class="zminute_DIV" minute="'$minute'"><div class="zm_marker"><div class="mm_DIV"><a href="'$hour"/"$minute.mp4'" target="_'$day$hour$minute'">'$minute'</a></div></div>' >> $target
			write_zminute  $hour $minute
			cminute=$minute
		
		fi

		#echo  "$COUNTER - $i - " $minute $screen
		echo '<div class="za_DIV" screen="'$screen'"><IMG minute='$minute' screen='$screen' class="za_img" src="'$hour'/'$i'" /></div>' >> $target
	done
	echo '</div>' >> $target
	cd $cwd
	cat za-miru-bottom.html  >> $target

}



for FILE in $tgtd/*/
do

	hour=${FILE:0-3:2}
 	if [ -n "$s_hour" ] ; then
	        if [ "$hour" -ge "$s_hour" ] && [ "$hour" -le "$e_hour" ]; then
			echo "processing $hour"
			folder_tsukamu "$FILE"
		        target="$tgtd/screens$hour.html"
			folder_miru "$FILE"
		fi
	else
		folder_tsukamu "$FILE"
		folder_miru "$FILE"
	fi

	(( COUNTER++ ))
done
