const { SampleEntry, User, QualityParameters, CookingReport, LotAllotment, PhysicalInspection, InventoryData, FinancialCalculation } = require('../models');
const { Op } = require('sequelize');

class SampleEntryRepository {
  /**
   * Create a new sample entry
   * @param {Object} entryData - Sample entry data
   * @returns {Promise<Object>} Created sample entry
   */
  async create(entryData) {
    const entry = await SampleEntry.create(entryData);
    return entry.toJSON();
  }

  /**
   * Find sample entry by ID with optional associations
   * @param {number} id - Sample entry ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeQuality - Include quality parameters
   * @param {boolean} options.includeCooking - Include cooking report
   * @param {boolean} options.includeAllotment - Include lot allotment
   * @param {boolean} options.includeInspection - Include physical inspection
   * @param {boolean} options.includeInventory - Include inventory data
   * @param {boolean} options.includeFinancial - Include financial calculations
   * @returns {Promise<Object|null>} Sample entry or null
   */
  async findById(id, options = {}) {
    const include = [];

    if (options.includeQuality) {
      include.push({ model: QualityParameters, as: 'qualityParameters' });
    }
    if (options.includeCooking) {
      include.push({ model: CookingReport, as: 'cookingReport' });
    }
    if (options.includeAllotment) {
      include.push({
        model: LotAllotment,
        as: 'lotAllotment',
        include: options.includeInspection ? [
          {
            model: PhysicalInspection,
            as: 'physicalInspection',
            include: options.includeInventory ? [
              {
                model: InventoryData,
                as: 'inventoryData',
                include: options.includeFinancial ? [
                  { model: FinancialCalculation, as: 'financialCalculation' }
                ] : []
              }
            ] : []
          }
        ] : []
      });
    }

    const entry = await SampleEntry.findByPk(id, { include });
    return entry ? entry.toJSON() : null;
  }

  /**
   * Find sample entries by workflow status
   * @param {string} status - Workflow status
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit results
   * @param {number} options.offset - Offset for pagination
   * @param {string} options.orderBy - Order by field
   * @param {string} options.orderDir - Order direction (ASC/DESC)
   * @returns {Promise<Array>} Array of sample entries
   */
  async findByStatus(status, options = {}) {
    const queryOptions = {
      where: { workflowStatus: status },
      limit: options.limit || 100,
      offset: options.offset || 0,
      order: [[options.orderBy || 'createdAt', options.orderDir || 'DESC']]
    };

    const entries = await SampleEntry.findAll(queryOptions);
    return entries.map(entry => entry.toJSON());
  }

