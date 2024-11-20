#!/usr/bin/env bash
set -eu -o pipefail


# ---  V A R I A B L E S  --- #

SCRIPT_NAME=$(basename "$0")



# ---  S U B R O U T I N E S  --- #

print_help_message_and_exit() {
    cat << EOM
usage: $SCRIPT_NAME -h
       $SCRIPT_NAME [-t <secs>] [-u <user>]

Computes TURN static auth credentials.

options:
  -h        show this help message
  -t <secs> TTL for generated credentials in seconds (default: 1800)
  -u <user> user name (arbitrary, default: testy-mc-testface)
EOM
    exit
}



# ---  M A I N   S C R I P T  --- #

ttl=$((30 * 60))
user="testy-mc-testface"
while getopts "ht:u:" option; do
    case $option in
        t) ttl=$OPTARG ;;
        u) user=$OPTARG ;;
        *) print_help_message_and_exit
    esac
done
shift $((OPTIND - 1))

if ! command -v openssl >/dev/null; then
    echo 'Could not find openssl executable'
    exit 1
fi

read -p "Enter TURN static auth secret: " -rs secret
echo
now=$(date +%s)
timestamp=$((now + ttl))
username="$timestamp:$user"
password=$(echo -n "$username" | openssl sha1 -hmac "$secret" -binary | base64)

echo
echo "To test your TURN server, enter its URI and the following credentials at"
echo "https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/"
echo "URI format:   turns:<FQDN>:<port>"
echo "Username:     $username"
echo "Password:     $password"
echo "These credentials are valid until $(date --date=@$timestamp +'%Y-%m-%d %H:%M:%S')"
