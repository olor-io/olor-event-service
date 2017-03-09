#!/bin/bash

id=$1
curl -X DELETE -d "{ \"id\": $id }" -H "x-author-id: 23991888" -H "x-token: service" -H "Accept: application/json" -H "Content-Type: application/json" http://localhost:9000/api/v1/events/$id
