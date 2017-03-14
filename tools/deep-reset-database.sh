#!/bin/bash

psql -a -f ./tools/drop-database.sql
psql -a -f ./tools/init-database.sql
knex migrate:latest
knex seed:run
