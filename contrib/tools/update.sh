#!/bin/sh -e
# vim: ts=4 sw=4 et


# ---  V A R I A B L E S  --- #

SCRIPT_NAME=$(basename "$0")


# ---  S U B R O U T I N E S  --- #

print_help_message_and_exit() {
    cat << EOM
usage: $SCRIPT_NAME [-h]
       $SCRIPT_NAME  -f
       $SCRIPT_NAME [-f] [-b] <cntnr>
       $SCRIPT_NAME [-f]  -r 

Cleanly rebuilds the Docker image of a container and restarts all containers.

options:
  -b        do not restart containers; only rebuild Docker image
  -f        fetches new commits and resets (--hard !) to origin/xce
  -h        show this help message
  -r        do not rebuild Docker imags; only restart containers

positional arguments:
  cntnr     name of the container whose image should be rebuilt
EOM
    exit
}


# ---  M A I N   S C R I P T  --- #

# Parse commnand line
fetch=no
rebuild=yes
reboot=yes
while getopts "fbhr" option; do    
    case $option in    
        b) reboot=no ;;
        f) fetch=yes ;;
        r) rebuild=no ;;
        *) print_help_message_and_exit ;;
    esac    
done    
shift $((OPTIND - 1))

CONTAINER=$1
if [ -z "$CONTAINER" ] && [ "$rebuild" = 'yes' ]; then
    print_help_message_and_exit
fi

# Fetch
if [ "$fetch" = 'yes' ]; then
    git fetch
    git reset --hard origin/xce
fi

# Rebuild
if [ -n "$CONTAINER" ] && [ "$rebuild" = 'yes' ]; then
    docker system prune -f
    docker-compose build --no-cache "$CONTAINER"
fi
if [ "$reboot" = 'yes' ]; then
    docker-compose down
    docker-compose up -d
fi
