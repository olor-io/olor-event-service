
exports.up = function(knex, Promise) {
    return knex.schema.table('events', function(table) {
        table.decimal('lat', 14, 6).notNullable().index();
        table.decimal('long', 14, 6).notNullable().index();
        table.string('address');
    })
    .then(function removeColumn() {
        return knex.schema.table('events', function(table) {
            table.dropColumn('coordinates');
        });
    });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('events', function(table) {
      table.string('coordinates').notNullable().index();
  })
  .then(function removeEventColumns() {
      return knex.schema.table('events', function(table) {
          table.dropColumn('lat');
          table.dropColumn('long');
          table.dropColumn('address');
      });
  });
};
