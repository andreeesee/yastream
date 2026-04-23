#!/bin/sh
set -eu

echo "Starting container"
docker start yastream

echo "Waiting server to be ready"
sleep 3

echo "Running tests"
env $(cat ~/projects/yastream/.hurl/hurl.env | xargs) hurl --test --color .hurl/yastream/*.hurl

echo "Stopping container"
docker stop yastream