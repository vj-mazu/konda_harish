/**
 * Check Sample Entry Migration Status
 * Run this with: node check-sample-entry-status.js
 */

require('dotenv').config();
const { sequelize } = require('./config/database');

async function checkStatus() {
  try {
    console.log('🔍 Checking Sample Entry migration status...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check user roles enum
    console.log('📋 Checking user roles enum...');
    try {
      const [roles] = await sequelize.query(`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'enum_users_role'
        )
        ORDER BY enumlabel;
      `);
      
      console.log('Current roles in database:');
      roles.forEach(role => console.log(`   ✓ ${role.enumlabel}`));
      
      const expectedRoles = ['staff', 'manager', 'admin', 'quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account'];
      const existingRoles = roles.map(r => r.enumlabel);
      const missingRoles = expectedRoles.filter(r => !existingRoles.includes(r));
      
      if (missingRoles.length > 0) {
        console.log('\n❌ Missing roles:');
        missingRoles.forEach(role => console.log(`   ✗ ${role}`));
        console.log('\n⚠️  You need to run: node run-sample-entry-migrations.js');
      } else {
        console.log('\n✅ All required roles are present!');
      }
      console.log('');
    } catch (error) {
      console.error('❌ Error checking roles:', error.message);
    }

    // Check if sample entry tables exist
    console.log('📋 Checking sample entry tables...');
    try {
      const expectedTables = [
        'sample_entries',
        'quality_parameters',
        'cooking_reports',
        'lot_allotments',
        'physical_inspections',
        'inventory_data',
        'financial_calculations',
        'sample_entry_audit_logs'
      ];

      const [tables] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (${expectedTables.map(t => `'${t}'`).join(',')})
        ORDER BY table_name;
      `);
      
      const existingTables = tables.map(t => t.table_name);
      
      console.log('Existing tables:');
      existingTables.forEach(table => console.log(`   ✓ ${table}`));
      
      const missingTables = expectedTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length > 0) {
        console.log('\n❌ Missing tables:');
        missingTables.forEach(table => console.log(`   ✗ ${table}`));
        console.log('\n⚠️  You need to run: node run-sample-entry-migrations.js');
      } else {
        console.log('\n✅ All required tables are present!');
      }
      console.log('');
    } catch (error) {
      console.error('❌ Error checking tables:', error.message);
    }

    // Check if sample entries exist
    console.log('📋 Checking sample entries data...');
    try {
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as count FROM sample_entries;
      `);
      
      console.log(`Sample entries in database: ${result[0].count}`);
      console.log('');
    } catch (error) {
      console.log('⚠️  sample_entries table does not exist yet');
      console.log('');
    }

    // Check users with new roles
    console.log('📋 Checking users with sample entry roles...');
    try {
      const [users] = await sequelize.query(`
        SELECT username, role, "isActive"
        FROM users
        WHERE role IN ('quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account')
        ORDER BY role, username;
      `);
      
      if (users.length > 0) {
        console.log('Users with sample entry roles:');
        users.forEach(user => console.log(`   ✓ ${user.username} (${user.role}) - ${user.isActive ? 'Active' : 'Inactive'}`));
      } else {
        console.log('⚠️  No users with sample entry roles found');
        console.log('   Create users with roles: quality_supervisor, physical_supervisor, inventory_staff, financial_account');
      }
      console.log('');
    } catch (error) {
      console.log('⚠️  Could not check users:', error.message);
      console.log('');
    }

    console.log('✅ Status check complete!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Status check error:', error);
    process.exit(1);
  }
}

checkStatus();
