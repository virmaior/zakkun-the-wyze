#!/bin/zsh
. /var/www/html/za-common.sh


typeset -i COUNTER=0
typeset -Z 2 -i minhour=00
typeset -Z 2 -i maxhour=23

for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
	cam)		cam=${VALUE} ;;
	*)   
    esac

done

base_ip="192.168.9"


if [ -z "$cam" ]; then
	echo "no camera set"
	exit;
fi
camip="$base_ip.10$cam"

echo "camera ip is $camip"


prot="h264"
if [ "$cam" -ge 2 ]; then
  prot="hevc"
fi

die() { echo -e "\e[38;5;160m$@\e[0m" >&2; exit 1; }

log()
{
 echo $(cat /proc/uptime) "$1" >&2; 
}

create_directory_for() {
	dir="$(dirname "$1")"
	[ -d "$dir" ] || mkdir -p "$dir"
	[ -d "$dir" ] || die "Cannot create directory $dir"
	[ -w "$dir" ] || die "Cannot write to $dir"
}




create_now_directory()
{
local target_dir="${recordpath}/$(date +%Y%m%d)_${cam}/$(date +%H)"
mkdir -p "$target_dir"
}


create_next_directory() {
    # Calculate the timestamp for the start of the next hour
    local next_hour_timestamp=$(( $(date +%s) / 3600 * 3600 + 3600 ))
    
    # Format as YYYYMMDD_HH (using the cam variable from outer scope or as argument)
    local date_part=$(date -d "@$next_hour_timestamp" +%Y%m%d)
    local hour_part=$(date -d "@$next_hour_timestamp" +%H)
    
    local target_dir="${recordpath}/${date_part}_${cam}/${hour_part}"
    
    mkdir -p "$target_dir"
    
}


uptimecs()
{
echo $(awk -F. '{print $2+0}' /proc/uptime)
}


# "parameter" "default"
read_config() {
        sed -nE "s/^.*$1\s*[:=]\s*\"?([^\"]+)\"?;.*$/\1/p" /etc/prudynt.cfg | head -1
        [ -z "$_" ] || echo "$2"
}


record_mount="/var/www"
record_device_path="html"
recordpath="$record_mount/$record_device_path"
record_duration=60
record_filename="%Y%m%d_$cam/%H/%M"
record_videofmt="mp4"
rtsp_username="thingino"
rtsp_password="thingino"
stream_fps=25
stream_height=1080
stream_width=1920
[ -z "$stream_number"    ] && stream_number=0
# FIXME: based on default stream endpoint name, won't work on custom endpoints
stream_endpoint="ch$stream_number"

record_storage="$record_mount/"$(date +"$record_device_path")
if [ ! -d "$record_storage" ]; then
        log "Creating $record_storage"
        mkdir -p "$record_storage" || die "Cannot create directory $record_storage"
fi
[ -w "$record_storage" ] || die "Cannot write to $record_storage"



find_cs()
{
u1=$(uptimecs)
s1=$(date +%S)
s2="$s1"
while [ "$s2" = "$s1" ]; do
    sleep 0.05
    s2=$(date +%S)
    u2=$(uptimecs)
done
    log "offset is  $u2"
    #echo "$s1 $s2 $(echo "$u2 $u1" | awk '{print $1 - $2}')"
    echo "$u2" 
}


log "
stream_number: $stream_number
stream_endpoint: $stream_endpoint
stream_fps: $stream_fps
stream_height: $stream_height
stream_width: $stream_width
"

[ -z "$stream_number"   ] && die "Cannot determine stream number"
[ -z "$stream_endpoint" ] && die "Cannot determine stream endpoint"
[ -z "$stream_fps"      ] && die "Cannot determine stream fps"
[ -z "$stream_height"   ] && die "Cannot determine stream height"
[ -z "$stream_width"    ] && die "Cannot determine stream width"


RECORD_FLAG="/var/www/html/tmp/record-$cam"
if [ -f "$RECORD_FLAG" ]; then
	die "Record already running for camera $cam"
fi

touch $RECORD_FLAG

offset_cs=$(find_cs)
echo "$offset_cs"
echo "sleeping until M:00"
sleep $(( 60 - $(date +%S) ))
# concept is 60 - current date but we have to be offset or get weird files

record_dir_count=0

record_file="$record_storage/%Y%m%d_$cam/%H/%M.$record_videofmt"
create_now_directory
create_next_directory

command="$ffmpeg -rtsp_transport tcp -i rtsp://$rtsp_username:$rtsp_password@$camip/$stream_endpoint \
         -c:v copy \
         -c:a aac -b:a 64k -ar 16000 -ac 1 \
         -map 0 \
     	 -f segment \
	 -segment_time 60 \
	 -reset_timestamps 1 \
	 -strftime  1 \
	 $record_file"

	echo "$command"
	eval "$command" 2> /dev/null &
	#eval "$command"
	opid=$!

while :; do
        [ -f $RECORD_FLAG ] || break
	sleep 28
	create_next_directory
done

log "Cannot find recording flag $RECORD_FLAG"
[ -n "$LEDD_FLAG" ] && [ -f "$LEDD_FLAG" ] && rm $LEDD_FLAG
log "Exit"

kill "$opid"

exit 0
