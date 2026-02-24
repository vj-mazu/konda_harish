const {
    sequelize,
    SampleEntry,
    QualityParameters,
    LotAllotment,
    PhysicalInspection,
    InventoryData,
    FinancialCalculation,
    Broker,
    RiceVariety,
    Kunchinittu
} = require('./models/index');

async function verify() {
    console.log('Database Verification Results:');

    const brokersCount = await Broker.count();
    const varietiesCount = await RiceVariety.count();
    const kbsCount = await Kunchinittu.count();
    const samplesCount = await SampleEntry.count();
    const qpCount = await QualityParameters.count();
    const allotmentCount = await LotAllotment.count();
    const inspectionCount = await PhysicalInspection.count();
    const inventoryCount = await InventoryData.count();
    const financialCount = await FinancialCalculation.count();

    console.log(`Brokers: ${brokersCount}`);
    console.log(`Varieties: ${varietiesCount}`);
    console.log(`Kunchinittus: ${kbsCount}`);
    console.log(`Sample Entries: ${samplesCount}`);
    console.log(`Quality Parameters: ${qpCount}`);
    console.log(`Lot Allotments: ${allotmentCount}`);
    console.log(`Physical Inspections: ${inspectionCount}`);
    console.log(`Inventory Records: ${inventoryCount}`);
    console.log(`Financial Records: ${financialCount}`);

    // Check one record workflow
    console.log('\nSample Workflow Link Check:');
    const sample = await SampleEntry.findOne({
        where: { workflowStatus: 'COMPLETED' },
        include: [
            { model: QualityParameters, as: 'qualityParameters' },
            {
                model: LotAllotment, as: 'lotAllotment', include: [
                    {
                        model: PhysicalInspection, as: 'physicalInspections', include: [
                            {
                                model: InventoryData, as: 'inventoryData', include: [
                                    { model: FinancialCalculation, as: 'financialCalculation' }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    });

    if (sample) {
        console.log(`Sample Entry ID: ${sample.id}`);
        console.log(`- Quality Params: ${sample.qualityParameters ? 'FOUND' : 'MISSING'}`);
        console.log(`- Lot Allotment: ${sample.lotAllotment ? 'FOUND' : 'MISSING'}`);
        const insp = sample.lotAllotment?.physicalInspections?.[0];
        console.log(`- Physical Inspection: ${insp ? 'FOUND' : 'MISSING'}`);
        console.log(`- Inventory Data: ${insp?.inventoryData ? 'FOUND' : 'MISSING'}`);
        console.log(`- Financial Calculation: ${insp?.inventoryData?.financialCalculation ? 'FOUND' : 'MISSING'}`);
    } else {
        console.log('No COMPLETED records found for verification.');
    }

    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
