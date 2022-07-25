#!/bin/bash

yarn run start &
pid1=$!
yarn run start &
pid2=$!
yarn run start &
pid3=$!
yarn run start &
pid4=$!

wait $pid1
wait $pid2
wait $pid3
wait $pid4
