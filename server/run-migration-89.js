require('dotenv').config();
const { sequelize } = require('./config/database');
const migration = require('./migrations/89_add_lot_selection_fields');

async function run() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        console.log('🔄 Running migration 89...');
        await migration.up(sequelize.getQueryInterface(), require('sequelize'));
        console.log('✅ Migration 89 completed');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

run();
