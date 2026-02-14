const SampleEntryRepository = require('../repositories/SampleEntryRepository');
const ValidationService = require('./ValidationService');
const AuditService = require('./AuditService');

class SampleEntryService {
  /**
   * Create a new sample entry
   * @param {Object} entryData - Sample entry data
   * @param {number} userId - User ID creating the entry
   * @returns {Promise<Object>} Created sample entry
   */
  async createSampleEntry(entryData, userId) {
    try {
      // Auto-fill date if not provided
      if (!entryData.date) {
        entryData.date = new Date();
      }

      // Validate input data
      const validation = ValidationService.validateSampleEntry(entryData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Set initial workflow status
      entryData.workflowStatus = 'STAFF_ENTRY';
      entryData.createdByUserId = userId;

      // Create sample entry
      const entry = await SampleEntryRepository.create(entryData);

      // Log audit trail
      await AuditService.logCreate(userId, 'sample_entries', entry.id, entry);

      return entry;

    } catch (error) {
      console.error('Error creating sample entry:', error);
      throw error;
    }
  }

  /**
   * Get sample entry by ID
   * @param {number} id - Sample entry ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Sample entry or null
   */
  async getSampleEntryById(id, options = {}) {
    return await SampleEntryRepository.findById(id, options);
  }

  /**
   * Get sample entries by workflow status
   * @param {string} status - Workflow status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of sample entries
   */
  async getSampleEntriesByStatus(status, options = {}) {
    return await SampleEntryRepository.findByStatus(status, options);
  }

  /**
   * Get sample entries by user role with filters
   * @param {string} role - User role
   * @param {Object} filters - Filter options
   * @param {number} userId - User ID performing the query
   * @returns {Promise<Object>} Object with entries and total count
   */
  async getSampleEntriesByRole(role, filters = {}, userId) {
    return await SampleEntryRepository.findByRoleAndFilters(role, filters, userId);
  }

  /**
   * Update sample entry
   * @param {number} id - Sample entry ID
   * @param {Object} updates - Fields to update
   * @param {number} userId - User ID performing the update
   * @returns {Promise<Object|null>} Updated entry or null
   */
  async updateSampleEntry(id, updates, userId) {
    try {
      // Get current entry
      const currentEntry = await SampleEntryRepository.findById(id);
      if (!currentEntry) {
        throw new Error('Sample entry not found');
      }

      // Update entry
      const updatedEntry = await SampleEntryRepository.update(id, updates);

      // Log audit trail
      await AuditService.logUpdate(
        userId,
        'sample_entries',
        id,
        currentEntry,
        updatedEntry
      );

      return updatedEntry;

    } catch (error) {
      console.error('Error updating sample entry:', error);
      throw error;
    }
  }

  /**
   * Get sample entry ledger with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of complete sample entry records
   */
  async getSampleEntryLedger(filters = {}) {
    return await SampleEntryRepository.getLedger(filters);
  }

  /**
   * Update offering price
   * @param {number} id - Sample entry ID
   * @param {Object} priceData - Price data
   * @param {number} priceData.offeringPrice - Offering price
   * @param {string} priceData.priceType - Price type (BAGS or LOOSE)
   * @param {number} priceData.finalPrice - Final price (optional)
   * @param {string} priceData.remarks - Remarks
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated entry
   */
  async updateOfferingPrice(id, priceData, userId) {
    const updates = {
      offeringPrice: priceData.offeringPrice,
      priceType: priceData.priceType,
      offeringRemarks: priceData.remarks
    };

    // Add finalPrice if provided
    if (priceData.finalPrice !== null && priceData.finalPrice !== undefined) {
      updates.finalPrice = priceData.finalPrice;
    }

    return await this.updateSampleEntry(id, updates, userId);
  }
}

module.exports = new SampleEntryService();
