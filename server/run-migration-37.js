/**
 * Standalone script to run Migration 37 - Rice Hamali Rates Fix
 * 
 * This script can be run manually on production to seed rice hamali rates
 * 
 * Usage:
 *   node run-migration-37.js
 */

const { sequelize } = require('./config/database');
const migration37 = require('./migrations/37_fix_rice_hamali_rates_from_images');

async function runMigration() {
  console.log('🚀 Starting Migration 37 - Rice Hamali Rates Fix...');
  console.log('');

  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    console.log('');

    // Run migration
    await migration37.up();
    
    console.log('');
    console.log('🎉 Migration 37 completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart your production server');
    console.log('2. Test Rice Hamali dropdown - should show actual rates (₹1.54, ₹2.26, etc.)');
    console.log('3. Verify no ₹NaN errors');
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Migration 37 failed:', error);
    console.error('');
    console.error('Error details:', error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. Database connection is working');
    console.error('2. rice_hamali_rates table exists');
    console.error('3. Database user has INSERT permissions');
    
    process.exit(1);
  }
}

// Run the migration
runMigration();
