#!/usr/bin/env zsh

typeset -i COUNTER=0
cwd=$(pwd) 
. /var/www/html/za-common.sh

digesting=$(check_live "za-digest-live")

setopt null_glob
colcount=$(tput cols)

if  [[ "$mode" == "web" ]]
then
perrow=8
else
perrow=$(( colcount / 12))
fi
i=0
max=20240101
IFS=" "

typeset -A result   # top level: date → sub-array


testcamdir()
{
  echo "Y"
}

for d in 202*; do
    [[ -d $d ]] || continue


    if [[ $d =~ '^(20[0-9]{6})([_-])?([1-9])?$' ]]; then

        cdate=${match[1]} 
	split=${match[2]}
        cam=${match[3]} 


        # Initialise sub-array for this date if needed
	   (( ${+result[$cdate]} )) || result[$cdate] = ()
	z=$(testcamdir "$cdate" "$split" "$cam")
	echo "$cdate $cam $z"
        result[$cdate][$cam]=$z
    fi
done


# 4. Print cleanly
print "Date       |   Status    "
for date in ${(k)result}; do
	print $result[$k]
done


for onedir in clips/2*/; do
    if (( i % perrow == 0 )); then
	do_newline
    fi
    (( i++ ))

    oneday=$(basename "$onedir")
    test=" N "
    color=$red

    # Use array and check length
    testday=(digests/digest-"$oneday"*.mp4)
    if (( ${#testday[@]} > 0 )); then

        test=" Y "
        color=$green
        if [[ "$digesting" = "$oneday" ]]; then
		test=" I "
		color=$blue
	else
		max="$oneday"
	fi

    fi

    printf "%b%s%s%b" "$color" "$oneday" "$test" "$reset"
done

printf "%s\n"
do_newline
echo "Processed but not uploaded:"
i=1
find clips/ -maxdepth 1  -type f -name "*.mkv" -printf "%f\n" | cut -c1-8 | sort -u | while IFS= read -r date; do  

  # Find the number of files matching the date pattern
    file_count=$(find clips/ -name "${date}*.mkv" | wc -l)    
    # Output the date and number of matching files

    printf "%s %s " $date $file_count
    if (( i % perrow == 0 )); then
        do_newline
    fi
    (( i++ ))
done


printf "%s\n" 
do_newline
printf "---"
do_newline
printf "$green Last Digested Day: $max $reset"
if  [[ "$digesting"  -gt 0 ]]; then
 do_newline
 printf "$blue Currently Digesting: $digesting $reset"
fi

do_newline
printf "Last Uploaded Day: $oneday"
do_newline
