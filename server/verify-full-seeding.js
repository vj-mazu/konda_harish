const {
    SampleEntry,
    Arrival,
    RiceProduction,
    ByProduct,
    Packaging,
    QualityParameters,
    InventoryData
} = require('./models/index');

async function verify() {
    console.log('--- Database Record Verification ---');
    try {
        const counts = {
            SampleEntries: await SampleEntry.count(),
            Arrivals: await Arrival.count(),
            RiceProductions: await RiceProduction.count(),
            ByProducts: await ByProduct.count(),
            Packagings: await Packaging.count(),
            QualityParameters: await QualityParameters.count(),
            InventoryData: await InventoryData.count()
        };

        console.table(counts);

        // Spot check linkage
        const sampleCheck = await SampleEntry.findOne({
            where: { workflowStatus: 'COMPLETED' },
            include: [
                { model: QualityParameters, as: 'qualityParameters' }
            ]
        });

        if (sampleCheck) {
            console.log('\nSpot Check (COMPLETED Record):');
            console.log(`ID: ${sampleCheck.id}`);
            console.log(`Has Quality Params: ${!!sampleCheck.qualityParameters}`);
        }

        const arrivalCheck = await Arrival.findOne({
            where: { status: 'approved' }
        });

        if (arrivalCheck) {
            console.log('\nSpot Check (Arrival Record):');
            console.log(`SL No: ${arrivalCheck.slNo}`);
            console.log(`Movement Type: ${arrivalCheck.movementType}`);
            console.log(`Status: ${arrivalCheck.status}`);
        }

    } catch (error) {
        console.error('Verification failed:', error);
    }
    process.exit(0);
}

verify();
