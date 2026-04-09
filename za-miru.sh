#!/bin/zsh
typeset -Z 2 -i COUNTER=0
. /var/www/html/za-common.sh
cd /var/www/html

typeset -Z 2 minute=0
typeset -i seconds=00
typeset -i capcount=4



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
	sp)		sp=${VALUE} ;;
	cam)		cam=${VALUE} ;;
	*)
    esac
done

if [ -z "$sp" ]; then
	spt="_"
	if [ -d "$cwd/$day$spt$cam" ]; then
		sp="_"
	fi
fi

if [ -z "$sp" ]; then
	sp="-"
fi


re='^[0-9]+$'
if ! [[ $day =~ $re ]] ; then
  if [[ "$day" == "yesterday" ]]; then
	day=$(date -d "yesterday" +%Y%m%d)
  else
  echo "error: day is $day - Not a number" >&2; exit 1
  fi
fi

if [ -z "$cam" ]
then
	cam=1
	if [ -n "$day" ];
	then
  		tgtd=$cwd/$day
	else
  		tgtd=$cwd
  		day=$(basename)
	fi
else
	tgtd="$cwd/$day$sp$cam"
fi

((capjump=60 / $capcount))

 if [ -n "$s_hour" ]
then
	 if [ -n "$e_hour" ];
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
	if [ -n "$skipcap" ] ;
	then
		echo "skipped capture phase"
		return 1;
	fi

	cd "$tgtd"
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


function compose_json
{
	local -A myj
	myj=("${(@kvP)1}")
        for k in "${(@okn)myj}"; do
                local v="${myj[$k]}"
                [[ -z "$v" ]] && continue
                jq -n --arg k "$k" --arg v "${v#$'\n'}" '{($k): ($v | split("\n"))}'
        done | jq -s '{minutes: add}' >> "$jtarget"
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

	cd "$cwd"
	fFILE=$1
	hour=${FILE:0-3:2}
	typeset -i -Z 2 cminute=00

	cp za-miru-top.html  "$target"
	echo '<div class="za_top_DIV" day="'$day'"  hour="'$hour'" cam="'$cam'"><div class="za_day">'$day '</div><div class="za_hour">'$hour '</div><div class="za_cam">'$cam'</div></div>' >> $target	
	#echo '<div class="zminute_DIV" minute="00"><div class="zm_marker"><a href="'$hour"/"$minute.mp4'">00</a></div>' >> $target
	write_zminute $hour 00
	cd "$fFILE"

	local -A minj
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
                        minj[$cminute]+=$'\n'"$i"

		#echo  "$COUNTER - $i - " $minute $screen
		echo '<div class="za_DIV" screen="'$screen'"><IMG minute='$minute' screen='$screen' class="za_img" src="'$hour'/'$i'" /></div>' >> $target
	done
	echo '</div>' >> "$target"
        cat "$cwd/za-miru-bottom.html" >> "$target"

	compose_json "minj"


	cd "$cwd"
}

echo "Entering Loop on $tgtd"


# Normalise the date part (dash ↔ underscore)
date_part=$(basename "$tgtd")                # "20251031-3"  or "20251031_3"
date_root=$(dirname  "$tgtd")                # "/mnt/ssd_data/var/www/html"

echo "$date_part"
echo "$date_root"

# Build a glob that accepts both separators
for FILE  in "$date_root"/$date_part/[0-2][0-9]/; do
#do
	hour=$(basename "$FILE")

	echo "$target for $hour"
        target="$tgtd/screens$hour.html"
	jtarget="$tgtd/screens$hour.json"
        echo "target is $target"


 	if [ -n "$s_hour" ] ; then
	        if [ "$hour" -ge "$s_hour" ] && [ "$hour" -le "$e_hour" ]; then
			echo "processing $hour"
			folder_tsukamu "$FILE"
			folder_miru "$FILE"
		fi
	else

		folder_tsukamu "$FILE"
		folder_miru "$FILE"
	fi

	(( COUNTER++ ))
done


echo "Loop Done"
