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


# Function to clean up the subprocess
cleanup() {
    if [ -n "$archive_pid" ] && kill -0 "$archive_pid" 2>/dev/null; then
        echo "Parent exiting, killing subprocess $archive_pid..."
        kill -TERM "$archive_pid"
    fi
}

create_directory_for() {
	dir="$(dirname "$1")"
	[ -d "$dir" ] || mkdir -p "$dir"
	[ -d "$dir" ] || die "Cannot create directory $dir"
	[ -w "$dir" ] || die "Cannot write to $dir"
}


get_free_space() {
        available_space=$(df -k "$record_mount" | sed 1d | tr -d '\n' | awk 'END{print $4}') # in KiB
        log "Space available: $available_space KiB"
}

get_occupied_space() {
        occupied_space=$(du -s "$record_storage" | awk '{print $1}') # in KiB
        log "Space occupied: $occupied_space KiB"
}

uptimecs()
{
echo $(awk -F. '{print $2+0}' /proc/uptime)
}

hesitate() {
	echo "$1" >&2
	sleep 5
	exit 0
}

# "parameter" "default"
read_config() {
        sed -nE "s/^.*$1\s*[:=]\s*\"?([^\"]+)\"?;.*$/\1/p" /etc/prudynt.cfg | head -1
        [ -z "$_" ] || echo "$2"
}


record_mount="/var/www"
record_device_path="html"
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
[ -z "$align_minutes"   ] && align_minutes=true

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


if [ -n "$align_minutes" ]; then
  offset_cs=$(find_cs)
fi

echo "$offset_cs"

fix_duration() 
{
    if [ -z "$align_minutes" ]; then
        echo "$1"
    elif [ "$1" -eq 60 ]; then
        n_cs=$(uptimecs) || n_cs=0
    	#log "n_cs: $n_cs"
	    s=$(date +%S | sed 's/^0//') || s=0
	#log "s: $s"
	bonus_cs=0
        if [ "$n_cs" -gt "$offset_cs" ]; then
	   #log "calls $n_cs gt $offset_cs"
           s=$((s - 1))
           bonus_cs=100
        fi
        dpart=$(( bonus_cs +offset_cs - n_cs ))
	#log "dpart: $dpart"
	[ "$dpart" -lt 10 ] && dpart="0$dpart"
	spart=$(( $1 - s ))
	#log "spart: $spart"
        echo "$spart.$dpart"
    elif [ $(( $1 % 60 )) -eq 0 ]; then
        m_inc=$(( $1 / 60 ))
        mpart=$(( m_inc - ( $(date +%M) % m_inc ) ))
        echo $(( mpart * 60 ))
    else
        echo "$1"
    fi
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
record_dir_count=0

while :; do
	[ -f $RECORD_FLAG ] || break

	record_file="$record_storage/$(date +"$record_filename").$record_videofmt"
	log "$record_file"
        real_duration=$(fix_duration $record_duration)
	log "real duration: $real_duration"
	create_directory_for "$record_file"
	#command="ffmpeg -rtsp_transport tcp -c:v h264 -r $stream_fps  -i rtsp://$rtsp_username:$rtsp_password@$camip/$stream_endpoint -t $real_duration -c:v h264_v4l2m2m -f mp4 $record_file"
	#command="$ffmpeg -rtsp_transport tcp -c:v $prot -r $stream_fps  -i rtsp://$rtsp_username:$rtsp_password@$camip/$stream_endpoint -t $real_duration -c:v copy -c:a copy $record_file"

	command="$ffmpeg -rtsp_transport tcp -i rtsp://$rtsp_username:$rtsp_password@$camip/$stream_endpoint \
         -t $real_duration \
         -c:v copy \
         -c:a aac -b:a 64k -ar 16000 -ac 1 \
         -map 0 \
         $record_file"

	echo "$command"
	timeout $((record_duration + 5)) sh -c "$command" 2> /dev/null &
	opid=$!
	start_time=$(date +%s)
	end_time=$((start_time + record_duration + 5))
	# Loop until process dies or time elapses
	while [ "$(date +%s)" -lt "$end_time" ]; do
    	# Check if the process is still alive
    		if ! kill -0 "$opid" 2>/dev/null; then
        		break
    		fi
    		sleep 1  # Check every second
	done

	# If the process is still alive after run_duration + 10, kill it
	if kill -0 "$opid" 2>/dev/null; then
		echo_warning "entered test loop for overrun"
    		kill -HUP "$opid" 2>/dev/null                              
    		end_time=$((end_time + 5))
    		while [ "$(date +%s)" -lt "$end_time" ]; do                                            
    			if ! kill -0 "$opid" 2>/dev/null; then                                              
				break
    			fi
   			sleep 1
   		done
		if kill -0 "$opid" 2>/dev/null; then
   			echo_warning "Time limit exceeded, killing process $opid."
    			kill -TERM "$opid" 2>/dev/null
		fi
	fi

	[ "true" = "$one_time" ] && rm $RECORD_FLAG
done

log "Cannot find recording flag $RECORD_FLAG"
[ -n "$LEDD_FLAG" ] && [ -f "$LEDD_FLAG" ] && rm $LEDD_FLAG
log "Exit"

exit 0
