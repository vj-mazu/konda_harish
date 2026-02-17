const { SampleEntry, sequelize } = require('./server/models');

async function checkStatusCounts() {
    try {
        const counts = await SampleEntry.findAll({
            attributes: ['workflowStatus', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['workflowStatus'],
            raw: true
        });

        console.log('--- Workflow Status Counts ---');
        counts.forEach(c => {
            console.log(`${c.workflowStatus}: ${c.count}`);
        });

        const recent = await SampleEntry.findAll({
            limit: 10,
            order: [['createdAt', 'DESC']],
            raw: true
        });

        console.log('\n--- Recent 10 Entries ---');
        recent.forEach(e => {
            console.log(`${e.id.substring(0, 8)} | ${e.workflowStatus.padEnd(20)} | ${e.partyName}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkStatusCounts();
