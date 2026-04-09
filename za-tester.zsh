#!/bin/zsh

. /var/www/html/za-common.sh


declare -A result


color_ynp() {
    local input="$1"
    # Use zsh parameter expansion to replace:
    #   Y → green, N → red, P → magenta
    local colored="${input//Y/\e[32mY}"
    colored="${colored//N/\e[31mN}"
    colored="${colored//P/\e[35mP}"
    print -r -- "$colored"'\e[0m'
}

testcamdir()
{
  local cdate=$1     # YYYYMMDD
  local split=$2     # Separator (e.g., "_" or "-")
  local cam_index=$3 # Camera index (e.g., "1" or "")

   local base_dir="${cdate}${split}${cam_index}"
   local result_string=""


   for hour in {00..23}; do
     local hour_dir="$base_dir/$hour"



     if [[ -d "$hour_dir" ]]; then
       # Globbing:
       # (N): Null_glob (removes the glob if no matches)
       # (L+1): File size must be greater than 0 bytes
       local mp4_files=("$hour_dir"/[0-5][0-9].mp4(N.L+1))
       local found_count=${#mp4_files}

       if [[ $found_count -eq 60 ]]; then
         result_string+="Y" # YES: All 60 files exist and are > 0 bytes
       elif [[ $found_count -gt 0 ]]; then
         result_string+="P" # PARTIAL: Some files exist and are > 0 bytes
       else
         result_string+="N" # NONE: Directory exists, but no valid files
       fi
     else
       result_string+="N" # NONE: Hour directory doesn't exist
     fi
   done
   echo "$result_string"
  
}


for d in 20*; do
    # 1. Date (YYYYMMDD): group 1
    # 2. Suffix (_N or -N): group 2 (optional)
    if [[ $d =~ '^(20[0-9]{6})([_-][1-9])?$' ]]; then

        cdate=${match[1]}      # YYYYMMDD date
        local suffix=${match[2]} # Optional: e.g., "_1" or "-5"

        local split=""         # Separator ('_' or '-')
        local cam=""           # Camera/Digit (1-9)

        if [[ -n "$suffix" ]]; then
            # *** ROBUST FIX: Substring Expansion (immune to KSH_ARRAYS) ***
            split=${suffix:0:1} # Start at offset 0, length 1 (Separator)
            cam=${suffix:1:1}   # Start at offset 1, length 1 (Digit)
        fi

        # Determine the index key for the array. Use '0' for the base date.
        local index=${cam:-1}
        z=$(testcamdir "$cdate" "$split" "$cam")

     #   echo "Processing $d (MATCHED):"
     #   echo "  Date: $cdate | Separator: ${split:-None} | Cam/Split: ${cam:-None} | Function Result: $z"

	if [ "$split" = "" ];  then
		split="-"
	fi

        result["${cdate}cam$index$split"]=$z
    else
      #  echo "Skipping $d (NO MATCH)"
    fi
done


res2=(${(ko)result})

echo ""
for key in "${(@k)res2}"; do
	# 20251108cam8_
   if [[ "$key" =~ (20[0-9]{6}cam[1-9])(_) ]] ; then
     local skey='"'"$match[1]-"'"'
     local uval=$result[$key]
     local colout=$(color_ynp "$uval" )
     local dashval=$result[$skey]
        if [[ "$dashval" == "" ]]; then
                dashval=" NO - Camera"
        fi
     local scolout=$(color_ynp "$dashval")
     local go=1
     if [[ "$uval" == "YYYYYYYYYNNNNNNNNNPYYYYY" ]]; then; go=0; fi;
     if [[ "$uval" == "YYYYYYYYNNNNNNNNNNPYYYYY" ]]; then; go=0; fi;
     if [[ "$uval" == "YYYYYYNNNNNNNNNNNNYYYYYY" ]]; then; go=0; fi;
     if [[ "$uval" == "YYYYYYYYYNNNNNNNPYYYYYYY" ]]; then; go=0; fi;

     if [[ "$go" == "1" ]]; then
     #                 012345678901234567890123"
     	echo "Key: $key | Value: $colout $scolout"
	else 
#		echo "skip"
	fi
   fi

done



echo " - only days for a camera "
for key in "${(@k)res2}"; do
        # 20251108cam8_
   if [[ "$key" =~ (20[0-9]{6}cam[1-9])(-) ]] ; then
     local skey='"'"$match[1]_"'"'

	if [[ $result[$skey] == "" ]]; then
	 	local    colout=$(color_ynp "${result[$key]}" )
     		echo "Key: $key | Value: $colout"
   	fi
fi

done

