#!/bin/zsh
cd /var/www/html

waits="5"
#sname="za-mono.sh"
sname="za-mono-adv.sh"


start_cam()
{
	/bin/zsh /var/www/html/"$sname" cam="$1" >> /var/log/cam"$1"log 2>&1 &
	sleep "$waits"
}

start_cams()
{
	start_cam 2
	start_cam 3
	start_cam 4
	start_cam 5
	start_cam 7
	start_cam 8

	start_cam 1
}

stop_all()
{
	find /var/www/html/tmp/ -maxdepth 1 -name "record-*" -delete
}

case "$1" in
	start)
		start_cams
		;;
	stop)  stop_all
		;;

	restart)
		stop_all
		sleep "$waits"
		start_cams
		;;
	*)
		usage "{start|stop|restart}"
		;;
esac

exit 0
