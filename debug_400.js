const { InventoryData } = require('./server/models/InventoryData');
const { Kunchinittu, Variety } = require('./server/models/Location');
const { sequelize } = require('./server/config/database');

async function check() {
    try {
        const physicalInspectionId = 'f7feef5f-6b40-44ba-a031-29ee8c3addce';
        const kunchinittuId = 1;
        const entryVariety = 'SUM25 RNR';

        console.log('--- Database Diagnostic ---');

        // Check if inventory data already exists for this physical inspection
        const existingInventory = await sequelize.models.InventoryData.findOne({
            where: { physicalInspectionId }
        });

        if (existingInventory) {
            console.log('❌ Inventory data ALREADY EXISTS for this Physical Inspection ID:', physicalInspectionId);
            console.log('Existing Record:', JSON.stringify(existingInventory, null, 2));
        } else {
            console.log('✅ No existing inventory data for this Physical Inspection ID.');
        }

        // Check Kunchinittu variety
        const kunchinittu = await Kunchinittu.findByPk(kunchinittuId, {
            include: [{ model: Variety, as: 'variety' }]
        });

        if (kunchinittu) {
            console.log('Kunchinittu details:', {
                id: kunchinittu.id,
                name: kunchinittu.name,
                variety: kunchinittu.variety ? kunchinittu.variety.name : 'NONE'
            });

            if (kunchinittu.variety) {
                const kVariety = (kunchinittu.variety.name || '').toLowerCase().trim();
                const eVariety = entryVariety.toLowerCase().trim();
                const match = eVariety.includes(kVariety) || kVariety.includes(eVariety);

                if (!match) {
                    console.log('❌ VARIETY MISMATCH!');
                    console.log(`Entry: "${entryVariety}" vs Kunchinittu Variety: "${kunchinittu.variety.name}"`);
                } else {
                    console.log('✅ Variety matches.');
                }
            } else {
                console.log('⚠️ Kunchinittu has no variety assigned.');
            }
        } else {
            console.log('❌ Kunchinittu not found for ID:', kunchinittuId);
        }

    } catch (error) {
        console.error('Error during diagnostic:', error);
    } finally {
        await sequelize.close();
    }
}

check();
