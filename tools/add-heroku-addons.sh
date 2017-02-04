#!/bin/bash

heroku addons:create --app k-rating-prod papertrail
heroku addons:create --app k-rating-prod heroku-postgresql
heroku addons:create --app k-rating-prod newrelic
heroku addons:create --app k-rating-prod heroku-redis
