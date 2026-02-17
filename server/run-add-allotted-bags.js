/**
 * Migration: Add allotted_bags column to lot_allotments table
 * 
 * This adds the ability to track partial lot allotments to supervisors
 */

const { sequelize } = require('./config/database');

async function runMigration() {
  try {
    console.log('🔄 Running migration: Add allotted_bags column...');
    
    // Check if column exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'lot_allotments' 
      AND column_name = 'allotted_bags'
    `);
    
    if (results.length > 0) {
      console.log('✅ Column allotted_bags already exists!');
    } else {
      // Add the column (PostgreSQL syntax)
      await sequelize.query(`
        ALTER TABLE lot_allotments 
        ADD COLUMN allotted_bags INTEGER
      `);
      console.log('✅ Column allotted_bags added successfully!');
    }
    
    // Note: Existing records will get their allotted_bags from the code when accessed
    // The PhysicalInspectionService already handles null allottedBags by falling back to entry.bags
    console.log('✅ Note: Existing records will default to total bags when accessed');
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
