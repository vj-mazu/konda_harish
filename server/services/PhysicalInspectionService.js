const PhysicalInspectionRepository = require('../repositories/PhysicalInspectionRepository');
const AuditService = require('./AuditService');
const WorkflowEngine = require('./WorkflowEngine');
const FileUploadService = require('./FileUploadService');

class PhysicalInspectionService {
  /**
   * Create physical inspection
   * @param {Object} inspectionData - Physical inspection data
   * @param {number} userId - User ID creating the inspection (physical supervisor)
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Created physical inspection
   */
  async createPhysicalInspection(inspectionData, userId, userRole) {
    try {
      // Validate required fields
      if (!inspectionData.sampleEntryId) {
        throw new Error('Sample entry ID is required');
      }

      if (!inspectionData.inspectionDate || !inspectionData.lorryNumber || 
          !inspectionData.actualBags || inspectionData.cutting1 === undefined || 
          inspectionData.cutting2 === undefined || inspectionData.bend === undefined) {
        throw new Error('All required fields must be provided');
      }

      const SampleEntryRepository = require('../repositories/SampleEntryRepository');
      const LotAllotmentRepository = require('../repositories/LotAllotmentRepository');

      // Get the sample entry to validate bags
      const entry = await SampleEntryRepository.findById(inspectionData.sampleEntryId);
      if (!entry) {
        throw new Error('Sample entry not found');
      }

      // Get lot allotment for this entry
      const lotAllotment = await LotAllotmentRepository.findBySampleEntryId(inspectionData.sampleEntryId);
      if (!lotAllotment) {
        throw new Error('Lot allotment not found for this entry');
      }

      // Get existing inspections to calculate remaining bags
      const existingInspections = await PhysicalInspectionRepository.findBySampleEntryId(inspectionData.sampleEntryId);
      const totalInspected = existingInspections.reduce((sum, i) => sum + (i.bags || 0), 0);
      const remainingBags = entry.bags - totalInspected;

      // Validate that actualBags doesn't exceed remaining
      if (inspectionData.actualBags > remainingBags) {
        throw new Error(`Cannot inspect ${inspectionData.actualBags} bags. Only ${remainingBags} bags remaining.`);
      }

      // Prepare inspection data
      const newInspectionData = {
        sampleEntryId: inspectionData.sampleEntryId,
        lotAllotmentId: lotAllotment.id,
        reportedByUserId: userId,
        inspectionDate: inspectionData.inspectionDate,
        lorryNumber: inspectionData.lorryNumber,
        bags: inspectionData.actualBags,
        cutting1: inspectionData.cutting1,
        cutting2: inspectionData.cutting2,
        bend: inspectionData.bend,
        remarks: inspectionData.remarks || null,
        isComplete: false
      };

      // Check if this completes the inspection (all bags inspected)
      const newTotalInspected = totalInspected + inspectionData.actualBags;
      if (newTotalInspected >= entry.bags) {
        newInspectionData.isComplete = true;
      }

      // Create physical inspection
      const inspection = await PhysicalInspectionRepository.create(newInspectionData);

      // Log audit trail
      await AuditService.logCreate(userId, 'physical_inspections', inspection.id, inspection);

      // If this is the first inspection, transition workflow to PHYSICAL_INSPECTION
      if (existingInspections.length === 0) {
        await WorkflowEngine.transitionTo(
          inspectionData.sampleEntryId,
          'PHYSICAL_INSPECTION',
          userId,
          userRole,
          { physicalInspectionId: inspection.id }
        );
      }

      // If all bags are inspected, transition to next stage (INVENTORY_DATA)
      if (newInspectionData.isComplete) {
        await WorkflowEngine.transitionTo(
          inspectionData.sampleEntryId,
          'INVENTORY_DATA',
          userId,
          userRole,
          { allInspectionsComplete: true }
        );
      }

      return inspection;

    } catch (error) {
      console.error('Error creating physical inspection:', error);
      throw error;
    }
  }

  /**
   * Get physical inspection by lot allotment ID
   * @param {number} lotAllotmentId - Lot allotment ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Physical inspection or null
   */
  async getPhysicalInspectionByLotAllotment(lotAllotmentId, options = {}) {
    return await PhysicalInspectionRepository.findByLotAllotmentId(lotAllotmentId, options);
  }

  /**
   * Update physical inspection
   * @param {number} id - Physical inspection ID
   * @param {Object} updates - Fields to update
   * @param {number} userId - User ID performing the update
   * @returns {Promise<Object|null>} Updated physical inspection or null
   */
  async updatePhysicalInspection(id, updates, userId) {
    try {
      const current = await PhysicalInspectionRepository.findById(id);
      if (!current) {
        throw new Error('Physical inspection not found');
      }

      const updated = await PhysicalInspectionRepository.update(id, updates);

      await AuditService.logUpdate(userId, 'physical_inspections', id, current, updated);

      return updated;

    } catch (error) {
      console.error('Error updating physical inspection:', error);
      throw error;
    }
  }

  /**
   * Upload inspection images
   * @param {number} inspectionId - Physical inspection ID
   * @param {Object} files - Uploaded files
   * @param {Object} files.halfLorryImage - Half lorry image file
   * @param {Object} files.fullLorryImage - Full lorry image file
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated inspection with image URLs
   */
  async uploadInspectionImages(inspectionId, files, userId) {
    try {
      const updates = {};

      if (files.halfLorryImage) {
        const halfResult = await FileUploadService.uploadFile(files.halfLorryImage, { compress: true });
        updates.halfLorryImageUrl = halfResult.fileUrl;
      }

      if (files.fullLorryImage) {
        const fullResult = await FileUploadService.uploadFile(files.fullLorryImage, { compress: true });
        updates.fullLorryImageUrl = fullResult.fileUrl;
      }

      return await this.updatePhysicalInspection(inspectionId, updates, userId);

    } catch (error) {
      console.error('Error uploading inspection images:', error);
      throw error;
    }
  }

  /**
   * Get inspection progress for a sample entry
   * @param {string} sampleEntryId - Sample entry ID (UUID)
   * @returns {Promise<Object>} Inspection progress data
   */
  async getInspectionProgress(sampleEntryId) {
    try {
      const SampleEntryRepository = require('../repositories/SampleEntryRepository');
      
      // Get the sample entry to know total bags
      const entry = await SampleEntryRepository.findById(sampleEntryId);
      if (!entry) {
        throw new Error('Sample entry not found');
      }

      const totalBags = entry.bags;

      // Get all inspections for this entry
      const inspections = await PhysicalInspectionRepository.findBySampleEntryId(sampleEntryId);

      // Calculate total inspected bags
      const inspectedBags = inspections.reduce((sum, inspection) => sum + (inspection.bags || 0), 0);
      const remainingBags = totalBags - inspectedBags;
      const progressPercentage = totalBags > 0 ? (inspectedBags / totalBags) * 100 : 0;

      // Format previous inspections for frontend
      const previousInspections = inspections.map(inspection => ({
        id: inspection.id,
        inspectionDate: inspection.inspectionDate,
        lorryNumber: inspection.lorryNumber,
        bags: inspection.bags,
        cutting1: inspection.cutting1,
        cutting2: inspection.cutting2,
        bend: inspection.bend,
        reportedBy: inspection.reportedBy
      }));

      return {
        totalBags,
        inspectedBags,
        remainingBags,
        progressPercentage,
        previousInspections
      };

    } catch (error) {
      console.error('Error getting inspection progress:', error);
      throw error;
    }
  }
}

module.exports = new PhysicalInspectionService();
