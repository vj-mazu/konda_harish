const CookingReportRepository = require('../repositories/CookingReportRepository');
const AuditService = require('./AuditService');
const WorkflowEngine = require('./WorkflowEngine');

class CookingReportService {
  /**
   * Create cooking report
   * @param {Object} reportData - Cooking report data
   * @param {number} userId - User ID creating the report
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Created cooking report
   */
  async createCookingReport(reportData, userId, userRole) {
    try {
      // Validate required fields
      if (!reportData.sampleEntryId || !reportData.status) {
        throw new Error('Sample entry ID and status are required');
      }

      // Validate status
      const validStatuses = ['PASS', 'FAIL', 'RECHECK', 'MEDIUM'];
      if (!validStatuses.includes(reportData.status)) {
        throw new Error('Invalid cooking report status');
      }

      reportData.reviewedByUserId = userId;

      // Create cooking report
      const report = await CookingReportRepository.create(reportData);

      // Log audit trail
      await AuditService.logCreate(userId, 'cooking_reports', report.id, report);

      // Transition workflow based on status
      let nextStatus;
      if (reportData.status === 'PASS') {
        nextStatus = 'FINAL_REPORT';
      } else if (reportData.status === 'FAIL') {
        nextStatus = 'FAILED';
      } else {
        // RECHECK or MEDIUM - stay in COOKING_REPORT
        return report;
      }

      await WorkflowEngine.transitionTo(
        reportData.sampleEntryId,
        nextStatus,
        userId,
        userRole,
        { cookingReportId: report.id, cookingStatus: reportData.status }
      );

      return report;

    } catch (error) {
      console.error('Error creating cooking report:', error);
      throw error;
    }
  }

  /**
   * Get cooking report by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @returns {Promise<Object|null>} Cooking report or null
   */
  async getCookingReportBySampleEntry(sampleEntryId) {
    return await CookingReportRepository.findBySampleEntryId(sampleEntryId);
  }

  /**
   * Update cooking report
   * @param {number} id - Cooking report ID
   * @param {Object} updates - Fields to update
   * @param {number} userId - User ID performing the update
   * @returns {Promise<Object|null>} Updated cooking report or null
   */
  async updateCookingReport(id, updates, userId) {
    try {
      const current = await CookingReportRepository.findBySampleEntryId(updates.sampleEntryId);
      if (!current) {
        throw new Error('Cooking report not found');
      }

      const updated = await CookingReportRepository.update(id, updates);

      await AuditService.logUpdate(userId, 'cooking_reports', id, current, updated);

      return updated;

    } catch (error) {
      console.error('Error updating cooking report:', error);
      throw error;
    }
  }

  /**
   * Get cooking reports by status
   * @param {string} status - Cooking report status
   * @returns {Promise<Array>} Array of cooking reports
   */
  async getCookingReportsByStatus(status) {
    return await CookingReportRepository.findByStatus(status);
  }
}

module.exports = new CookingReportService();
