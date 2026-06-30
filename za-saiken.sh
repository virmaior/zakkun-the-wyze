#!/bin/zsh
typeset -Z 2 -i COUNTER=0
. /var/www/html/za-common.sh
cd /var/www/html


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
        capcount)       capcount=${VALUE} ;;
        d)              day=${VALUE} ;;     
        s)              s_hour=${VALUE} ;;     
        e)              e_hour=${VALUE} ;;
        skipcap)        skipcap=${VALUE} ;;     
        skiphtml)       skiphtml=${VALUE} ;;
        *)   
    esac    
done

exit_msg()
{
    echo "must set $1"
    exit;
}


if [ -z "$day" ]; then
    exit_msg "day"
fi

if [ -z "$s_hour" ]; then
    exit_msg "start hour (s_hour)"
fi

if [ -z "$e_hour" ]; then
    exit_msg "end hour (e_hour)"
fi

for c in 1 2 3 4 5 7; do
	zsh za-toru.sh scp=9 cam="$c" d="$day" s="$s_hour" e="$e_hour" m=y
done
