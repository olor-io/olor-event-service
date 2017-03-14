#!/bin/bash

curl -X PUT -d @tools/json/edited-event.json -H "x-author-id: 23991888" -H "x-token: service" -H "Accept: application/json" -H "Content-Type: application/json" http://localhost:9000/api/v1/events/10
