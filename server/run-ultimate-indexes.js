/**
 * Run Ultimate Performance Indexes Migration
 * 
 * This script adds the ultimate performance indexes for 10 lakh records.
 * Run this ONCE after deployment to enable sub-1-second queries.
 * 
 * Usage: node run-ultimate-indexes.js
 */

require('dotenv').config();
const { sequelize } = require('./config/database');

async function runMigration() {
  try {
    console.log('🚀 Starting ultimate performance indexes migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Import and run migration
    const migration = require('./migrations/91_add_ultimate_performance_indexes');
    await migration.up();
    
    console.log('✅ Migration completed successfully!');
    console.log('📈 Your system is now optimized for 10 lakh records!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
