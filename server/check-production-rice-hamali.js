/**
 * Production Diagnostic Script - Rice Hamali Rates
 * 
 * This script checks the current state of rice_hamali_rates table
 * and helps diagnose why production shows ₹NaN
 * 
 * Usage:
 *   node check-production-rice-hamali.js
 */

const { sequelize } = require('./config/database');

async function checkProductionStatus() {
  console.log('🔍 Checking Production Rice Hamali Rates Status...');
  console.log('');

  try {
    // Check database connection
    await sequelize.authenticate();
    console.log('✅ Database connection: OK');
    console.log('');

    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'rice_hamali_rates'
    `);

    if (tables.length === 0) {
      console.log('❌ Table "rice_hamali_rates" does NOT exist');
      console.log('');
      console.log('Solution: Run table creation migration first');
      process.exit(1);
    }

    console.log('✅ Table "rice_hamali_rates": EXISTS');
    console.log('');

    // Check total count
    const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM rice_hamali_rates');
    const totalCount = countResult[0].count;

    console.log(`📊 Total rates in database: ${totalCount}`);
    console.log('   Expected: 80');
    console.log('');

    if (totalCount === 0) {
      console.log('❌ Database is EMPTY - This is why you see ₹NaN!');
      console.log('');
      console.log('Solution: Run Migration 37 to seed the database');
      console.log('   Option 1: Restart production server (automatic)');
      console.log('   Option 2: Run: node run-migration-37.js');
      console.log('');
      process.exit(1);
    }

    // Check for NULL values in rate_24_27
    const [nullResult] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM rice_hamali_rates 
      WHERE rate_24_27 IS NULL OR rate_24_27 = 0
    `);
    const nullCount = nullResult[0].count;

    if (nullCount > 0) {
      console.log(`⚠️ Found ${nullCount} rates with NULL or 0 values in rate_24_27`);
      console.log('   This will cause ₹NaN errors!');
      console.log('');
      console.log('Solution: Run Migration 37 to fix the data');
      console.log('   Run: node run-migration-37.js');
      console.log('');
    } else {
      console.log('✅ All rates have valid rate_24_27 values');
      console.log('');
    }

    // Show sample rates
    console.log('📋 Sample rates from database:');
    console.log('');
    const [sampleRates] = await sequelize.query(`
      SELECT work_type, work_detail, rate_24_27, display_order
      FROM rice_hamali_rates
      ORDER BY display_order
      LIMIT 10
    `);

    console.log('work_type'.padEnd(20) + 'work_detail'.padEnd(30) + 'rate_24_27');
    console.log('-'.repeat(60));
    sampleRates.forEach(rate => {
      console.log(
        rate.work_type.padEnd(20) + 
        rate.work_detail.padEnd(30) + 
        `₹${rate.rate_24_27}`
      );
    });
    console.log('');

    // Check for old rate columns (rate_18_21, rate_21_24)
    const [oldRatesResult] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM rice_hamali_rates 
      WHERE rate_18_21 > 0 OR rate_21_24 > 0
    `);
    const oldRatesCount = oldRatesResult[0].count;

    if (oldRatesCount > 0) {
      console.log(`⚠️ Found ${oldRatesCount} rates with old rate_18_21 or rate_21_24 values`);
      console.log('   These columns should be 0 (we only use rate_24_27 now)');
      console.log('');
      console.log('Solution: Run Migration 37 to clean up old data');
      console.log('');
    }

    // Final diagnosis
    console.log('🎯 Diagnosis:');
    console.log('');

    if (totalCount === 80 && nullCount === 0) {
      console.log('✅ Database is PERFECT!');
      console.log('   - 80 rates seeded');
      console.log('   - All rate_24_27 values are valid');
      console.log('   - Production should work correctly');
      console.log('');
      console.log('If you still see ₹NaN in production:');
      console.log('   1. Clear browser cache (Ctrl+Shift+Delete)');
      console.log('   2. Hard refresh (Ctrl+F5)');
      console.log('   3. Check browser console for errors');
      console.log('   4. Verify API endpoint returns correct data');
    } else if (totalCount === 0) {
      console.log('❌ Database is EMPTY');
      console.log('   This is why production shows ₹NaN');
      console.log('');
      console.log('Next steps:');
      console.log('   1. Run: node run-migration-37.js');
      console.log('   2. Restart production server');
      console.log('   3. Test production - should show actual rates');
    } else if (nullCount > 0) {
      console.log('⚠️ Database has INVALID data');
      console.log(`   ${nullCount} rates have NULL or 0 values`);
      console.log('');
      console.log('Next steps:');
      console.log('   1. Run: node run-migration-37.js');
      console.log('   2. Restart production server');
      console.log('   3. Test production - should show actual rates');
    } else {
      console.log('⚠️ Database has INCOMPLETE data');
      console.log(`   Expected 80 rates, found ${totalCount}`);
      console.log('');
      console.log('Next steps:');
      console.log('   1. Run: node run-migration-37.js');
      console.log('   2. Restart production server');
      console.log('   3. Test production - should show actual rates');
    }

    console.log('');
    process.exit(0);

  } catch (error) {
    console.error('');
    console.error('❌ Error checking production status:', error);
    console.error('');
    console.error('Error details:', error.message);
    console.error('');
    console.error('Please check:');
    console.error('1. Database connection is working');
    console.error('2. Database credentials are correct');
    console.error('3. Network/firewall allows database access');
    console.error('');
    process.exit(1);
  }
}

// Run the diagnostic
checkProductionStatus();
