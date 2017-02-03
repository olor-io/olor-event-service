
exports.up = function(knex, Promise) {
  return knex.schema.createTable('events', function(table) {

        // Index columns are sortable in the API
        table.bigIncrements('id').primary().index();
        table.string('name').notNullable().index();
        table.string('description').notNullable().index();
        table.dateTime('start_time').notNullable();
        table.integer('duration');
        table.integer('max_participant_amount').notNullable();
        table.integer('current_participant_amount').notNullable();
        table.string('coordinates').notNullable().index();
        table.dateTime('review_deadline_time').notNullable();
        table.string('creator_id').notNullable().index();
        table.string('admin_id').notNullable().index();
        table.integer('event_chat_id').notNullable();
        table.integer('category_id').notNullable().index();
        table.timestamp('created_at').index();
        table.timestamp('updated_at').index();

        // Foreign keys
        table.foreign('creator_id').references('user_events.user_id');
        table.foreign('admin_id').references('user_events.user_id');
    });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('events');
};
