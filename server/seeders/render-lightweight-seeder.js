/**
 * Render Lightweight Seeder (25,000 Records)
 * 
 * Optimized for Render's free/starter tier limits.
 * Maintains full workflow: Sample -> Quality -> Lot -> Physical -> Inventory -> Arrival.
 */

require('dotenv').config();
const {
    sequelize,
    User,
    Broker,
    Variety,
    Warehouse,
    Kunchinittu,
    Outturn,
    SampleEntry,
    QualityParameters,
    LotAllotment,
    PhysicalInspection,
    InventoryData,
    FinancialCalculation,
    Arrival,
    PurchaseRate
} = require('../models');
const { v4: uuidv4 } = require('uuid');

const TOTAL_WORKFLOWS = 25000;
const BATCH_SIZE = 1000;

function getRandomDate() {
    const start = new Date('2025-01-01').getTime();
    const end = new Date().getTime();
    return new Date(start + Math.random() * (end - start));
}

async function seed() {
    console.log('🚀 Starting Render Lightweight Seeder (25,000 Records)...');
    const startTime = Date.now();

    try {
        await sequelize.authenticate();

        // 1. Expand Baseline Data
        const roles = ['staff', 'manager', 'admin', 'quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account'];
        for (const role of roles) {
            await User.findOrCreate({
                where: { role },
                defaults: { username: `user_${role}`, password: 'password123', isActive: true }
            });
        }
        const dbUsers = await User.findAll();
        const userMap = {};
        dbUsers.forEach(u => { userMap[u.role] = u.id; });

        // Ensure at least some varieties/brokers
        if (await Broker.count() < 10) {
            await Broker.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Broker ${i + 1}`, isActive: true })));
        }
        if (await Variety.count() < 10) {
            await Variety.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Variety ${i + 1}`, code: `V${i + 1}`, isActive: true })));
        }
        if (await Kunchinittu.count() < 10) {
            const wh = await Warehouse.findOne() || await Warehouse.create({ name: 'Default WH', code: 'DWH' });
            await Kunchinittu.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Kunchinittu ${i + 1}`, code: `K${i + 1}`, warehouseId: wh.id, isActive: true })));
        }

        const dbBrokers = await Broker.findAll();
        const dbVarieties = await Variety.findAll();
        const dbKunch = await Kunchinittu.findAll();

        // 2. Workflow Seeding
        const runId = Date.now().toString().slice(-4);

        for (let b = 0; b < TOTAL_WORKFLOWS / BATCH_SIZE; b++) {
            const sampleEntriesArr = [];
            const qualityParamsArr = [];
            const lotAllotmentsArr = [];
            const physicalInspectionsArr = [];
            const inventoryDataArr = [];
            const financialCalcsArr = [];
            const arrivalsArr = [];
            const purchaseRatesArr = [];

            for (let i = 0; i < BATCH_SIZE; i++) {
                const index = (b * BATCH_SIZE) + i;
                const id = uuidv4();
                const qualityId = uuidv4();
                const allotmentId = uuidv4();
                const inspectionId = uuidv4();
                const invId = uuidv4();
                const arrivalId = uuidv4();

                const broker = dbBrokers[index % dbBrokers.length];
                const variety = dbVarieties[index % dbVarieties.length];
                const kunch = dbKunch[index % dbKunch.length];
                const randomDate = getRandomDate();

                sampleEntriesArr.push({
                    id,
                    entryDate: randomDate,
                    brokerName: broker.name,
                    variety: variety.name,
                    partyName: `Party-${runId}-${index}`,
                    location: `Loc-${index}`,
                    bags: 100 + (index % 500),
                    workflowStatus: 'COMPLETED',
                    lotSelectionDecision: 'PASS_WITHOUT_COOKING',
                    createdByUserId: userMap['staff'] || 1,
                    lotSelectionByUserId: userMap['manager'] || 1,
                    finalReviewByUserId: userMap['admin'] || 1
                });

                qualityParamsArr.push({ id: qualityId, sampleEntryId: id, reportedBy: 'Light Seeder', moisture: 14.5 });
                lotAllotmentsArr.push({ id: allotmentId, sampleEntryId: id, allottedToSupervisorId: userMap['physical_supervisor'] || 1 });
                physicalInspectionsArr.push({ id: inspectionId, sampleEntryId: id, lotAllotmentId: allotmentId, bags: 100 + (index % 500), lorryNumber: `L-${runId}-${index}`, isComplete: true });
                inventoryDataArr.push({ id: invId, physicalInspectionId: inspectionId, variety: variety.name, bags: 100 + (index % 500), kunchinittuId: kunch.id });
                financialCalcsArr.push({ id: uuidv4(), inventoryDataId: invId, totalAmount: 100000.00, average: 2500.00 });

                arrivalsArr.push({
                    id: arrivalId,
                    slNo: `RL-${runId}-${index}`.slice(0, 20),
                    date: randomDate,
                    movementType: 'purchase',
                    broker: broker.name,
                    variety: variety.name,
                    bags: 100 + (index % 500),
                    toKunchinintuId: kunch.id,
                    status: 'approved',
                    adminApprovedBy: userMap['admin'] || 1
                });

                purchaseRatesArr.push({
                    id: uuidv4(),
                    arrivalId: arrivalId,
                    status: 'approved',
                    adminApprovedBy: userMap['admin'] || 1,
                    baseRateValue: 2500.00,
                    totalAmount: 100000.00
                });
            }

            await SampleEntry.bulkCreate(sampleEntriesArr);
            await QualityParameters.bulkCreate(qualityParamsArr);
            await LotAllotment.bulkCreate(lotAllotmentsArr);
            await PhysicalInspection.bulkCreate(physicalInspectionsArr);
            await InventoryData.bulkCreate(inventoryDataArr);
            await FinancialCalculation.bulkCreate(financialCalcsArr);
            await PurchaseRate.bulkCreate(purchaseRatesArr);
            await Arrival.bulkCreate(arrivalsArr);

            console.log(`✅ Batch ${b + 1}/${TOTAL_WORKFLOWS / BATCH_SIZE} seeded`);
        }

        console.log(`\n🎉 Seeded 25,000 workflows successfully in ${(Date.now() - startTime) / 1000}s`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
