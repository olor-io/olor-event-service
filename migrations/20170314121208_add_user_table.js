
exports.up = function(knex, Promise) {
    return knex.schema
    .createTableIfNotExists('users', function(table) {
        // Create users table
        table.string('user_id').notNullable().primary().index();
        table.decimal('lat', 14, 6).notNullable().index();
        table.decimal('long', 14, 6).notNullable().index();
        table.timestamp('created_at').index();
        table.timestamp('updated_at').index();
    })
};

exports.down = function(knex, Promise) {
    return knex.schema
    .dropTableIfExists('users');
};
