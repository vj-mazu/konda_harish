/**
 * Check Database Schema
 * Verifies what columns actually exist in the database
 */

const { sequelize } = require('./config/database');
const { QueryTypes } = require('sequelize');

async function checkSchema() {
  try {
    console.log('🔍 Checking database schema...\n');

    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check if arrivals table exists
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'arrivals'
    `, { type: QueryTypes.SELECT });

    if (tables.length === 0) {
      console.log('❌ arrivals table does not exist!');
      console.log('   Your local database is empty.');
      console.log('   The migration can only run on a database with existing tables.\n');
      console.log('💡 Solution: This migration is meant for your CLOUD database, not local.');
      console.log('   Your local database has no data, so indexes are not needed.\n');
      await sequelize.close();
      return;
    }

    console.log('✅ arrivals table exists\n');

    // Check column names
    const columns = await sequelize.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'arrivals'
      ORDER BY ordinal_position
    `, { type: QueryTypes.SELECT });

    console.log('📊 Columns in arrivals table:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    // Check if movementType or movement_type exists
    const hasMovementType = columns.some(c => 
      c.column_name === 'movementType' || c.column_name === 'movement_type'
    );

    console.log(`\n${hasMovementType ? '✅' : '❌'} movementType column exists`);

    await sequelize.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
  }
}

checkSchema();
