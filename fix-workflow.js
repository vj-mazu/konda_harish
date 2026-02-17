/**
 * Fix Workflow Script
 * Run: node fix-workflow.js
 * 
 * This script helps fix entries that are in wrong workflow status
 */

const { sequelize } = require('./server/config/database');
const { SampleEntry, InventoryData, PhysicalInspection } = require('./server/models');
const { Op } = require('sequelize');

async function fixWorkflow() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Check for entries in FINAL_REVIEW that need fixing
    // These are entries that were skipped due to the bug
    const entries = await SampleEntry.findAll({
      where: {
        workflowStatus: 'FINAL_REVIEW'
      },
      include: [
        {
          model: PhysicalInspection,
          as: 'lotAllotment',
          include: [
            {
              model: InventoryData,
              as: 'physicalInspections'
            }
          ]
        }
      ],
      limit: 20
    });

    console.log(`Found ${entries.length} entries in FINAL_REVIEW:\n`);
    
    for (const entry of entries) {
      const inspections = entry.lotAllotment?.physicalInspections || [];
      const inventoryCount = inspections.filter(i => i.inventoryData).length;
      
      console.log(`ID: ${entry.id}`);
      console.log(`  Variety: ${entry.variety}`);
      console.log(`  Party: ${entry.partyName}`);
      console.log(`  Status: ${entry.workflowStatus}`);
      console.log(`  Inventory Records: ${inventoryCount}`);
      
      // If only 1 inventory record and in FINAL_REVIEW, it was likely skipped
      if (inventoryCount >= 1) {
        // Check if there's inventory data
        const hasInventory = await InventoryData.findOne({
          where: {
            physicalInspectionId: { [Op.ne]: null }
          },
          include: [{
            model: PhysicalInspection,
            where: { sampleEntryId: entry.id }
          }]
        });
        
        if (entry.workflowStatus === 'FINAL_REVIEW' && inventoryCount === 1) {
          console.log(`  ⚠️ May need fix - only 1 inventory record`);
        }
      }
      console.log('---');
    }

    console.log('\n=== TO FIX PAST RECORDS ===');
    console.log('Run this SQL in your database:\n');
    console.log('-- For entries that should go back to INVENTORY_ENTRY (first inventory done):');
    console.log("UPDATE sample_entries SET workflow_status = 'INVENTORY_ENTRY' WHERE workflow_status = 'FINAL_REVIEW' AND id IN (SELECT sample_entry_id FROM physical_inspections WHERE id IN (SELECT physical_inspection_id FROM inventory_data));\n");
    
    console.log('-- For entries that should go back to OWNER_FINANCIAL:');
    console.log("UPDATE sample_entries SET workflow_status = 'OWNER_FINANCIAL' WHERE workflow_status = 'FINAL_REVIEW' AND id IN (SELECT sample_entry_id FROM physical_inspections WHERE id IN (SELECT physical_inspection_id FROM inventory_data));\n");

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fixWorkflow();
