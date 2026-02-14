/**
 * Run offering price migration
 */

const { sequelize } = require('./config/database');
const migration = require('./migrations/86_add_offering_price_to_sample_entries');

async function runMigration() {
  try {
    console.log('Starting offering price migration...');
    
    await migration.up(sequelize.getQueryInterface());
    
    console.log('✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
