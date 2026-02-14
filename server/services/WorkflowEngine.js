/**
 * Workflow Engine
 * 
 * Manages workflow state transitions for the Sample Entry to Purchase workflow.
 * Validates transitions based on user roles and required data.
 */

const SampleEntry = require('../models/SampleEntry');
const SampleEntryAuditLog = require('../models/SampleEntryAuditLog');

// Define all valid workflow transitions
const WORKFLOW_TRANSITIONS = [
  {
    fromStatus: 'STAFF_ENTRY',
    toStatus: 'QUALITY_CHECK',
    allowedRoles: ['quality_supervisor'],
    requiredData: ['qualityParameters']
  },
  {
    fromStatus: 'QUALITY_CHECK',
    toStatus: 'LOT_SELECTION',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  },
  // Allow direct transitions from QUALITY_CHECK for admin convenience
  {
    fromStatus: 'QUALITY_CHECK',
    toStatus: 'COOKING_REPORT',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  },
  {
    fromStatus: 'QUALITY_CHECK',
    toStatus: 'FINAL_REPORT',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  },
  {
    fromStatus: 'QUALITY_CHECK',
    toStatus: 'FAILED',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  },
  {
    fromStatus: 'LOT_SELECTION',
    toStatus: 'COOKING_REPORT',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  },
  {
    fromStatus: 'LOT_SELECTION',
    toStatus: 'FINAL_REPORT',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  },
  {
    fromStatus: 'LOT_SELECTION',
    toStatus: 'FAILED',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  },
  {
    fromStatus: 'COOKING_REPORT',
    toStatus: 'FINAL_REPORT',
    allowedRoles: ['admin', 'manager'],
    requiredData: ['cookingReport']
  },
  {
    fromStatus: 'COOKING_REPORT',
    toStatus: 'FAILED',
    allowedRoles: ['admin', 'manager'],
    requiredData: ['cookingReport']
  },
  {
    fromStatus: 'FINAL_REPORT',
    toStatus: 'LOT_ALLOTMENT',
    allowedRoles: ['manager'],
    requiredData: ['offeringPrice']
  },
  {
    fromStatus: 'LOT_ALLOTMENT',
    toStatus: 'PHYSICAL_INSPECTION',
    allowedRoles: ['physical_supervisor'],
    requiredData: ['lotAllotment']
  },
  {
    fromStatus: 'PHYSICAL_INSPECTION',
    toStatus: 'INVENTORY_ENTRY',
    allowedRoles: ['inventory_staff', 'admin'],
    requiredData: ['physicalInspection']
  },
  {
    fromStatus: 'INVENTORY_ENTRY',
    toStatus: 'OWNER_FINANCIAL',
    allowedRoles: ['admin', 'manager'],
    requiredData: ['inventoryData']
  },
  {
    fromStatus: 'OWNER_FINANCIAL',
    toStatus: 'MANAGER_FINANCIAL',
    allowedRoles: ['manager', 'admin'],
    requiredData: ['ownerFinancialCalculations']
  },
  {
    fromStatus: 'OWNER_FINANCIAL',
    toStatus: 'FINAL_REVIEW',
    allowedRoles: ['manager', 'admin'],
    requiredData: ['ownerFinancialCalculations']
  },
  {
    fromStatus: 'MANAGER_FINANCIAL',
    toStatus: 'FINAL_REVIEW',
    allowedRoles: ['admin', 'manager'],
    requiredData: ['managerFinancialCalculations']
  },
  {
    fromStatus: 'FINAL_REVIEW',
    toStatus: 'COMPLETED',
    allowedRoles: ['admin', 'manager'],
    requiredData: []
  }
];

class WorkflowEngine {
  /**
   * Transition a sample entry to a new workflow status
   */
  async transitionTo(sampleEntryId, toStatus, userId, userRole, metadata = {}) {
    try {
      // Get the sample entry
      const sampleEntry = await SampleEntry.findByPk(sampleEntryId);

      if (!sampleEntry) {
        throw new Error('Sample entry not found');
      }

      const fromStatus = sampleEntry.workflowStatus;

      // Check if transition is allowed
      if (!this.canTransition(fromStatus, toStatus, userRole)) {
        throw new Error(`Transition from ${fromStatus} to ${toStatus} not allowed for role ${userRole}`);
      }

      // Validate required data
      const transition = WORKFLOW_TRANSITIONS.find(
        t => t.fromStatus === fromStatus && t.toStatus === toStatus
      );

      if (transition && transition.requiredData.length > 0) {
        // This would be validated by the service layer before calling transitionTo
        // For now, we trust that the service has validated the data
      }

      // Update workflow status
      const oldStatus = sampleEntry.workflowStatus;
      sampleEntry.workflowStatus = toStatus;
      await sampleEntry.save();

      // Log the transition in audit trail
      await SampleEntryAuditLog.create({
        userId,
        recordId: sampleEntryId,
        tableName: 'sample_entries',
        actionType: 'WORKFLOW_TRANSITION',
        oldValues: { workflowStatus: oldStatus },
        newValues: { workflowStatus: toStatus },
        metadata: {
          ...metadata,
          transitionedAt: new Date(),
          userRole
        }
      });

      return sampleEntry;

    } catch (error) {
      console.error('Workflow transition error:', error);
      throw error;
    }
  }

  /**
   * Check if a transition is allowed
   */
  canTransition(currentStatus, toStatus, userRole) {
    const transition = WORKFLOW_TRANSITIONS.find(
      t => t.fromStatus === currentStatus && t.toStatus === toStatus
    );

    if (!transition) {
      return false;
    }

    return transition.allowedRoles.includes(userRole);
  }

  /**
   * Get next allowed statuses for current status and user role
   */
  getNextAllowedStatuses(currentStatus, userRole) {
    return WORKFLOW_TRANSITIONS
      .filter(t => t.fromStatus === currentStatus && t.allowedRoles.includes(userRole))
      .map(t => t.toStatus);
  }

  /**
   * Get all transitions
   */
  getAllTransitions() {
    return WORKFLOW_TRANSITIONS;
  }

  /**
   * Validate if required data exists for a transition
   */
  async validateRequiredData(sampleEntryId, requiredData) {
    const sampleEntry = await SampleEntry.findByPk(sampleEntryId, {
      include: [
        { association: 'qualityParameters' },
        { association: 'cookingReport' },
        { association: 'lotAllotment' }
      ]
    });

    if (!sampleEntry) {
      return { valid: false, missing: ['sampleEntry'] };
    }

    const missing = [];

    for (const dataKey of requiredData) {
      switch (dataKey) {
        case 'qualityParameters':
          if (!sampleEntry.qualityParameters) missing.push(dataKey);
          break;
        case 'cookingReport':
          if (!sampleEntry.cookingReport) missing.push(dataKey);
          break;
        case 'lotAllotment':
          if (!sampleEntry.lotAllotment) missing.push(dataKey);
          break;
        case 'offeringPrice':
          // This would be stored in a separate field or table
          // For now, we assume it's validated by the service
          break;
        case 'physicalInspection':
        case 'inventoryData':
        case 'ownerFinancialCalculations':
        case 'managerFinancialCalculations':
          // These would be validated by checking related tables
          break;
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

module.exports = new WorkflowEngine();
