#!/bin/zsh
. /var/www/html/za-common.sh
typeset -i COUNTER=0
clips=$(pwd)"/clips"


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	f)		format=${VALUE} ;;
	d)    		day=${VALUE} ;;     
	i)		inp=${VALUE} ;;
        debug)          debug=${VALUE} ;;
	sep)		sep=${VALUE} ;;
	*)   		echo "unknown: " $KEY  " " $VALUE ;;
    esac

done

if [ -z "$sp" ];
then
	sep="-"
fi

if [ -z  "$inp" ]
then
	echo  "you must use i= to set an input"
	exit
fi

if [ -z "$format" ] 
then
	format="mkv"
fi

cwd=$(pwd)



function switch_camera_dir
{
	cam=$1
	dday=$2
	hour=$3
	us="_"
	#if we have a new fangled version of the directory use it!
	if  [  -d "$cwd/$dday$us$cam/$hour" ];
	then
		cd "$cwd/$dday$us$cam"
		echo "using underscore version"
	elif  [ "$1" = "1" ];
	then
		cd "$cwd/$dday"
	else
		cd "$cwd/$dday$sep$cam"
	fi
}

function db_insert
{
  echo "$blue"
  echo  "INSERT INTO video_list (cam,take_date,take_hour,start_min,end_min,contents) VALUES ($1,'$2',$3,$4,$5,\"$6\");"
  mysql -urecorder zakkun -e"INSERT INTO video_list (cam,take_date,take_hour,start_min,end_min,contents) VALUES ($1,'$2',$3,$4,$5,\"$6\");"
  echo "$reset"
}

function make_event 
{
  IFS=";"
  desc=""

  meta=""
  spart=""
  epart=""

for ARGUMENT in $(echo "$3" )
do

    KEY=$(echo $ARGUMENT | cut -f1 -d:)
    VALUE=$(echo $ARGUMENT | cut -f2 -d:)
  
    case "$KEY" in
        s)            typeset -Z 2 -i stime=${VALUE} ;;
        e)            typeset -Z 2 -i etime=${VALUE} ;;
        l)              desc=${VALUE} ;;
	ps)		spart=${VALUE} ; meta="$meta;$spart"  ;;
	pe)		epart=${VALUE} ;meta="$meta;$epart" ;;
	c)		cam=${VALUE} ;;
	d)		mdate=${VALUE} ;;
	h)		hour=${VALUE} ;;
        *)	echo "unknown: " $KEY  " " $VALUE ;;
    esac

done

    switch_camera_dir $cam $mdate $hour
    pth=$(pwd)

  meta="params=ps:$spart;pe:$epart"


# ─────────────────────────────────────────────────────────────
#  Prepare concat list — only once — and skip missing minutes
# ─────────────────────────────────────────────────────────────

concat_list=()
has_any=false

typeset -Z2 minp=00
for (( min = stime; min <= etime; min++ )); do
    minp=${(l:2::0:)$((min))}     # left-pad with 0 to width 2

	lpiece="$pth/$hour/$minp.mp4"
    if [ ! -f "$lpiece" ]; then
        # Optional: log skipped minute
        # echo "  → skipping missing file: $lpiece" >&2
        continue
    fi
    entry="file '$lpiece'"

    # inpoint only on the very first segment we actually use
    if [ "$min" -eq "$stime" ] && [ -n "$spart" ]; then
        entry="$entry\n  inpoint $spart"
    fi

    # outpoint only on the very last segment we actually use
    if [ "$min" -eq "$etime" ] && [ -n "$epart" ]; then
        entry="$entry\n  outpoint $epart"
    fi

    concat_list+=("$entry")
    has_any=true
done


# ─────────────────────────────────────────────────────────────
#  Early exit if no usable segments
# ─────────────────────────────────────────────────────────────

if ! $has_any; then
    echo "No existing minute files found between $stime–$etime → skipping event" >&2
    # You may want to: continue / return / exit 1 / etc.
    # For now we just skip ffmpeg part
else
    temp_concat=$(mktemp --tmpdir cam-concat.XXXXXX.txt)
    printf '%s\n' "${concat_list[@]}" > "$temp_concat"

	echo "$red"
    # ────────────────────────────────────────
    #   Show what would be concatenated (debug)
    # ────────────────────────────────────────
    echo "###(START)###"
    echo " Hour:        $hour"
    echo " Start minute: $stime"
    echo " End minute:   $etime"
    echo " Label:        $desc"
    echo "###(END)###"
    echo "$reset"
    product="$clips/$mdate-$hour-$stime-$cam-event$COUNTER$desc.$format"
    echo "output file: $product"
cat "$temp_concat"


    # ────────────────────────────────────────
    #   Only run ffmpeg when not in debug mode
    # ────────────────────────────────────────
    if [ -z "$debug" ]; then

ffmpeg -hide_banner -y \
    -f concat \
    -safe 0 \
    -i "$temp_concat" \
    -movflags use_metadata_tags \
    -metadata "$meta" \
    -c copy "$product"    
fi

    rm -f "$temp_concat"
fi

# Optional: always increment counter (or only when we created something?)
((COUNTER++))

# db_insert only if we actually produced something?
if $has_any; then
    db_insert "$cam" "$mdate" "$hour" "$stime" "$etime" "$desc"
fi
}

function make_events
{
  echo "hour $1 cams $2 "
  IFS=","
  for seg in $(echo "$3" )
  do
   echo "segment: " $seg
   make_event $hour $cam $seg
  done
}

IFS="V"
echo $inp
for i in $(echo "$inp" )
do
	IFS=">"
        typeset -i piece=0
        typeset -Z 2 -i hour=00

	for part in $(echo "$i" | sed -E -e 's/:[0-9]+$//' | sed -e 's/^[ \t]*//'   ) 
	do
		if [ -z "$part" ]; then
			continue
		fi
		date="$day"
		let piece++
		echo $piece
		if [ $(( piece % 2 )) -eq 1 ]; then
			IFS=";"
			for ARGUMENT in $(echo "$part"  )
			do
    				KEY=$(echo $ARGUMENT | cut -f1 -d:)
    				VALUE=$(echo $ARGUMENT | cut -f2 -d:)
    				case "$KEY" in
        				h)      hour=${VALUE} ;;
        				c)      cam=${VALUE} ;;
        				*)
    				esac 
			done
			echo "set hour to " $hour " and cam to " $cam
		else
				make_events $hour $cam  $part
		fi
	done
done
