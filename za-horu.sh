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
	*)   		echo "unknown: " $KEY  " " $VALUE ;;
    esac    

done



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


function make_piece
{
	typeset -Z 2 -i minp=$3

#	echo "1"$1"\n2"$2"\n3"$3"\n4"$4"\n5"$5 "\n6"$6"\n7"$7"\n"
        echo -n "$1/$2/$minp.mp4"


	if [ "$3" -eq "$4" ]
	then
        	if [ -n "$6" ] ; then
			 echo -n "\ninpoint $6"
		fi
	fi
	if [ "$3" -eq "$5" ]
	then
     		if [ -n "$7" ] ; then 
			echo -n "\noutpoint $7" 
		fi
	fi

}

function switch_camera_dir
{
	cam=$1
	dday=$2
	if  [ "$1" = "1" ]
	then
		cd "$cwd/$dday"
	else
		cd "$cwd/$dday-$cam"
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
  typeset -i tpiece=0

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

    switch_camera_dir $cam $mdate
    pth=$(pwd)


  meta="params=ps:$spart;pe:$epart"
  ###echo "\n $spart \n"
  echo "$red"
  echo "###(START)###\n Hour: $hour \n  Start minute:  $stime \n End minute: $etime \n Label: $desc\n###(END)###"
  echo "$reest"
  let	COUNTER++
  db_insert $cam $mdate $hour $stime $etime $desc
  product="$clips/$mdate-$hour-$stime-$cam-event$COUNTER$desc.$format"
  echo -n "output file:"$product
  echo "\n"
  typeset -Z 2 -i minp=00
  for ((i = $stime; i <= $etime; i++)) 
  do
	echo $(make_piece $pth $hour $i $stime $etime "$spart" "$epart" )
  done


if [ -z  "$debug" ]
then
ffmpeg -hide_banner -y \
  -f concat \
  -safe 0 \
  -i <(  for ((i = $stime; i <= $etime; i++)) ; do echo "file "$(make_piece $pth $hour $i $stime $etime $spart $epart); done) \
  -movflags use_metadata_tags -metadata "$meta" \
  -c copy "$product" 

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
