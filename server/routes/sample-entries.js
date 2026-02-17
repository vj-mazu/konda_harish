const express = require('express');
const router = express.Router();
const { auth: authenticateToken } = require('../middleware/auth');
const SampleEntryService = require('../services/SampleEntryService');
const QualityParametersService = require('../services/QualityParametersService');
const CookingReportService = require('../services/CookingReportService');
const LotAllotmentService = require('../services/LotAllotmentService');
const PhysicalInspectionService = require('../services/PhysicalInspectionService');
const InventoryDataService = require('../services/InventoryDataService');
const FinancialCalculationService = require('../services/FinancialCalculationService');
const WorkflowEngine = require('../services/WorkflowEngine');
const FileUploadService = require('../services/FileUploadService');

// Create sample entry (Staff)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const entry = await SampleEntryService.createSampleEntry(req.body, req.user.userId);
    res.status(201).json(entry);
  } catch (error) {
    console.error('Error creating sample entry:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get sample entries by role
router.get('/by-role', authenticateToken, async (req, res) => {
  try {
    const { status, startDate, endDate, broker, variety, party, location, limit, offset } = req.query;

    const filters = {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      broker,
      variety,
      party,
      location,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    };

    const result = await SampleEntryService.getSampleEntriesByRole(req.user.role, filters, req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('Error getting sample entries:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sample entry by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await SampleEntryService.getSampleEntryById(
      req.params.id, // Keep as UUID string
      {
        includeQuality: true,
        includeCooking: true,
        includeAllotment: true,
        includeInspection: true,
        includeInventory: true,
        includeFinancial: true
      }
    );

    if (!entry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error getting sample entry:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update sample entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const entry = await SampleEntryService.updateSampleEntry(
      req.params.id, // Keep as UUID string
      req.body,
      req.user.userId // Use userId from JWT token
    );

    if (!entry) {
      return res.status(404).json({ error: 'Sample entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error updating sample entry:', error);
    res.status(400).json({ error: error.message });
  }
});

// Add quality parameters (Quality Supervisor)
router.post('/:id/quality-parameters', authenticateToken, async (req, res) => {
  try {
    // Use multer to handle multipart/form-data (for photo upload)
    const upload = FileUploadService.getUploadMiddleware();

    upload.single('photo')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        // Convert string values from FormData to numbers
        const qualityData = {
          sampleEntryId: req.params.id, // Keep as UUID string, don't parse
          moisture: parseFloat(req.body.moisture),
          cutting1: parseFloat(req.body.cutting1),
          cutting2: parseFloat(req.body.cutting2),
          bend: parseFloat(req.body.bend),
          mixS: parseFloat(req.body.mixS),
          mixL: parseFloat(req.body.mixL),
          mix: parseFloat(req.body.mix),
          kandu: parseFloat(req.body.kandu),
          oil: parseFloat(req.body.oil),
          sk: parseFloat(req.body.sk),
          grainsCount: parseInt(req.body.grainsCount),
          wbR: parseFloat(req.body.wbR),
          wbBk: parseFloat(req.body.wbBk),
          wbT: parseFloat(req.body.wbT),
          paddyWb: parseFloat(req.body.paddyWb),
          reportedBy: req.body.reportedBy
        };

        // Handle photo upload if present
        if (req.file) {
          const uploadResult = await FileUploadService.uploadFile(req.file, { compress: true });
          qualityData.uploadFileUrl = uploadResult.fileUrl;
        }

        const quality = await QualityParametersService.addQualityParameters(
          qualityData,
          req.user.userId,
          req.user.role
        );

        res.status(201).json(quality);
      } catch (error) {
        console.error('Error adding quality parameters:', error);
        res.status(400).json({ error: error.message });
      }
    });
  } catch (error) {
    console.error('Error setting up file upload:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update quality parameters (Admin/Manager edit)
router.put('/:id/quality-parameters', authenticateToken, async (req, res) => {
  try {
    const sampleEntryId = req.params.id;

    // Get existing quality parameters for this entry
    const existing = await QualityParametersService.getQualityParametersBySampleEntry(sampleEntryId);
    if (!existing) {
      return res.status(404).json({ error: 'Quality parameters not found for this entry' });
    }

    // Prepare update data
    const updates = {
      sampleEntryId,
      moisture: req.body.moisture !== undefined ? parseFloat(req.body.moisture) : existing.moisture,
      cutting1: req.body.cutting1 !== undefined ? parseFloat(req.body.cutting1) : existing.cutting1,
      cutting2: req.body.cutting2 !== undefined ? parseFloat(req.body.cutting2) : existing.cutting2,
      bend: req.body.bend !== undefined ? parseFloat(req.body.bend) : existing.bend,
      mixS: req.body.mixS !== undefined ? parseFloat(req.body.mixS) : existing.mixS,
      mixL: req.body.mixL !== undefined ? parseFloat(req.body.mixL) : existing.mixL,
      mix: req.body.mix !== undefined ? parseFloat(req.body.mix) : existing.mix,
      kandu: req.body.kandu !== undefined ? parseFloat(req.body.kandu) : existing.kandu,
      oil: req.body.oil !== undefined ? parseFloat(req.body.oil) : existing.oil,
      sk: req.body.sk !== undefined ? parseFloat(req.body.sk) : existing.sk,
      grainsCount: req.body.grainsCount !== undefined ? parseInt(req.body.grainsCount) : existing.grainsCount,
      wbR: req.body.wbR !== undefined ? parseFloat(req.body.wbR) : existing.wbR,
      wbBk: req.body.wbBk !== undefined ? parseFloat(req.body.wbBk) : existing.wbBk,
      wbT: req.body.wbT !== undefined ? parseFloat(req.body.wbT) : existing.wbT,
      paddyWb: req.body.paddyWb !== undefined ? parseFloat(req.body.paddyWb) : existing.paddyWb
    };

    const updated = await QualityParametersService.updateQualityParameters(
      existing.id,
      updates,
      req.user.userId
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating quality parameters:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update physical inspection (Admin/Manager edit)
router.put('/:id/physical-inspection/:inspectionId', authenticateToken, async (req, res) => {
  try {
    const { inspectionId } = req.params;

    const updates = {};
    if (req.body.inspectionDate !== undefined) updates.inspectionDate = req.body.inspectionDate;
    if (req.body.lorryNumber !== undefined) updates.lorryNumber = req.body.lorryNumber;
    if (req.body.bags !== undefined) updates.bags = parseInt(req.body.bags);
    if (req.body.cutting1 !== undefined) updates.cutting1 = parseFloat(req.body.cutting1);
    if (req.body.cutting2 !== undefined) updates.cutting2 = parseFloat(req.body.cutting2);
    if (req.body.bend !== undefined) updates.bend = parseFloat(req.body.bend);
    if (req.body.remarks !== undefined) updates.remarks = req.body.remarks;

    const updated = await PhysicalInspectionService.updatePhysicalInspection(
      inspectionId,
      updates,
      req.user.userId
    );

    if (!updated) {
      return res.status(404).json({ error: 'Physical inspection not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating physical inspection:', error);
    res.status(400).json({ error: error.message });
  }
});

router.post('/:id/lot-selection', authenticateToken, async (req, res) => {
  try {
    const { decision } = req.body; // 'PASS_WITHOUT_COOKING', 'PASS_WITH_COOKING', 'FAIL'

    let nextStatus;
    if (decision === 'PASS_WITHOUT_COOKING') {
      nextStatus = 'FINAL_REPORT';
    } else if (decision === 'PASS_WITH_COOKING') {
      nextStatus = 'COOKING_REPORT';
    } else if (decision === 'FAIL') {
      nextStatus = 'FAILED';
    } else {
      return res.status(400).json({ error: 'Invalid decision' });
    }

    await WorkflowEngine.transitionTo(
      req.params.id, // Keep as UUID string, don't parse to int
      nextStatus,
      req.user.userId, // Use userId from JWT token
      req.user.role,
      { lotSelectionDecision: decision }
    );

    // Explicitly update the lot selection fields on the SampleEntry
    await SampleEntryService.updateSampleEntry(
      req.params.id,
      {
        lotSelectionDecision: decision,
        lotSelectionByUserId: req.user.userId,
        lotSelectionAt: new Date()
      },
      req.user.userId
    );

    res.json({ message: 'Workflow transitioned successfully', nextStatus });
  } catch (error) {
    console.error('Error transitioning workflow:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create cooking report (Owner/Admin)
router.post('/:id/cooking-report', authenticateToken, async (req, res) => {
  try {
    const reportData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const report = await CookingReportService.createCookingReport(
      reportData,
      req.user.userId, // Use userId from JWT token
      req.user.role
    );

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating cooking report:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update offering price (Owner/Admin)
router.post('/:id/offering-price', authenticateToken, async (req, res) => {
  try {
    const entry = await SampleEntryService.updateOfferingPrice(
      req.params.id, // Keep as UUID string
      req.body,
      req.user.userId // Use userId from JWT token
    );

    res.json(entry);
  } catch (error) {
    console.error('Error updating offering price:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create lot allotment (Manager)
router.post('/:id/lot-allotment', authenticateToken, async (req, res) => {
  try {
    const allotmentData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const allotment = await LotAllotmentService.createLotAllotment(
      allotmentData,
      req.user.userId, // Use userId from JWT token
      req.user.role
    );

    res.status(201).json(allotment);
  } catch (error) {
    console.error('Error creating lot allotment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update lot allotment (Manager - for reassigning supervisor)
router.put('/:id/lot-allotment', authenticateToken, async (req, res) => {
  try {
    const sampleEntryId = req.params.id;
    const { physicalSupervisorId } = req.body;

    if (!physicalSupervisorId) {
      return res.status(400).json({ error: 'Physical supervisor ID is required' });
    }

    // Get existing lot allotment
    const existingAllotment = await LotAllotmentService.getLotAllotmentBySampleEntry(sampleEntryId);

    if (!existingAllotment) {
      return res.status(404).json({ error: 'Lot allotment not found for this entry' });
    }

    // Update the supervisor assignment
    const updated = await LotAllotmentService.updateLotAllotment(
      existingAllotment.id,
      { allottedToSupervisorId: physicalSupervisorId },
      req.user.userId
    );

    res.json(updated);
  } catch (error) {
    console.error('Error updating lot allotment:', error);
    res.status(400).json({ error: error.message });
  }
});

// Close lot (Manager - when party doesn't send all bags)
router.post('/:id/close-lot', authenticateToken, async (req, res) => {
  try {
    const sampleEntryId = req.params.id;
    const { reason } = req.body;

    // Only manager/admin can close lots
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only manager or admin can close lots' });
    }

    // Get existing lot allotment
    const existingAllotment = await LotAllotmentService.getLotAllotmentBySampleEntry(sampleEntryId);
    if (!existingAllotment) {
      return res.status(404).json({ error: 'Lot allotment not found for this entry' });
    }

    // Get inspection progress to know how many bags were inspected
    const progress = await PhysicalInspectionService.getInspectionProgress(sampleEntryId);
    const inspectedBags = progress.inspectedBags || 0;

    // Update lot allotment with close info
    await LotAllotmentService.updateLotAllotment(
      existingAllotment.id,
      {
        closedAt: new Date(),
        closedByUserId: req.user.userId,
        closedReason: reason || `Lot closed by manager. ${inspectedBags} of ${progress.totalBags} bags inspected. Party did not send remaining ${progress.remainingBags} bags.`,
        inspectedBags: inspectedBags
      },
      req.user.userId
    );

    // Transition workflow to INVENTORY_ENTRY (skipping remaining bags)
    await WorkflowEngine.transitionTo(
      sampleEntryId,
      'INVENTORY_ENTRY',
      req.user.userId,
      req.user.role,
      {
        closedByManager: true,
        inspectedBags,
        totalAllottedBags: progress.totalBags,
        remainingBags: progress.remainingBags,
        reason: reason || 'Party did not send remaining bags'
      }
    );

    res.json({
      message: 'Lot closed successfully',
      inspectedBags,
      totalBags: progress.totalBags,
      remainingBags: progress.remainingBags
    });
  } catch (error) {
    console.error('Error closing lot:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create physical inspection (Physical Supervisor)
router.post('/:id/physical-inspection', authenticateToken, async (req, res) => {
  try {
    const upload = FileUploadService.getUploadMiddleware();

    upload.fields([
      { name: 'halfLorryImage', maxCount: 1 },
      { name: 'fullLorryImage', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      try {
        // Parse FormData values to correct types
        const inspectionData = {
          sampleEntryId: req.params.id, // Keep as UUID string
          inspectionDate: req.body.inspectionDate,
          lorryNumber: req.body.lorryNumber,
          actualBags: Number.parseInt(req.body.actualBags),
          cutting1: Number.parseFloat(req.body.cutting1),
          cutting2: Number.parseFloat(req.body.cutting2),
          bend: Number.parseFloat(req.body.bend),
          remarks: req.body.remarks || null
        };

        const inspection = await PhysicalInspectionService.createPhysicalInspection(
          inspectionData,
          req.user.userId, // Use userId from JWT token
          req.user.role
        );

        // Upload images if provided (optional - don't fail if images not provided)
        if (req.files && (req.files.halfLorryImage || req.files.fullLorryImage)) {
          try {
            await PhysicalInspectionService.uploadInspectionImages(
              inspection.id,
              req.files,
              req.user.userId
            );
          } catch (imageError) {
            console.error('Error uploading images (non-critical):', imageError);
            // Continue without images - they are optional
          }
        }

        res.status(201).json(inspection);
      } catch (error) {
        console.error('Error creating physical inspection:', error);
        res.status(400).json({ error: error.message });
      }
    });
  } catch (error) {
    console.error('Error in physical inspection route:', error);
    res.status(400).json({ error: error.message });
  }
});

// Upload inspection images
router.post('/:id/inspection-images', authenticateToken, async (req, res) => {
  try {
    const upload = FileUploadService.getUploadMiddleware();

    upload.fields([
      { name: 'halfLorryImage', maxCount: 1 },
      { name: 'fullLorryImage', maxCount: 1 }
    ])(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }

      const inspection = await PhysicalInspectionService.uploadInspectionImages(
        req.params.id, // Keep as UUID string
        req.files,
        req.user.userId // Use userId from JWT token
      );

      res.json(inspection);
    });
  } catch (error) {
    console.error('Error uploading inspection images:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create inventory data (Inventory Staff)
router.post('/:id/inventory-data', authenticateToken, async (req, res) => {
  try {
    const inventoryData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const inventory = await InventoryDataService.createInventoryData(
      inventoryData,
      req.user.userId, // Use userId from JWT token
      req.user.role
    );

    res.status(201).json(inventory);
  } catch (error) {
    console.error('Error creating inventory data:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create financial calculation (Owner/Admin)
router.post('/:id/financial-calculation', authenticateToken, async (req, res) => {
  try {
    const calculationData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const calculation = await FinancialCalculationService.createFinancialCalculation(
      calculationData,
      req.user.userId, // Use userId from JWT token
      req.user.role
    );

    res.status(201).json(calculation);
  } catch (error) {
    console.error('Error creating financial calculation:', error);
    res.status(400).json({ error: error.message });
  }
});

// Create manager financial calculation (Manager)
router.post('/:id/manager-financial-calculation', authenticateToken, async (req, res) => {
  try {
    const calculationData = {
      ...req.body,
      sampleEntryId: req.params.id // Keep as UUID string
    };

    const calculation = await FinancialCalculationService.createManagerFinancialCalculation(
      calculationData,
      req.user.userId, // Use userId from JWT token
      req.user.role
    );

    res.status(201).json(calculation);
  } catch (error) {
    console.error('Error creating manager financial calculation:', error);
    res.status(400).json({ error: error.message });
  }
});

// Complete workflow (Final Review -> Completed) + Auto-create Arrival records
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    // CHECK: Get inspection progress to see if all bags are inspected
    const progress = await PhysicalInspectionService.getInspectionProgress(req.params.id);
    const remainingBags = progress.remainingBags || 0;
    
    if (remainingBags > 0) {
      return res.status(400).json({ 
        error: `Cannot complete this lot! There are still ${remainingBags} bags remaining to be inspected. Please have the Physical Supervisor add the remaining bags first.`,
        remainingBags,
        inspectedBags: progress.inspectedBags,
        totalBags: progress.totalBags
      });
    }

    await WorkflowEngine.transitionTo(
      req.params.id, // Keep as UUID string
      'COMPLETED',
      req.user.userId, // Use userId from JWT token
      req.user.role
    );

    // ═══════════════════════════════════════════════════════════════════════
    // AUTO-CREATE ARRIVAL RECORDS from completed workflow data
    // This ensures data flows into kunchinittu ledger, outturn stock, paddy stock
    // ═══════════════════════════════════════════════════════════════════════
    try {
      const SampleEntry = require('../models/SampleEntry');
      const LotAllotment = require('../models/LotAllotment');
      const PhysicalInspection = require('../models/PhysicalInspection');
      const InventoryData = require('../models/InventoryData');
      const Arrival = require('../models/Arrival');
      const { Kunchinittu } = require('../models/Location');

      // Fetch the full sample entry with all associations
      const sampleEntry = await SampleEntry.findByPk(req.params.id, {
        include: [
          {
            model: LotAllotment,
            as: 'lotAllotment',
            include: [
              {
                model: PhysicalInspection,
                as: 'physicalInspections',
                include: [
                  {
                    model: InventoryData,
                    as: 'inventoryData',
                    required: false
                  }
                ]
              }
            ]
          },
          {
            model: require('../models/QualityParameters'),
            as: 'qualityParameters',
            required: false
          }
        ]
      });

      if (sampleEntry && sampleEntry.lotAllotment && sampleEntry.lotAllotment.physicalInspections) {
        const inspections = sampleEntry.lotAllotment.physicalInspections;
        let arrivalsCreated = 0;

        for (const inspection of inspections) {
          const invData = inspection.inventoryData;
          if (!invData) continue; // Skip inspections without inventory data

          // Generate SL No for each arrival
          const lastArrival = await Arrival.findOne({
            order: [['createdAt', 'DESC']],
            attributes: ['slNo']
          });
          let slNo = 'A01';
          if (lastArrival && lastArrival.slNo) {
            const lastNumber = parseInt(lastArrival.slNo.substring(1));
            slNo = `A${(lastNumber + 1).toString().padStart(2, '0')}`;
          }

          // Determine movementType and destination based on inventoryData.location
          let movementType = 'purchase';
          let toKunchinintuId = invData.kunchinittuId || null;
          let toWarehouseId = null;
          let outturnId = null;

          if (invData.location === 'DIRECT_OUTTURN_PRODUCTION') {
            // For production — goes to outturn
            outturnId = invData.outturnId || null;
            toKunchinintuId = null;
          } else if (toKunchinintuId) {
            // Normal purchase — get warehouse from kunchinittu
            const kunchinittu = await Kunchinittu.findByPk(toKunchinintuId, {
              attributes: ['id', 'warehouseId']
            });
            if (kunchinittu) {
              toWarehouseId = kunchinittu.warehouseId || null;
            }
          }

          const grossWeight = parseFloat(invData.grossWeight) || 0;
          const tareWeight = parseFloat(invData.tareWeight) || 0;
          const netWeight = grossWeight - tareWeight;

          // Create the Arrival record — auto-approved since it comes from completed workflow
          await Arrival.create({
            slNo,
            date: invData.entryDate || sampleEntry.entryDate,
            movementType,
            broker: sampleEntry.brokerName || null,
            variety: invData.variety ? invData.variety.trim().toUpperCase() : (sampleEntry.variety ? sampleEntry.variety.trim().toUpperCase() : null),
            bags: invData.bags || sampleEntry.bags || 0,
            fromLocation: sampleEntry.location || null,
            toKunchinintuId,
            toWarehouseId,
            outturnId,
            moisture: invData.moisture || null,
            cutting: (sampleEntry.qualityParameters?.cutting1 && sampleEntry.qualityParameters?.cutting2)
              ? `${sampleEntry.qualityParameters.cutting1} x ${sampleEntry.qualityParameters.cutting2}`
              : (sampleEntry.qualityParameters?.cutting1 || sampleEntry.qualityParameters?.cutting2 || null),
            wbNo: invData.wbNumber || 'N/A',
            grossWeight,
            tareWeight,
            netWeight,
            lorryNumber: inspection.lorryNumber || sampleEntry.lorryNumber || 'N/A',
            status: 'approved',
            createdBy: req.user.userId,
            approvedBy: req.user.userId,
            approvedAt: new Date(),
            adminApprovedBy: req.user.userId,
            adminApprovedAt: new Date(),
            remarks: `Auto-created from completed sample entry #${sampleEntry.id}`
          });

          arrivalsCreated++;
          console.log(`✅ Arrival ${slNo} created from sample entry ${sampleEntry.id} (inspection ${inspection.id})`);
        }

        console.log(`✅ Workflow COMPLETED: ${arrivalsCreated} arrival(s) auto-created for sample entry ${sampleEntry.id}`);
      }
    } catch (arrivalError) {
      // Log but don't fail the completion — arrival creation is secondary
      console.error('⚠️ Error auto-creating arrivals (workflow still completed):', arrivalError);
    }

    res.json({ message: 'Sample entry completed successfully' });
  } catch (error) {
    console.error('Error completing sample entry:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get sample entry ledger
router.get('/ledger/all', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, broker, variety, party, location, status, limit, page, pageSize } = req.query;

    const filters = {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      broker,
      variety,
      party,
      location,
      status,
      limit: limit ? parseInt(limit) : undefined,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 100
    };

    const ledger = await SampleEntryService.getSampleEntryLedger(filters);
    res.json(ledger);
  } catch (error) {
    console.error('Error getting sample entry ledger:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get inspection progress for a sample entry
router.get('/:id/inspection-progress', authenticateToken, async (req, res) => {
  try {
    const progress = await PhysicalInspectionService.getInspectionProgress(req.params.id);
    res.json(progress);
  } catch (error) {
    console.error('Error getting inspection progress:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
