/**
 * CookingReport Model
 * 
 * Stores cooking test evaluation results by Owner/Admin.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CookingReport = sequelize.define('CookingReport', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sampleEntryId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'sample_entry_id',
    references: {
      model: 'sample_entries',
      key: 'id'
    }
  },
  reviewedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reviewed_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('PASS', 'FAIL', 'RECHECK', 'MEDIUM'),
    allowNull: false
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'cooking_reports',
  underscored: true,
  indexes: [
    { fields: ['sample_entry_id'], unique: true },
    { fields: ['status'] }
  ]
});

CookingReport.associate = (models) => {
  CookingReport.belongsTo(models.SampleEntry, {
    foreignKey: 'sampleEntryId',
    as: 'sampleEntry'
  });
  
  CookingReport.belongsTo(models.User, {
    foreignKey: 'reviewedByUserId',
    as: 'reviewedBy'
  });
};

module.exports = CookingReport;
