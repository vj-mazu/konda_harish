const { SampleEntry, LotAllotment, PhysicalInspection, InventoryData, User } = require('./server/models');

async function checkDetailedAllotments() {
    try {
        console.log('--- Checking Detailed Allotments for Active Entries ---');

        const statuses = ['OWNER_FINANCIAL', 'FINAL_REVIEW'];
        const entries = await SampleEntry.findAll({
            where: { workflowStatus: statuses },
            include: [
                {
                    model: LotAllotment,
                    as: 'lotAllotment',
                    include: [
                        { model: User, as: 'supervisor' },
                        {
                            model: PhysicalInspection,
                            as: 'physicalInspections',
                            include: [{ model: InventoryData, as: 'inventoryData' }]
                        }
                    ]
                }
            ]
        });

        console.log(`Found ${entries.length} active entries in ${statuses.join(' or ')}`);

        entries.forEach(e => {
            console.log(`\n- Entry ID: ${e.id.substring(0, 8)} | Status: ${e.workflowStatus}`);
            console.log(`  Party: ${e.partyName} | Variety: ${e.variety}`);
            if (e.lotAllotment) {
                console.log(`  Allotment EXISTS (ID: ${e.lotAllotment.id.substring(0, 8)})`);
                console.log(`  Supervisor: ${e.lotAllotment.supervisor?.username || 'N/A'}`);
                const inspections = e.lotAllotment.physicalInspections || [];
                console.log(`  Inspections: ${inspections.length}`);
                inspections.forEach((insp, idx) => {
                    console.log(`    Trip ${idx + 1}: [ID: ${insp.id.substring(0, 8)}] Bags: ${insp.bags} | Lorry: ${insp.lorryNumber}`);
                    console.log(`      Inventory: ${insp.inventoryData ? 'EXISTS (WB: ' + insp.inventoryData.wbNumber + ')' : 'MISSING'}`);
                });
            } else {
                console.log(`  Allotment MISSING`);
            }
        });

    } catch (error) {
        console.error('Error during diagnostic:', error);
    } finally {
        process.exit();
    }
}

checkDetailedAllotments();
