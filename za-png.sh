#!/bin/zsh
. /var/www/html/za-common.sh
typeset -Z 2 min=0
typeset -Z 2 h=0


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
        d)              day=${VALUE} ;;
	h)		h=${VALUE};;
	cam)		cam=${VALUE};; 
	min)		min=${VALUE};;
	sec)		sec=${VALUE};;
	spt)		spt=${VALUE};;
       *)   
    esac    

done



if [ -z "$day" ]; then
 day=$(datediff -v-1H %Y%m%d ) 
fi


if [ -z "$spt" ]; then
	spt="_"
	echo "try new stream"

fi

if [ -d "$cwd/$day$spt$cam/$h" ]; then
   echo "used $spt stream"
   dcm="$day$spt$cam"
else
   echo "used old stream"
   spt="-"
   if [ "$cam" = "1" ]; then
    dcm=$day
  else
   dcm=$day$spt$cam
  fi
fi

echo  "source file: $dcm/$h/$min"

orf="captures/$dcm-$h-$min"
orfnum=97  # Start with Unicode code point for 'a' (97 in decimal)
orfe=""    # Initial suffix

# Loop until an unused filename is found
while [ -f "${orf}${orfe}.png" ]; do
    orfe=$(printf "\\$(printf '%o' $orfnum)")  # Convert code point to character
    orfnum=$((orfnum + 1))                     # Increment code point
done

echo "resolved to use ${orf}${orfe}.png filename"

makepng $dcm/$h/$min.mp4 "${orf}${orfe}.png" $sec