  /**
   * Find sample entries by user role and workflow status
   * @param {string} role - User role
   * @param {Object} filters - Filter options
   * @param {string} filters.status - Workflow status filter
   * @param {Date} filters.startDate - Start date filter
   * @param {Date} filters.endDate - End date filter
   * @param {string} filters.broker - Broker name filter
   * @param {string} filters.variety - Variety filter
   * @param {string} filters.party - Party name filter
   * @param {string} filters.location - Location filter
   * @param {number} filters.limit - Limit results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Object with entries and total count
   */
  async findByRoleAndFilters(role, filters = {}, userId) {
    const where = {};

    // Role-based filtering
    const roleStatusMap = {
      staff: ['STAFF_ENTRY'],
      quality_supervisor: ['STAFF_ENTRY', 'QUALITY_CHECK'], // See entries waiting for quality check AND in quality check
      owner: null, // Owner sees all
      admin: null, // Admin sees all
      manager: ['QUALITY_CHECK', 'LOT_SELECTION', 'COOKING_REPORT', 'FINAL_REPORT', 'LOT_ALLOTMENT', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW'], // Manager participates in many stages
      physical_supervisor: ['LOT_ALLOTMENT', 'PHYSICAL_INSPECTION'], // See entries waiting for inspection AND in progress
      inventory_staff: ['PHYSICAL_INSPECTION', 'INVENTORY_ENTRY'], // See entries waiting for inventory AND in progress
      financial_account: ['OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW']
    };

    if (filters.status) {
      where.workflowStatus = filters.status;
    } else if (roleStatusMap[role] !== null && roleStatusMap[role]) {
      where.workflowStatus = roleStatusMap[role];
    }
    // If roleStatusMap[role] is null (admin/owner), don't filter by status - show all

    // Date range filter
    if (filters.startDate || filters.endDate) {
      where.entryDate = {};
      if (filters.startDate) where.entryDate[Op.gte] = filters.startDate;
      if (filters.endDate) where.entryDate[Op.lte] = filters.endDate;
    }

    // Other filters
    if (filters.broker) where.brokerName = { [Op.like]: `%${filters.broker}%` };
    if (filters.variety) where.variety = { [Op.like]: `%${filters.variety}%` };
    if (filters.party) where.partyName = { [Op.like]: `%${filters.party}%` };
    if (filters.location) where.location = { [Op.like]: `%${filters.location}%` };

    const queryOptions = {
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        {
          model: QualityParameters,
          as: 'qualityParameters',
          required: false,
          include: [
            { model: User, as: 'reportedByUser', attributes: ['id', 'username'] }
          ]
        },
        { model: User, as: 'lotSelectionByUser', attributes: ['id', 'username'] },
        { model: CookingReport, as: 'cookingReport', required: false },
        {
          model: LotAllotment,
          as: 'lotAllotment',
          required: role === 'physical_supervisor', // Force join for supervisor filtering
          where: (role === 'physical_supervisor' && userId) ? { allottedToSupervisorId: userId } : undefined,
          include: [
            { model: User, as: 'supervisor', attributes: ['id', 'username'] },
            {
              model: PhysicalInspection,
              as: 'physicalInspections',
              required: false,
              include: [
                { model: User, as: 'reportedBy', attributes: ['id', 'username'] },
                {
                  model: InventoryData,
                  as: 'inventoryData',
                  required: false,
                  include: [
                    { model: User, as: 'recordedBy', attributes: ['id', 'username'] },
                    {
                      model: FinancialCalculation,
                      as: 'financialCalculation',
                      required: false,
                      include: [
                        { model: User, as: 'owner', attributes: ['id', 'username'] },
                        { model: User, as: 'manager', attributes: ['id', 'username'] }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      order: [['createdAt', 'DESC']],
      distinct: true,
      subQuery: false
    };

    const { count, rows } = await SampleEntry.findAndCountAll(queryOptions);

    return {
      entries: rows.map(entry => entry.toJSON()),
      total: count
    };
  }

  /**
   * Update sample entry
   * @param {number} id - Sample entry ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated entry or null
   */
  async update(id, updates) {
    const entry = await SampleEntry.findByPk(id);
    if (!entry) return null;

    await entry.update(updates);
    return entry.toJSON();
  }

  /**
   * Get sample entry ledger with all related data
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of complete sample entry records
   */
  async getLedger(filters = {}) {
    const where = {};

    if (filters.startDate || filters.endDate) {
      where.entryDate = {};
      if (filters.startDate) where.entryDate[Op.gte] = filters.startDate;
      if (filters.endDate) where.entryDate[Op.lte] = filters.endDate;
    }
    if (filters.broker) where.brokerName = { [Op.like]: `%${filters.broker}%` };
    if (filters.variety) where.variety = { [Op.like]: `%${filters.variety}%` };
    if (filters.party) where.partyName = { [Op.like]: `%${filters.party}%` };
    if (filters.location) where.location = { [Op.like]: `%${filters.location}%` };
    if (filters.status) where.workflowStatus = filters.status;

    const page = filters.page || 1;
    const pageSize = filters.pageSize || 100;
    const offset = (page - 1) * pageSize;

    const { count, rows } = await SampleEntry.findAndCountAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'username'] },
        {
          model: QualityParameters,
          as: 'qualityParameters',
          required: false,
          include: [{ model: User, as: 'reportedByUser', attributes: ['id', 'username'] }]
        },
        { model: User, as: 'lotSelectionByUser', attributes: ['id', 'username'] },
        { model: CookingReport, as: 'cookingReport', required: false },
        {
          model: LotAllotment,
          as: 'lotAllotment',
          required: false,
          include: [
            { model: User, as: 'supervisor', attributes: ['id', 'username'] },
            {
              model: PhysicalInspection,
              as: 'physicalInspections',
              required: false,
              include: [
                { model: User, as: 'reportedBy', attributes: ['id', 'username'] },
                {
                  model: InventoryData,
                  as: 'inventoryData',
                  required: false,
                  include: [
                    { model: User, as: 'recordedBy', attributes: ['id', 'username'] },
                    {
                      model: FinancialCalculation,
                      as: 'financialCalculation',
                      required: false,
                      include: [
                        { model: User, as: 'owner', attributes: ['id', 'username'] },
                        { model: User, as: 'manager', attributes: ['id', 'username'] }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      order: [['entryDate', 'DESC'], ['createdAt', 'DESC']],
      limit: pageSize,
      offset,
      distinct: true,
      subQuery: false
    });

    return {
      entries: rows.map(entry => entry.toJSON()),
      total: count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize)
    };
  }
}

module.exports = new SampleEntryRepository();
