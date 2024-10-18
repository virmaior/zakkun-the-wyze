#! /bin/zsh

urldecode() {
	echo -n "$1" | python3 -c "import sys; from urllib.parse import unquote; print(unquote(sys.stdin.read()));"
}

declare -A param   
while IFS='=' read -r -d '&' key value && [[ -n "$key" ]]; do
    param["$key"]=$(urldecode $value)
done <<<"${QUERY_STRING}&"



function web_start() {
echo "Content-type: text/html"
echo ""
echo ""
}
