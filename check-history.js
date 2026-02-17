const { SampleEntryAuditLog } = require('./server/models');

async function checkEntryHistory() {
    try {
        const entryId = 'd502b631-f1f5-465d-b57f-5d25465778e4'; // Full ID from previous listing or derived
        // Actually I don't have the full ID for d502b631 yet, let's find it first or use LIKE
        const logs = await SampleEntryAuditLog.findAll({
            where: {
                recordId: { [require('sequelize').Op.like]: 'd502b631%' }
            },
            order: [['createdAt', 'ASC']],
            raw: true
        });

        console.log(`--- History for ${entryId.substring(0, 8)} ---`);
        logs.forEach(l => {
            console.log(`${l.createdAt.toISOString()} | ${l.actionType.padEnd(20)} | New: ${JSON.stringify(l.newValues)}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkEntryHistory();
