const { SampleEntry, LotAllotment, User } = require('./server/models');

async function checkAllotments() {
    try {
        console.log('--- Diagnostic: Checking Allotted Lots ---');

        const statuses = ['LOT_ALLOTMENT', 'PHYSICAL_INSPECTION'];
        const entries = await SampleEntry.findAll({
            where: { workflowStatus: statuses },
            include: [
                {
                    model: LotAllotment,
                    as: 'lotAllotment',
                    include: [{ model: User, as: 'supervisor' }]
                }
            ]
        });

        console.log(`Found ${entries.length} entries with status ${statuses.join(' or ')}`);

        entries.forEach(e => {
            console.log(`- Entry ID: ${e.id}`);
            console.log(`  Status: ${e.workflowStatus}`);
            console.log(`  Party: ${e.partyName}`);
            console.log(`  Lot Allotment: ${e.lotAllotment ? 'EXISTS' : 'MISSING'}`);
            if (e.lotAllotment) {
                console.log(`    Allotted To: ${e.lotAllotment.supervisor?.username} (ID: ${e.lotAllotment.allottedToSupervisorId})`);
            }
        });

        // Check if there are any managers or supervisors
        const users = await User.findAll({
            where: { role: ['manager', 'physical_supervisor'] }
        });
        console.log(`\nFound ${users.length} managers/supervisors:`);
        users.forEach(u => console.log(`- ${u.username} (ID: ${u.id}, Role: ${u.role})`));

    } catch (error) {
        console.error('Error during diagnostic:', error);
    } finally {
        process.exit();
    }
}

checkAllotments();
