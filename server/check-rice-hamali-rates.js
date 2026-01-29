/**
 * Diagnostic Script - Check Rice Hamali Rates in Production
 * 
 * This script checks if rates exist in the database and what values they have
 * 
 * Usage: node check-rice-hamali-rates.js
 */

const { sequelize } = require('./config/database');

async function checkRates() {
  console.log('🔍 Checking Rice Hamali Rates in Database...');
  console.log('='.repeat(60));
  
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');
    console.log('');
    
    // Check if table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'rice_hamali_rates'
    `);
    
    if (tables.length === 0) {
      console.error('❌ ERROR: rice_hamali_rates table does NOT exist!');
      console.log('');
      console.log('Solution: Run table creation migration first');
      await sequelize.close();
      process.exit(1);
    }
    
    console.log('✅ rice_hamali_rates table exists');
    console.log('');
    
    // Count total rates
    const [countResult] = await sequelize.query('SELECT COUNT(*) as count FROM rice_hamali_rates');
    const totalCount = countResult[0].count;
    
    console.log(`📊 Total rates in database: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('');
      console.error('❌ ERROR: Database is EMPTY! No rates found.');
      console.log('');
      console.log('Solution: Run Migration 37 to seed the database');
      console.log('Command: node run-migration-37.js');
      await sequelize.close();
      process.exit(1);
    }
    
    console.log('');
    
    // Check for NULL or 0 values in rate_24_27
    const [nullRates] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM rice_hamali_rates 
      WHERE rate_24_27 IS NULL OR rate_24_27 = 0
    `);
    
    if (nullRates[0].count > 0) {
      console.error(`❌ ERROR: ${nullRates[0].count} rates have NULL or 0 values in rate_24_27!`);
      console.log('');
      console.log('Solution: Run Migration 37 to fix the rates');
      console.log('Command: node run-migration-37.js');
    } else {
      console.log('✅ All rates have valid rate_24_27 values (not NULL or 0)');
    }
    
    console.log('');
    
    // Show sample rates
    console.log('📋 Sample rates from database:');
    console.log('-'.repeat(60));
    
    const [sampleRates] = await sequelize.query(`
      SELECT 
        id,
        work_type,
        work_detail,
        rate_18_21,
        rate_21_24,
        rate_24_27,
        is_active,
        display_order
      FROM rice_hamali_rates 
      ORDER BY display_order ASC, id ASC
      LIMIT 10
    `);
    
    sampleRates.forEach(rate => {
      console.log(`ID: ${rate.id}`);
      console.log(`  Work Type: ${rate.work_type}`);
      console.log(`  Work Detail: ${rate.work_detail}`);
      console.log(`  rate_18_21: ${rate.rate_18_21}`);
      console.log(`  rate_21_24: ${rate.rate_21_24}`);
      console.log(`  rate_24_27: ${rate.rate_24_27} ${rate.rate_24_27 ? '✅' : '❌'}`);
      console.log(`  is_active: ${rate.is_active}`);
      console.log(`  display_order: ${rate.display_order}`);
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log('');
    
    // Summary
    if (totalCount === 80 && nullRates[0].count === 0) {
      console.log('✅ DATABASE IS CORRECT!');
      console.log('');
      console.log('If frontend still shows ₹NaN, the issue is:');
      console.log('1. Frontend cache - Clear browser cache (Ctrl+Shift+Delete)');
      console.log('2. API not returning data - Check API endpoint');
      console.log('3. Frontend code not deployed - Rebuild and redeploy frontend');
    } else {
      console.log('❌ DATABASE NEEDS FIXING!');
      console.log('');
      console.log('Run this command to fix:');
      console.log('  node run-migration-37.js');
    }
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('');
    console.error('❌ Error checking rates:', error);
    console.error('');
    console.error('Error details:', error.message);
    
    try {
      await sequelize.close();
    } catch (e) {}
    
    process.exit(1);
  }
}

checkRates();
