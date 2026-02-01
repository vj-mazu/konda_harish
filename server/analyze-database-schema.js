/**
 * Database Schema Analyzer
 * 
 * This script queries the actual PostgreSQL database to find the exact
 * column names for all tables, so we can create correct indexes.
 */

const { sequelize } = require('./config/database');

async function analyzeSchema() {
  try {
    console.log('🔍 Analyzing actual database schema...\n');

    const tables = [
      'Arrivals',
      'rice_productions',
      'paddy_hamali_entries',
      'rice_hamali_entries',
      'rice_stock_movements',
      'kunchinittus',
      'outturns',
      'opening_balances',
      'hamali_entries',
      'rice_hamali_rates',
      'paddy_hamali_rates'
    ];

    for (const table of tables) {
      console.log(`\n📊 Table: ${table}`);
      console.log('='.repeat(60));
      
      try {
        const [columns] = await sequelize.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_name = '${table}'
          ORDER BY ordinal_position;
        `);

        if (columns.length === 0) {
          console.log(`  ⚠️ Table not found or has no columns`);
          continue;
        }

        console.log('  Columns:');
        columns.forEach(col => {
          console.log(`    - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Check existing indexes
        const [indexes] = await sequelize.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE tablename = '${table}'
          ORDER BY indexname;
        `);

        if (indexes.length > 0) {
          console.log('\n  Existing Indexes:');
          indexes.forEach(idx => {
            console.log(`    - ${idx.indexname}`);
          });
        }

      } catch (error) {
        console.log(`  ❌ Error analyzing table: ${error.message}`);
      }
    }

    console.log('\n\n✅ Schema analysis complete!');
    console.log('\n📝 Summary of findings for index creation:');
    console.log('   Use this information to create Migration 67 with correct column names');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sequelize.close();
  }
}

analyzeSchema();
