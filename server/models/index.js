/**
 * Models Index
 * 
 * Initializes all models and sets up associations
 */

const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const SampleEntry = require('./SampleEntry');
const QualityParameters = require('./QualityParameters');
const CookingReport = require('./CookingReport');
const LotAllotment = require('./LotAllotment');
const PhysicalInspection = require('./PhysicalInspection');
const InventoryData = require('./InventoryData');
const FinancialCalculation = require('./FinancialCalculation');
const SampleEntryAuditLog = require('./SampleEntryAuditLog');
const Broker = require('./Broker');

// Create models object
const models = {
  User,
  SampleEntry,
  QualityParameters,
  CookingReport,
  LotAllotment,
  PhysicalInspection,
  InventoryData,
  FinancialCalculation,
  SampleEntryAuditLog,
  Broker
};

// Initialize associations for all models that have them
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export models and sequelize
module.exports = {
  sequelize,
  ...models
};
