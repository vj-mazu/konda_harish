/**
 * Standalone script to run Sample Entry migrations
 * Run this with: node run-sample-entry-migrations.js
 */

require('dotenv').config();
const { sequelize } = require('./config/database');

async function runMigrations() {
  try {
    console.log('🔄 Starting Sample Entry migrations...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Migration 74: Add Sample Entry user roles
    console.log('📋 Migration 74: Adding Sample Entry user roles...');
    try {
      const addSampleEntryUserRoles = require('./migrations/74_add_sample_entry_user_roles');
      await addSampleEntryUserRoles.up();
      console.log('✅ Migration 74: Sample Entry user roles added\n');
    } catch (error) {
      console.error('❌ Migration 74 error:', error.message);
      console.error(error);
    }

    // Migration 75: Create sample_entries table
    console.log('📋 Migration 75: Creating sample_entries table...');
    try {
      const createSampleEntriesTable = require('./migrations/75_create_sample_entries_table');
      await createSampleEntriesTable.up();
      console.log('✅ Migration 75: sample_entries table created\n');
    } catch (error) {
      console.error('❌ Migration 75 error:', error.message);
    }

    // Migration 76: Create quality_parameters table
    console.log('📋 Migration 76: Creating quality_parameters table...');
    try {
      const createQualityParametersTable = require('./migrations/76_create_quality_parameters_table');
      await createQualityParametersTable.up();
      console.log('✅ Migration 76: quality_parameters table created\n');
    } catch (error) {
      console.error('❌ Migration 76 error:', error.message);
    }

    // Migration 77: Create cooking_reports table
    console.log('📋 Migration 77: Creating cooking_reports table...');
    try {
      const createCookingReportsTable = require('./migrations/77_create_cooking_reports_table');
      await createCookingReportsTable.up();
      console.log('✅ Migration 77: cooking_reports table created\n');
    } catch (error) {
      console.error('❌ Migration 77 error:', error.message);
    }

    // Migration 78: Create lot_allotments table
    console.log('📋 Migration 78: Creating lot_allotments table...');
    try {
      const createLotAllotmentsTable = require('./migrations/78_create_lot_allotments_table');
      await createLotAllotmentsTable.up();
      console.log('✅ Migration 78: lot_allotments table created\n');
    } catch (error) {
      console.error('❌ Migration 78 error:', error.message);
    }

    // Migration 79: Create physical_inspections table
    console.log('📋 Migration 79: Creating physical_inspections table...');
    try {
      const createPhysicalInspectionsTable = require('./migrations/79_create_physical_inspections_table');
      await createPhysicalInspectionsTable.up();
      console.log('✅ Migration 79: physical_inspections table created\n');
    } catch (error) {
      console.error('❌ Migration 79 error:', error.message);
    }

    // Migration 80: Create inventory_data table
    console.log('📋 Migration 80: Creating inventory_data table...');
    try {
      const createInventoryDataTable = require('./migrations/80_create_inventory_data_table');
      await createInventoryDataTable.up();
      console.log('✅ Migration 80: inventory_data table created\n');
    } catch (error) {
      console.error('❌ Migration 80 error:', error.message);
    }

    // Migration 81: Create financial_calculations table
    console.log('📋 Migration 81: Creating financial_calculations table...');
    try {
      const createFinancialCalculationsTable = require('./migrations/81_create_financial_calculations_table');
      await createFinancialCalculationsTable.up();
      console.log('✅ Migration 81: financial_calculations table created\n');
    } catch (error) {
      console.error('❌ Migration 81 error:', error.message);
    }

    // Migration 82: Create sample_entry_audit_logs table
    console.log('📋 Migration 82: Creating sample_entry_audit_logs table...');
    try {
      const createSampleEntryAuditLogsTable = require('./migrations/82_create_sample_entry_audit_logs_table');
      await createSampleEntryAuditLogsTable.up();
      console.log('✅ Migration 82: sample_entry_audit_logs table created\n');
    } catch (error) {
      console.error('❌ Migration 82 error:', error.message);
    }

    // Verify roles in database
    console.log('📋 Verifying user roles in database...');
    try {
      const [roles] = await sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
        )
        ORDER BY enumlabel;
      `);
      
      console.log('✅ Available roles in database:');
      roles.forEach(role => console.log(`   - ${role.enumlabel}`));
      console.log('');
    } catch (error) {
      console.error('❌ Error checking roles:', error.message);
    }

    // Verify tables created
    console.log('📋 Verifying tables created...');
    try {
      const [tables] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE '%sample%' OR table_name LIKE '%quality%' OR table_name LIKE '%cooking%' OR table_name LIKE '%lot%' OR table_name LIKE '%inspection%' OR table_name LIKE '%inventory%' OR table_name LIKE '%financial%'
        ORDER BY table_name;
      `);
      
      console.log('✅ Sample Entry related tables:');
      tables.forEach(table => console.log(`   - ${table.table_name}`));
      console.log('');
    } catch (error) {
      console.error('❌ Error checking tables:', error.message);
    }

    console.log('✅ All migrations completed!\n');
    console.log('🎉 Sample Entry workflow is ready to use!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration script error:', error);
    process.exit(1);
  }
}

runMigrations();
