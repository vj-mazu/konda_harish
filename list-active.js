const { SampleEntry, sequelize } = require('./server/models');

async function listAllNonCompleted() {
    try {
        const entries = await SampleEntry.findAll({
            where: {
                workflowStatus: { [require('sequelize').Op.ne]: 'COMPLETED' }
            },
            raw: true
        });

        console.log(`--- All Non-Completed Entries (${entries.length}) ---`);
        entries.forEach(e => {
            console.log(`${e.id.substring(0, 8)} | ${e.workflowStatus.padEnd(20)} | ${e.partyName}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

listAllNonCompleted();
