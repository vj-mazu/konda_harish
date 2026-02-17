const { SampleEntry, LotAllotment, PhysicalInspection, sequelize } = require('./server/models');
const { Op } = require('sequelize');

async function findActiveWork() {
    try {
        console.log('--- Finding Entries NOT COMPLETED ---');
        const entries = await SampleEntry.findAll({
            where: {
                workflowStatus: { [Op.ne]: 'COMPLETED' }
            },
            order: [['createdAt', 'DESC']],
            limit: 20,
            include: [
                { model: LotAllotment, as: 'lotAllotment' }
            ]
        });

        if (entries.length === 0) {
            console.log('No active entries found.');
        } else {
            console.log(`Found ${entries.length} active entries.`);
            entries.forEach(e => {
                console.log(`[${e.workflowStatus.padEnd(18)}] ID: ${e.id.substring(0, 8)} | Party: ${e.partyName} | Allotment: ${e.lotAllotment ? 'YES' : 'NO'}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

findActiveWork();
