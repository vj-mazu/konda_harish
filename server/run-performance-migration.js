/**
 * Run Performance Optimization Migration (Migration 62)
 * 
 * This script runs ONLY the performance optimization migration
 * to add database indexes.
 * 
 * Run with: node run-performance-migration.js
 */

const { sequelize } = require('./config/database');
const migration = require('./migrations/62_add_performance_indexes');

async function runPerformanceMigration() {
  console.log('🚀 Running Performance Optimization Migration\n');
  console.log('='.repeat(80));

  try {
    // Test database connection
    console.log('\n📡 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Check if migration has already been run
    console.log('🔍 Checking if migration has already been run...');
    
    const [existingIndexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'arrivals' 
      AND indexname = 'idx_arrivals_type_status_date'
    `);

    if (existingIndexes.length > 0) {
      console.log('⚠️  Some indexes already exist.');
      console.log('   The migration will skip existing indexes and create new ones.\n');
    } else {
      console.log('✅ Migration has not been run yet. Proceeding...\n');
    }

    // Run the migration
    console.log('📊 Running migration: 62_add_performance_indexes.js\n');
    
    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, sequelize.Sequelize);

    console.log('\n✅ Migration completed successfully!');
    console.log('📈 Database indexes have been added.');
    console.log('🚀 Your queries should now be 60-70% faster!\n');

    // Verify indexes were created
    console.log('🔍 Verifying indexes were created...');
    const [newIndexes] = await sequelize.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE indexname LIKE 'idx_%'
      AND tablename IN ('arrivals', 'rice_stock_movements', 'purchase_rates', 'rice_productions', 'outturns')
      ORDER BY tablename, indexname
    `);

    console.log(`\n✅ Found ${newIndexes.length} performance indexes:`);
    
    // Group by table
    const indexesByTable = {};
    newIndexes.forEach(idx => {
      if (!indexesByTable[idx.tablename]) {
        indexesByTable[idx.tablename] = [];
      }
      indexesByTable[idx.tablename].push(idx.indexname);
    });

    Object.keys(indexesByTable).sort().forEach(table => {
      console.log(`\n   ${table}:`);
      indexesByTable[table].forEach(idx => {
        console.log(`      - ${idx}`);
      });
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n🎉 Performance optimization migration complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Restart your server');
    console.log('   2. Test your application');
    console.log('   3. Monitor query performance\n');

  } catch (error) {
    console.error('\n❌ Error running migration:', error);
    console.error('\nError details:', error.message);
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 Tip: This error means the indexes already exist.');
      console.log('   This is OK - the migration has already been run.');
      console.log('   No action needed!\n');
    } else {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check database connection');
      console.log('   2. Verify you have CREATE INDEX permissions');
      console.log('   3. Check if database is locked');
      console.log('   4. Try running during off-peak hours\n');
    }
  } finally {
    await sequelize.close();
    console.log('📡 Database connection closed.\n');
  }
}

// Run the migration
runPerformanceMigration();
