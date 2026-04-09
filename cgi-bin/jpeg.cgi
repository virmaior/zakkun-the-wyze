#!/bin/bash

#set -x 


#test for jpeg
if [[ "$REQUEST_METHOD" = "GET" ]]
then

declare -A param   
while IFS='=' read -r -d '&' key value && [[ -n "$key" ]]; do
    param["$key"]=$value
done <<<"${QUERY_STRING}&"

fi

if [ -v param["cam"] ]
then
#  echo "Cam-Number: 0"
  cam=${param['cam']}
else
  cam="101"
fi

#echo "X-Channel: $GET_channel"
#echo -e "\r\n"

#echo -e "content-type: text/html \r\n"
#echo " "
#echo -e "attempted load"
#echo $cam
#echo $QUERY_STRING
#echo $REQUEST_METHOD
#if [[ "$REQUEST_METHOD" = "GET" ]]
#then
#	echo "yes"
#fi


#exit

echo -e "Content-type: image/jpeg \r\n"
#echo -e "Content-type: image/jpeg "
#echo -e "Content-length: 100000 \r\n"

wget -qO- http://root:C3mera1@192.168.9.$cam/x/image.cgi

#wget -qO- http://root:C3mera1@192.168.9.$cam/x/tool-file-manager.cgi?dl=/tmp/snapshot.jpg
#wget -qO-  http://192.168.9.$cam/cgi-bin/jpeg.cgi?channel=0
