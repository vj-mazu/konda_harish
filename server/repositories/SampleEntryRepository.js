const { SampleEntry, User, QualityParameters, CookingReport, LotAllotment, PhysicalInspection, InventoryData, FinancialCalculation, Kunchinittu, Outturn } = require('../models');
const { Variety } = require('../models/Location');
const { Op } = require('sequelize');

class SampleEntryRepository {
  async create(entryData) {
    const entry = await SampleEntry.create(entryData);
    return entry.toJSON();
  }

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
            as: 'physicalInspections',
            include: options.includeInventory ? [
              {
                model: InventoryData,
                as: 'inventoryData',
                include: [
                  ...(options.includeFinancial ? [{ model: FinancialCalculation, as: 'financialCalculation' }] : []),
                  { model: Kunchinittu, as: 'kunchinittu', required: false, include: [{ model: Variety, as: 'variety', attributes: ['id', 'name'] }] },
                  { model: Outturn, as: 'outturn', required: false }
                ]
              }
            ] : []
          },
          { model: User, as: 'supervisor', attributes: ['id', 'username'] }
        ] : []
      });
    }

    const entry = await SampleEntry.findByPk(id, { include });
    return entry ? entry.toJSON() : null;
  }

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

  async findByRoleAndFilters(role, filters = {}, userId) {
    const where = {};

    // Role-based filtering
    // FIX: inventory_staff can now see more statuses for second time inventory entries
    const roleStatusMap = {
      staff: ['STAFF_ENTRY'],
      quality_supervisor: ['STAFF_ENTRY', 'QUALITY_CHECK'],
      owner: null,
      admin: null,
      manager: ['QUALITY_CHECK', 'LOT_SELECTION', 'COOKING_REPORT', 'FINAL_REPORT', 'LOT_ALLOTMENT', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW'],
      physical_supervisor: ['LOT_ALLOTMENT', 'PHYSICAL_INSPECTION'],
      inventory_staff: ['PHYSICAL_INSPECTION', 'INVENTORY_ENTRY', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW'], // FIX: See entries for second time inventory too
      financial_account: ['OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW']
    };

    if (filters.status) {
      where.workflowStatus = filters.status;
    } else if (roleStatusMap[role] !== null && roleStatusMap[role]) {
      where.workflowStatus = roleStatusMap[role];
    }

    if (filters.startDate || filters.endDate) {
      where.entryDate = {};
      if (filters.startDate) where.entryDate[Op.gte] = filters.startDate;
      if (filters.endDate) where.entryDate[Op.lte] = filters.endDate;
    }

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
          required: role === 'physical_supervisor',
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
                    },
                    { model: Kunchinittu, as: 'kunchinittu', required: false, include: [{ model: Variety, as: 'variety', attributes: ['id', 'name'] }] },
                    { model: Outturn, as: 'outturn', required: false }
                  ]
                }
              ]
            }
          ]
        }
      ],
      limit: filters.limit || 500,
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

  async update(id, updates) {
    const entry = await SampleEntry.findByPk(id);
    if (!entry) return null;

    await entry.update(updates);
    return entry.toJSON();
  }

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
                    },
                    { model: Kunchinittu, as: 'kunchinittu', required: false, include: [{ model: Variety, as: 'variety', attributes: ['id', 'name'] }] },
                    { model: Outturn, as: 'outturn', required: false }
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
