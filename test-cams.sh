#!/bin/zsh

	typeset -Z 3 -i x
	
	cameras=("101" "102" "103" "104" "105")

	messages=()
	mismatch=0

	for cam in "${cameras[@]}"
	do
		message=$(wget -qO- "http://192.168.9.$cam/cgi-bin/status.cgi?test=recording" )
		if  [ -n "${lmessage+set}" ]; then
			if [[ "$message" != "$lmessage" ]]; then
		            ((mismatch++))
			fi 
		fi
	        messages+=("$cam - ${message//[$'\t\r\n ']}")
		lmessage="$message"
	done


	if [[ $mismatch -gt 0 ]]; then
		echo "at least one mismatch found"
		echo "Messages with mismatches:"
    		printf '%s\n' "${messages[@]}"
	else
		exit 0;
	fi

