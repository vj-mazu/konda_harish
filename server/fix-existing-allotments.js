/**
 * Fix Script: Update existing lot_allotments with allotted_bags from sample_entries
 * 
 * This fills in allotted_bags for lots that were created before the feature was added
 */

const { sequelize } = require('./config/database');

async function runFix() {
  try {
    console.log('🔄 Fixing existing lot_allotments...');
    
    // Update lot_allotments set allotted_bags = sample_entries.bags
    // where allotted_bags is NULL
    const [results] = await sequelize.query(`
      UPDATE lot_allotments 
      SET allotted_bags = (
        SELECT bags FROM sample_entries 
        WHERE sample_entries.id = lot_allotments.sample_entry_id
      )
      WHERE allotted_bags IS NULL
      RETURNING id, sample_entry_id, allotted_bags
    `);
    
    console.log(`✅ Updated ${results.length} lot_allotments with allotted_bags!`);
    
    if (results.length > 0) {
      console.log('Sample updates:', results.slice(0, 5));
    }
    
    // Verify remaining records
    const [nullCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM lot_allotments WHERE allotted_bags IS NULL
    `);
    
    console.log(`📊 Remaining lot_allotments without allotted_bags: ${nullCount[0].count}`);
    
    console.log('\n✅ Fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

runFix();
