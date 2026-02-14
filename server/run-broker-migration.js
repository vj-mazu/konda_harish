const { sequelize } = require('./config/database');
const migration = require('./migrations/83_create_brokers_table');

async function runMigration() {
  try {
    console.log('🔄 Running broker migration...');
    
    // Check if table already exists
    const [results] = await sequelize.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='brokers';
    `);
    
    if (results.length > 0) {
      console.log('✅ Brokers table already exists');
      process.exit(0);
    }
    
    // Run migration
    await migration.up(sequelize.getQueryInterface());
    
    console.log('✅ Broker migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
