#!/usr/bin/env zsh
# vim: ft=zsh

# =============================================================================
#   PURPOSE:
#   - Group files by day (YYYYMMDD from filename prefix)
#   - Build status string: D = .done, T = .tmp
#   - Append 'F' **only** if:
#       • there is a file from hour 23
#       • AND no .tmp files appeared for the entire day
#   - Output rm -rf commands for days that qualify
# =============================================================================

setopt LOCAL_OPTIONS NO_NOMATCH WARN_CREATE_GLOBAL

# ──── Source common library (if it exists) ───────────────────────────────────
[[ -f /var/www/html/za-common.sh ]] && . /var/www/html/za-common.sh

# ──── Change to working directory ────────────────────────────────────────────
if ! cd /var/www/html/tmp 2>/dev/null; then
    print -u2 "Error: cannot cd to /var/www/html/tmp"
    exit 2
fi

# ──── Helper functions ───────────────────────────────────────────────────────

get_file_type() {
    local filename=$1
    local ext=${filename##*.}
    [[ $ext == tmp ]] && echo "T" || echo "D"
}

# ──── Main processing ────────────────────────────────────────────────────────

typeset -A day_status         # day → status string (D/T/F)
typeset -A cleanup_commands   # day → rm command (only for qualifying days)

local current_day=""
local current_str=""
local saw_tmp=false

for file in *.(done|tmp)(N); do
    # Extract day prefix (assumes format: YYYYMMDD_...)
    local day=${file:0:8}

    # New day started → save previous day's result & reset
    if [[ -n $current_day && $current_day != $day ]]; then
        day_status[$current_day]=$current_str
        current_str=""
        saw_tmp=false
    fi


    current_day=$day

    # Extract hour (assumes positions 9-10 are HH)
    local hour=${file:9:2}

    local file_status="P"
    file_status=$(get_file_type "$file")
  current_str+="$file_status"


    # Track if we ever saw a .tmp file for this day
    [[ $file_status == "T" ]] && saw_tmp=true

    # Only add 'F' marker if this is hour 23 AND we haven't seen any tmp yet
    if [[ $hour == "23" && $saw_tmp == false ]]; then
        current_str+='F'
    fi
done

# Save the very last day (if any files were processed)
[[ -n $current_str ]] && day_status[$current_day]=$current_str

# ──── Analyze results & build cleanup commands ───────────────────────────────

for day in "${(@k)day_status}"; do
    local statuses=${day_status[$day]}
    local last_char=${statuses[-1]}

    # Print status for visibility / debugging
    print -P "%F{cyan}$day%f → %B$statuses%b"

    # Qualifies for cleanup only if string ends with 'F'
    if [[ $last_char == "F" ]]; then
        cleanup_commands[$day]="rm -rf -- \"./${day}\"*"
    fi
done

# ──── Output cleanup commands ────────────────────────────────────────────────

if (( ${#cleanup_commands} > 0 )); then
    print -P "\n%B%F{yellow}Days eligible for cleanup "
    print -P "(hour 23 present + NO .tmp files seen):%f%b\n"

    for day in "${(@kon)cleanup_commands}"; do  # sorted numerically
        print -P "  %F{red}→%f  ${cleanup_commands[$day]}"
    done

    print ""
    print -P "%F{8}Review carefully before running these commands.%f"
    print -P "%F{8}Consider dry-run first (replace rm with echo).%f"
else
    print -P "\n%F{green}No days qualify for cleanup "
    print -P "(no day had hour 23 without any .tmp files).%f"
fi
