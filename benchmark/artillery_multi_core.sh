#!/bin/bash

npm run start &
pid1=$!
npm run start:nooutput &
pid2=$!
npm run start:nooutput &
pid3=$!
npm run start:nooutput &
pid4=$!

wait $pid1
wait $pid2
wait $pid3
wait $pid4


