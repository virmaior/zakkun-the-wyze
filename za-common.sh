#!/bin/zsh

myos=$(uname)
cwd=$(pwd)
netmask=192.168.4
ffmpeg="/usr/bin/ffmpeg"
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


function queue_job() 
{
	local jtype="$1"
	local jtarget="$2"
	local params="$3"
	local state="${4:-queued}"
	local await_id="${5:-0}"

    local sql="
        INSERT INTO jobs (jtype, jtarget, params, status, await_id)
        VALUES ('${jtype}', '${jtarget}', '${params}', '${state}','${await_id}')
        RETURNING id;
    "
  
    local id
    id=$(sqlite3 "$cwd/zk.sqlite3" "$sql" 2>&1)

    if [[ $? -eq 0 && -n "$id" ]]; then
        echo "$id"          # This is what the function "returns"
        return 0
    else
        echo "Error inserting job: $id" >&2
        echo ""             # return empty on error
        return 1
    fi
}

function update_job_status()
{
        local id="$1"
        local state="$2"
        local sql="UPDATE jobs SET status='${state}' WHERE id = ${id}"
        sqlite3 "$cwd/zk.sqlite3" "$sql" 2>&1
}

function load_jobs()
{
    local jtarget="$1"
    local jtype="${2:-fast}"

     sqlite3 -batch -separator $'\t' -nullvalue "" zk.sqlite3 "
        SELECT j1.id,  j1.jtarget , j1.params
        FROM jobs j1 LEFT JOIN jobs j2 ON j2.id = j1.await_id 
        WHERE j1.jtarget = '${jtarget}' AND j1.status = 'queued' AND j1.jtype = '${jtype}' AND j2.status = 'done' 
        ORDER BY j1.id ASC"   
}

function insert_cam_run()
{
    local camnum="$1"
    local runpid="$2"
    local id
    local sql
    local exit_code

    #  '.timeout 5000' to wait up to 5 seconds if the DB is locked
    sql="
        .timeout 5000
        INSERT INTO cam_run (cam, pid)
        VALUES ('${camnum}', '${runpid}')
        RETURNING id;
    "
  
    id=$(sqlite3 "$cwd/zk.sqlite3" "$sql" 2>&1 </dev/null)
    exit_code=$?

    if [[ $exit_code -eq 0 && -n "$id" && ! "$id" =~ "Error" ]]; then
        echo "$id"          
        return 0
    else
        echo "Error inserting job for Cam $camnum: $id" >&2
        echo ""             
        return 1
    fi
}

function update_cam_run()
{
    local cam_run_id="$1"
    local run_count="$2"
    local run_state="$3"
     sqlite3 -batch -separator $'\t' -nullvalue "" zk.sqlite3 "
        UPDATE cam_run
        SET run_count=${run_count},
            status='${run_state}'
        WHERE  id=${cam_run_id};"
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



function folder_tsukamu
{
	cd "$tgtd"
	cd "$1"
	echo -n "start $1 - minute: "
for i in *.mp4
do 
  	name=`echo "$i" | cut -d'.' -f1`
  	echo -n " $name "
	typeset -Z 3 -i smallcounter=0
	ffmap=""
	for ((seconds =00; seconds <= 59; seconds= seconds + capjump))
	do
		let smallcounter++
		((mapnum=$smallcounter -1))
		ffmap="$ffmap "'-ss 00:00:'$seconds'.00 -i '$i' -frames:v 1 -f image2 -map '$mapnum':v:0 screen'$name'-'$smallcounter'.jpg'
	done

	#overwrite $ffmap
	$ffmpeg -hide_banner -loglevel error $(echo $ffmap) 
done
	echo " done $1 "
	cd $cwd

}
