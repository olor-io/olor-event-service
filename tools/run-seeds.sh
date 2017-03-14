#!/bin/bash
# NOTE: Run this only from project root!

if [[ $NODE_ENV == 'production' ]]
then
    echo -e '\n -- Running seeds\n'
    npm install -g knex
    DEBUG=knex knex seed:run
    echo -e '\n -- End of seeds\n'
else
    echo 'Skip seeds. NODE_ENV != production'
fi
