const InventoryDataRepository = require('../repositories/InventoryDataRepository');
const ValidationService = require('./ValidationService');
const AuditService = require('./AuditService');
const WorkflowEngine = require('./WorkflowEngine');

class InventoryDataService {
  /**
   * Create inventory data
   * @param {Object} inventoryData - Inventory data
   * @param {number} userId - User ID creating the inventory data (inventory staff)
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Created inventory data
   */
  async createInventoryData(inventoryData, userId, userRole) {
    try {
      // Validate input data
      const validation = ValidationService.validateInventoryData(inventoryData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Validate required fields
      if (!inventoryData.physicalInspectionId) {
        throw new Error('Physical inspection ID is required');
      }

      inventoryData.recordedByUserId = userId;

      // Map frontend 'date' field to model's 'entryDate' field
      if (!inventoryData.entryDate && inventoryData.date) {
        inventoryData.entryDate = inventoryData.date;
      }

      // Net weight is auto-calculated by the model hook
      // But we can also calculate it here for validation
      inventoryData.netWeight = inventoryData.grossWeight - inventoryData.tareWeight;

      // Create inventory data
      const inventory = await InventoryDataRepository.create(inventoryData);

      // Log audit trail
      await AuditService.logCreate(userId, 'inventory_data', inventory.id, inventory);

      // Transition workflow to INVENTORY_ENTRY
      await WorkflowEngine.transitionTo(
        inventoryData.sampleEntryId,
        'INVENTORY_ENTRY',
        userId,
        userRole,
        { inventoryDataId: inventory.id }
      );

      return inventory;

    } catch (error) {
      console.error('Error creating inventory data:', error);
      throw error;
    }
  }

  /**
   * Get inventory data by physical inspection ID
   * @param {number} physicalInspectionId - Physical inspection ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Inventory data or null
   */
  async getInventoryDataByPhysicalInspection(physicalInspectionId, options = {}) {
    return await InventoryDataRepository.findByPhysicalInspectionId(physicalInspectionId, options);
  }

  /**
   * Update inventory data
   * @param {number} id - Inventory data ID
   * @param {Object} updates - Fields to update
   * @param {number} userId - User ID performing the update
   * @returns {Promise<Object|null>} Updated inventory data or null
   */
  async updateInventoryData(id, updates, userId) {
    try {
      const current = await InventoryDataRepository.findById(id);
      if (!current) {
        throw new Error('Inventory data not found');
      }

      // Validate updates if weights are being changed
      if (updates.grossWeight || updates.tareWeight) {
        const grossWeight = updates.grossWeight || current.grossWeight;
        const tareWeight = updates.tareWeight || current.tareWeight;

        const validation = ValidationService.validateWeights(grossWeight, tareWeight);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      const updated = await InventoryDataRepository.update(id, updates);

      await AuditService.logUpdate(userId, 'inventory_data', id, current, updated);

      return updated;

    } catch (error) {
      console.error('Error updating inventory data:', error);
      throw error;
    }
  }
}

module.exports = new InventoryDataService();
