#!/bin/zsh

myos=$(uname)
cwd=$(pwd)
netmask=192.168.4
ffmpeg="/usr/local/bin/ffmpeg"
mode="console"
tpath="/var/www/html/tmp"


for ARGUMENT in "$@"
do

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    VALUE=$(echo $ARGUMENT | cut -f2 -d=)   

    case "$KEY" in
        mode)       mode=${VALUE} ;;
        *)   
    esac    

done

if [[ "$mode" == "web" ]] 
then 
red="<span style='color:red'>"
green="<span style='color:green'>"
blue="<span style='color:blue'>"
reset="</span>"
else 

# Predefine colors
red='\e[0;31m'
green='\e[0;32m'
reset='\e[0m'
blue='\e[0;34m'

fi 


function check_live
{
if [ -f "$tpath/$1" ]; then
 echo $(cat "$tpath/$1")
 exit 0
fi
 echo 0
 exit 0
}

function set_live
{
lname="$tpath/$1"
echo "$2"  >  "$lname"
chmod 644 "$lname"
}

function clear_live 
{
        rm "$tpath/$1"
}

function do_newline
{
  if  [[ "$mode" == "web" ]]
  then
	echo "<Br />"
 else
	echo "" 
 fi
}


function datediff
{
 if [[ "$myos" == "Darwin" ]]
 then
        echo $(date $1 +$2)
 else
        if [[ "$1" == "-v-1H" ]]; then
                echo $(date --date="1 hour ago" \+"$2")
        elif [[ "$1" == "-v-1d" ]]; then
                echo $(date --date="yesterday" \+"$2")
        else
                exit -1
        fi
 fi 
}

function makepng
{
  $ffmpeg -hide_banner -loglevel error -ss 00:00:$3 -i $1 -q:v 2 -frames:v 1 $2
}

