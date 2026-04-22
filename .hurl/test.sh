#!/bin/sh
set -eu

echo "Starting container"
docker start yastream

echo "Waiting server to be ready"
sleep 3

echo "Running tests"
hurl --test --color --variable HOST=http://localhost:55913 --variable CONFIG=eyJjYXRhbG9ncyI6WyJraXNza2guc2VyaWVzLktvcmVhbiIsIm9uZXRvdWNodHYuc2VyaWVzLktvcmVhbiIsImtpc3NraC5zZXJpZXMuU2VhcmNoIiwia2lzc2toLm1vdmllLlNlYXJjaCIsIm9uZXRvdWNodHYuc2VyaWVzLlNlYXJjaCIsImlkcmFtYS5zZXJpZXMuaURyYW1hIiwiaWRyYW1hLnNlcmllcy5TZWFyY2giXSwiY2F0YWxvZyI6WyJraXNza2giLCJvbmV0b3VjaHR2Il0sInN0cmVhbSI6WyJraXNza2giLCJvbmV0b3VjaHR2Il0sInBvc3RlciI6ImVyZGIiLCJuc2Z3IjpmYWxzZSwiaW5mbyI6dHJ1ZX0= .hurl/yastream/*.hurl

echo "Stopping container"
docker stop yastream