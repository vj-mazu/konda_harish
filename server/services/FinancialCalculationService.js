const FinancialCalculationRepository = require('../repositories/FinancialCalculationRepository');
const InventoryDataRepository = require('../repositories/InventoryDataRepository');
const FinancialCalculator = require('./FinancialCalculator');
const ValidationService = require('./ValidationService');
const AuditService = require('./AuditService');
const WorkflowEngine = require('./WorkflowEngine');

class FinancialCalculationService {
  /**
   * Create financial calculation (Owner/Admin phase)
   * @param {Object} calculationData - Financial calculation data
   * @param {number} userId - User ID creating the calculation (owner/admin)
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Created financial calculation
   */
  async createFinancialCalculation(calculationData, userId, userRole) {
    try {
      // Validate input data
      const validation = ValidationService.validateFinancialCalculation(calculationData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Get inventory data for calculations
      const inventory = await InventoryDataRepository.findById(calculationData.inventoryDataId);
      if (!inventory) {
        throw new Error('Inventory data not found');
      }

      // Perform calculations
      const calculationContext = {
        actualNetWeight: inventory.netWeight,
        bags: inventory.bags,
        suteType: calculationData.suteType,
        suteRate: calculationData.suteRate,
        baseRateType: calculationData.baseRateType,
        baseRateUnit: calculationData.baseRateUnit,
        baseRateValue: calculationData.baseRateValue || calculationData.baseRate,
        customDivisor: calculationData.customDivisor,
        brokerageUnit: calculationData.brokerageUnit,
        brokerageRate: calculationData.brokerageRate,
        egbRate: calculationData.egbRate,
        lfinUnit: calculationData.lfinUnit || 'PER_BAG',
        lfinRate: calculationData.lfinRate || 0,
        hamaliUnit: calculationData.hamaliUnit || 'PER_BAG',
        hamaliRate: calculationData.hamaliRate || 0
      };

      const result = FinancialCalculator.calculateComplete(calculationContext);

      // Merge calculated values with input data
      const finalData = {
        ...calculationData,
        ...result,
        ownerCalculatedBy: userId,
        calculationType: 'OWNER' // First calculation is by owner
      };

      // Create financial calculation
      const calculation = await FinancialCalculationRepository.create(finalData);

      // Log audit trail
      await AuditService.logCreate(userId, 'financial_calculations', calculation.id, calculation);

      // Transition workflow to OWNER_FINANCIAL
      await WorkflowEngine.transitionTo(
        calculationData.sampleEntryId,
        'OWNER_FINANCIAL',
        userId,
        userRole,
        { financialCalculationId: calculation.id }
      );

      return calculation;

    } catch (error) {
      console.error('Error creating financial calculation:', error);
      throw error;
    }
  }

  /**
   * Create manager financial calculation
   * @param {Object} calculationData - Financial calculation data
   * @param {number} userId - User ID creating the calculation (manager)
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Created financial calculation
   */
  async createManagerFinancialCalculation(calculationData, userId, userRole) {
    try {
      // Similar to owner calculation but with MANAGER type
      const validation = ValidationService.validateFinancialCalculation(calculationData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const inventory = await InventoryDataRepository.findById(calculationData.inventoryDataId);
      if (!inventory) {
        throw new Error('Inventory data not found');
      }

      const calculationContext = {
        actualNetWeight: inventory.netWeight,
        bags: inventory.bags,
        suteType: calculationData.suteType,
        suteRate: calculationData.suteRate,
        baseRateType: calculationData.baseRateType,
        baseRateUnit: calculationData.baseRateUnit,
        baseRateValue: calculationData.baseRateValue || calculationData.baseRate,
        customDivisor: calculationData.customDivisor,
        brokerageUnit: calculationData.brokerageUnit,
        brokerageRate: calculationData.brokerageRate,
        egbRate: calculationData.egbRate,
        lfinUnit: calculationData.lfinUnit || 'PER_BAG',
        lfinRate: calculationData.lfinRate || 0,
        hamaliUnit: calculationData.hamaliUnit || 'PER_BAG',
        hamaliRate: calculationData.hamaliRate || 0
      };

      const result = FinancialCalculator.calculateComplete(calculationContext);

      const finalData = {
        ...calculationData,
        ...result,
        managerCalculatedBy: userId,
        calculationType: 'MANAGER'
      };

      const calculation = await FinancialCalculationRepository.updateByInventoryDataId(
        calculationData.inventoryDataId,
        finalData
      );

      await AuditService.logCreate(userId, 'financial_calculations', calculation.id, calculation);

      // Transition workflow to FINAL_REVIEW (manager calculations complete)
      await WorkflowEngine.transitionTo(
        calculationData.sampleEntryId,
        'FINAL_REVIEW',
        userId,
        userRole,
        { managerFinancialCalculationId: calculation.id }
      );

      return calculation;

    } catch (error) {
      console.error('Error creating manager financial calculation:', error);
      throw error;
    }
  }

  /**
   * Get financial calculation by inventory data ID
   * @param {number} inventoryDataId - Inventory data ID
   * @returns {Promise<Object|null>} Financial calculation or null
   */
  async getFinancialCalculationByInventoryData(inventoryDataId) {
    return await FinancialCalculationRepository.findByInventoryDataId(inventoryDataId);
  }

  /**
   * Update financial calculation
   * @param {number} id - Financial calculation ID
   * @param {Object} updates - Fields to update
   * @param {number} userId - User ID performing the update
   * @returns {Promise<Object|null>} Updated financial calculation or null
   */
  async updateFinancialCalculation(id, updates, userId) {
    try {
      const current = await FinancialCalculationRepository.findById(id);
      if (!current) {
        throw new Error('Financial calculation not found');
      }

      // If calculation parameters are updated, recalculate
      if (updates.suteRate || updates.baseRate || updates.brokerageRate ||
        updates.egbRate || updates.lfinRate || updates.hamaliRate) {

        const inventory = await InventoryDataRepository.findById(current.inventoryDataId);

        const calculationContext = {
          actualNetWeight: inventory.netWeight,
          bags: inventory.bags,
          suteType: updates.suteType || current.suteType,
          suteRate: updates.suteRate || current.suteRate,
          baseRateType: updates.baseRateType || current.baseRateType,
          baseRateUnit: updates.baseRateUnit || current.baseRateUnit,
          baseRateValue: updates.baseRateValue || updates.baseRate || current.baseRateValue || current.baseRate,
          customDivisor: updates.customDivisor || current.customDivisor,
          brokerageUnit: updates.brokerageUnit || current.brokerageUnit,
          brokerageRate: updates.brokerageRate || current.brokerageRate,
          egbRate: updates.egbRate || current.egbRate,
          lfinUnit: updates.lfinUnit || current.lfinUnit || 'PER_BAG',
          lfinRate: updates.lfinRate != null ? updates.lfinRate : current.lfinRate,
          hamaliUnit: updates.hamaliUnit || current.hamaliUnit || 'PER_BAG',
          hamaliRate: updates.hamaliRate != null ? updates.hamaliRate : current.hamaliRate
        };

        const result = FinancialCalculator.calculateComplete(calculationContext);
        updates = { ...updates, ...result };
      }

      const updated = await FinancialCalculationRepository.update(id, updates);

      await AuditService.logUpdate(userId, 'financial_calculations', id, current, updated);

      return updated;

    } catch (error) {
      console.error('Error updating financial calculation:', error);
      throw error;
    }
  }

  /**
   * Recalculate financial data
   * @param {number} id - Financial calculation ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Recalculated financial calculation
   */
  async recalculate(id, userId) {
    try {
      const current = await FinancialCalculationRepository.findById(id);
      if (!current) {
        throw new Error('Financial calculation not found');
      }

      const inventory = await InventoryDataRepository.findById(current.inventoryDataId);

      const calculationContext = {
        actualNetWeight: inventory.netWeight,
        bags: inventory.bags,
        suteType: current.suteType,
        suteRate: current.suteRate,
        baseRateType: current.baseRateType,
        baseRateUnit: current.baseRateUnit,
        baseRateValue: current.baseRateValue || current.baseRate,
        customDivisor: current.customDivisor,
        brokerageUnit: current.brokerageUnit,
        brokerageRate: current.brokerageRate,
        egbRate: current.egbRate,
        lfinUnit: current.lfinUnit || 'PER_BAG',
        lfinRate: current.lfinRate || 0,
        hamaliUnit: current.hamaliUnit || 'PER_BAG',
        hamaliRate: current.hamaliRate || 0
      };

      const result = FinancialCalculator.calculateComplete(calculationContext);

      return await this.updateFinancialCalculation(id, result, userId);

    } catch (error) {
      console.error('Error recalculating financial data:', error);
      throw error;
    }
  }
}

module.exports = new FinancialCalculationService();
