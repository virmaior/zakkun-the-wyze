#!/bin/zsh
setopt extendedglob
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
	e)			e_hour=${VALUE} ;;
	sp)			sp=${VALUE} ;;
	cam)		cam=${VALUE} ;;
	*)
    esac
done

re='^[0-9]+$'
if ! [[ $day =~ $re ]] ; then
  if [[ "$day" == "yesterday" ]]; then
	day=$(date -d "yesterday" +%Y%m%d)
  else
  echo "error: day is $day - Not a number" >&2; exit 1
  fi
fi

check_both=0
if [ -z "$cam" ]; then
	cam=1
fi

if [ "$cam" -eq 1 ]; then
	if [ -z "$sp" ]; then
		check_both=1
		sp="(_1|)"
	elif [[  "$sp" == "-"  ]]; then
		sp=""
	fi
else
	if [ -z "$sp" ]; then
		# test if the underscore version exists
		sp="(_$cam|-$cam)"
		check_both=1
	else 
		sp="$sp$cam"
	fi
fi

date_part="$day$sp"

((capjump=60 / $capcount))

 if [ -n "$s_hour" ]
then
	 if [ -z "$e_hour" ];
	then
		e_hour=$s_hour
	fi
	echo "run range =  $s_hour to $e_hour "
else
	echo "run full day (greedy)"
fi

overwrite() { echo -e "\r\033[1A\033[0K$@"; }

echo "Entering Loop on $tgtd from $cwd with $date_part"
echo "capcount= $capcount  per minute so 1 capture every  $capjump  seconds "

patt="${cwd}/${date_part}/[0-2][0-9]/"
# Build a glob that accepts both separators
for FILE  in $~patt; do
#do
	hour=$(basename "$FILE")
	if [[ "$check_both" -eq 1 ]]; then
		usv="${FILE//-/_}"
		if [[ "$cam" -eq 1 ]]; then
			prefix="${FILE%/*/*}"
			tail="${FILE#$prefix/}"
			usv="${prefix}_1/${tail}"
		fi
		if [[ "$usv" != "$FILE" ]]; then
			if [[ -e "$usv" ]]; then
				echo "underscore version found skipping $FILE"
				continue
			fi
		fi
	fi

	echo "target hour is $hour"
 	if [ -n "$s_hour" ] ; then
	        if [ "$hour" -ge "$s_hour" ] && [ "$hour" -le "$e_hour" ]; then
			echo "processing $hour"
			folder_tsukamu "$FILE"
		fi
	else
		folder_tsukamu "$FILE"
	fi

done

echo "Miru Loop Done"