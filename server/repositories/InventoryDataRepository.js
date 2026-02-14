const InventoryData = require('../models/InventoryData');
const FinancialCalculation = require('../models/FinancialCalculation');

class InventoryDataRepository {
  /**
   * Create inventory data
   * @param {Object} inventoryData - Inventory data
   * @returns {Promise<Object>} Created inventory data
   */
  async create(inventoryData) {
    const inventory = await InventoryData.create(inventoryData);
    return inventory.toJSON();
  }

  /**
   * Find inventory data by physical inspection ID
   * @param {number} physicalInspectionId - Physical inspection ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeFinancial - Include financial calculation
   * @returns {Promise<Object|null>} Inventory data or null
   */
  async findByPhysicalInspectionId(physicalInspectionId, options = {}) {
    const include = [];
    
    if (options.includeFinancial) {
      include.push({ model: FinancialCalculation, as: 'financialCalculation' });
    }
    
    const inventory = await InventoryData.findOne({
      where: { physicalInspectionId },
      include
    });
    return inventory ? inventory.toJSON() : null;
  }

  /**
   * Find inventory data by ID
   * @param {number} id - Inventory data ID
   * @returns {Promise<Object|null>} Inventory data or null
   */
  async findById(id) {
    const inventory = await InventoryData.findByPk(id);
    return inventory ? inventory.toJSON() : null;
  }

  /**
   * Update inventory data
   * @param {number} id - Inventory data ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated inventory data or null
   */
  async update(id, updates) {
    const inventory = await InventoryData.findByPk(id);
    if (!inventory) return null;
    
    await inventory.update(updates);
    return inventory.toJSON();
  }

  /**
   * Update inventory data by physical inspection ID
   * @param {number} physicalInspectionId - Physical inspection ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated inventory data or null
   */
  async updateByPhysicalInspectionId(physicalInspectionId, updates) {
    const inventory = await InventoryData.findOne({
      where: { physicalInspectionId }
    });
    if (!inventory) return null;
    
    await inventory.update(updates);
    return inventory.toJSON();
  }
}

module.exports = new InventoryDataRepository();
