/**
 * Render Lightweight Seeder (25,000 Records) - ENHANCED
 * 
 * Optimized for Render's free/starter tier limits.
 * Maintains full workflow: Sample -> Quality -> Lot -> Physical -> Inventory -> Arrival.
 * Includes RiceVarieties for complete frontend experience.
 */

require('dotenv').config();
const {
    sequelize,
    User,
    Broker,
    Variety,
    RiceVariety,
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
const BATCH_SIZE = 500; // Smaller batches for better memory management on free tiers

function getRandomDate() {
    const start = new Date('2025-01-01').getTime();
    const end = new Date().getTime();
    return new Date(start + Math.random() * (end - start));
}

async function seed() {
    console.log('🌱 Start: Render Lightweight Seeder (25,000 Records)...');
    const startTime = Date.now();

    try {
        await sequelize.authenticate();
        console.log('📡 Database connected');

        // 1. Expand Baseline Data
        const roles = ['staff', 'manager', 'admin', 'quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account'];
        for (const role of roles) {
            await User.findOrCreate({
                where: { role },
                defaults: { username: `user_${role}`, password: 'password123', isActive: true }
            });
        }
        const userMap = {};
        (await User.findAll()).forEach(u => { userMap[u.role] = u.id; });

        // Ensure baseline entities
        if (await Broker.count() < 10) {
            await Broker.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Broker ${i + 1}`, isActive: true })));
        }
        if (await Variety.count() < 10) {
            await Variety.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Variety ${i + 1}`, code: `V${i + 1}`, isActive: true })));
        }
        if (await RiceVariety.count() < 5) {
            await RiceVariety.bulkCreate(Array.from({ length: 5 }).map((_, i) => ({ name: `Rice ${i + 1}`, code: `R${i + 1}`, isActive: true })));
        }

        const wh = await Warehouse.findOne() || await Warehouse.create({ name: 'Default WH', code: 'DWH' });
        if (await Kunchinittu.count() < 10) {
            await Kunchinittu.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Kunchinittu ${i + 1}`, code: `K${i + 1}`, warehouseId: wh.id, isActive: true })));
        }

        const dbBrokers = await Broker.findAll();
        const dbVarieties = await Variety.findAll();
        const dbKunch = await Kunchinittu.findAll();

        // 2. Workflow Seeding
        const runId = Date.now().toString().slice(-4);

        for (let b = 0; b < TOTAL_WORKFLOWS / BATCH_SIZE; b++) {
            const batchStart = Date.now();
            const workflowData = [];

            for (let i = 0; i < BATCH_SIZE; i++) {
                const index = (b * BATCH_SIZE) + i;
                const id = uuidv4();
                const randomDate = getRandomDate();
                const broker = dbBrokers[index % dbBrokers.length];
                const variety = dbVarieties[index % dbVarieties.length];
                const kunch = dbKunch[index % dbKunch.length];

                workflowData.push({ id, randomDate, broker, variety, kunch, index });
            }

            // Bulk create Sample Entries first
            await SampleEntry.bulkCreate(workflowData.map(d => ({
                id: d.id,
                entryDate: d.randomDate,
                brokerName: d.broker.name,
                variety: d.variety.name,
                partyName: `Render-Party-${runId}-${d.index}`,
                bags: 100 + (d.index % 500),
                workflowStatus: 'COMPLETED',
                createdByUserId: userMap['staff'] || 1,
                lotSelectionByUserId: userMap['manager'] || 1,
                finalReviewByUserId: userMap['admin'] || 1
            })));

            const qualityParamsArr = workflowData.map(d => ({ id: uuidv4(), sampleEntryId: d.id, reportedBy: 'Light Seeder', moisture: 14.5 }));
            const lotAllotmentsArr = workflowData.map(d => ({ id: uuidv4(), sampleEntryId: d.id, allottedToSupervisorId: userMap['physical_supervisor'] || 1 }));
            await QualityParameters.bulkCreate(qualityParamsArr);
            await LotAllotment.bulkCreate(lotAllotmentsArr);

            const physicalInspectionsArr = workflowData.map((d, idx) => ({
                id: uuidv4(),
                sampleEntryId: d.id,
                lotAllotmentId: lotAllotmentsArr[idx].id,
                bags: 100 + (d.index % 500),
                lorryNumber: `LR-${runId}-${d.index}`,
                isComplete: true
            }));
            await PhysicalInspection.bulkCreate(physicalInspectionsArr);

            const inventoryDataArr = workflowData.map((d, idx) => ({
                id: uuidv4(),
                physicalInspectionId: physicalInspectionsArr[idx].id,
                variety: d.variety.name,
                bags: 100 + (d.index % 500),
                kunchinittuId: d.kunch.id
            }));
            await InventoryData.bulkCreate(inventoryDataArr);

            const arrivalsArr = workflowData.map(d => ({
                id: uuidv4(),
                slNo: `RL-${runId}-${d.index}`.slice(0, 20),
                date: d.randomDate,
                movementType: 'purchase',
                broker: d.broker.name,
                variety: d.variety.name,
                bags: 100 + (d.index % 500),
                toKunchinintuId: d.kunch.id,
                status: 'approved',
                adminApprovedBy: userMap['admin'] || 1
            }));
            const dbArrivals = await Arrival.bulkCreate(arrivalsArr);

            await PurchaseRate.bulkCreate(dbArrivals.map(a => ({
                id: uuidv4(),
                arrivalId: a.id,
                status: 'approved',
                adminApprovedBy: userMap['admin'] || 1,
                baseRateValue: 2500.00,
                totalAmount: (a.bags * 0.75) * 2500.00 // Approx weight calc
            })));

            console.log(`✅ Batch ${b + 1}/${TOTAL_WORKFLOWS / BATCH_SIZE} seeded [${Date.now() - batchStart}ms]`);
        }

        console.log(`\n🎉 Seeded 25,000 workflows successfully in ${(Date.now() - startTime) / 1000}s`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
}

seed();
