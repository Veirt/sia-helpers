#!/bin/sh

echo "Starting server..."
/app/server &

echo "Starting khs_monitor..."
/app/khs_monitor &

wait

