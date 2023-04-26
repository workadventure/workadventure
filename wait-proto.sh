#!/bin/bash

file=/usr/src/app/libs/messages/src/ts-proto-generated/messages.ts
timeout=120
SECONDS=0

until [ -s "$file" ] || (( SECONDS >= timeout ))
do
    sleep 1
done

[ -s "$file" ] || exit 1
