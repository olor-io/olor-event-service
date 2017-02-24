#!/bin/bash

heroku addons:create --app community-events papertrail
heroku addons:create --app community-events heroku-postgresql
heroku addons:create --app community-events newrelic
heroku addons:create --app community-events heroku-redis
