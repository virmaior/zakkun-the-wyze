#!/bin/zsh
cd /var/www/html

waits="5"
sname="za-mono-adv.sh"

start_cam()
{
	/bin/zsh /var/www/html/"$sname" cam="$1" >> /var/log/cam"$1"log 2>&1 &
	sleep "$waits"
}

start_cams()
{
	cams=(2 3 4 5 7 8 1)
	for cam in $cams; do
		start_cam "$cam"
	done
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
