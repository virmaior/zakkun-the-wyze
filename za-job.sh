#!/bin/zsh
. /var/www/html/za-common.sh

local -a lines
jtarget="miru"
if [[ -n "$1" ]]; then
	jtarget="$1"
fi

jtype="slow"
if [[ -n "$2" ]]; then
	jtype="$2"
fi

lines=( ${(f)"$(load_jobs "$jtarget" "$jtype")"} )

echo "$#lines Job Rows Queued Up for $jtarget"

for line in $lines; do
    # Split the current line by tabs into a temporary array
	local -a col=( ${(ps:\t:)line} )
 
    # Assign to descriptive variables (Zsh arrays are 1-indexed)
    local id=$col[1]
	local jtarget=$col[2]
    local params=$col[3]
	print "ID: $id | Params: $params | Target: $jtarget"
	update_job_status "$id" "started"
	echo "running $jtarget with " ${=params}
	if [[ "$jtarget" == "miru" ]]; then
		./za-miru.sh ${=params}
	elif [[ "$jtarget" == "harau" ]]; then
		./za-harau.sh ${=params}
	elif [[ "$jtarget" == "score" ]]; then
		python3 -m zk score ${=params}
	fi
	echo "finished job $jtarget"
	update_job_status "$id" "done"
done

exit