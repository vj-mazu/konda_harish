const { SampleEntryAuditLog, sequelize } = require('./server/models');

async function checkAuditLog() {
    try {
        const logs = await SampleEntryAuditLog.findAll({
            limit: 20,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        console.log('--- Recent Audit Logs ---');
        logs.forEach(l => {
            console.log(`${l.createdAt.toISOString()} | ${l.actionType.padEnd(20)} | ID: ${l.recordId?.substring(0, 8)} | New: ${JSON.stringify(l.newValues)}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAuditLog();
