/**
 * QualityParameters Model
 * 
 * Stores quality parameters added by Quality Supervisors.
 * Contains all quality measurement fields for rice sample evaluation.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QualityParameters = sequelize.define('QualityParameters', {
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
  reportedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reported_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  moisture: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  cutting1: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'cutting_1'
  },
  cutting2: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'cutting_2'
  },
  bend: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  mixS: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'mix_s'
  },
  mixL: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'mix_l'
  },
  mix: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  kandu: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  oil: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  sk: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  grainsCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'grains_count',
    validate: {
      min: 0
    }
  },
  wbR: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'wb_r'
  },
  wbBk: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'wb_bk'
  },
  wbT: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'wb_t'
  },
  paddyWb: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    field: 'paddy_wb'
  },
  reportedBy: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'reported_by'
  },
  uploadFileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'upload_file_url'
  }
}, {
  tableName: 'quality_parameters',
  underscored: true,
  indexes: [
    { fields: ['sample_entry_id'], unique: true },
    { fields: ['reported_by_user_id'] }
  ]
});

// Associations
QualityParameters.associate = (models) => {
  QualityParameters.belongsTo(models.SampleEntry, {
    foreignKey: 'sampleEntryId',
    as: 'sampleEntry'
  });
  
  QualityParameters.belongsTo(models.User, {
    foreignKey: 'reportedByUserId',
    as: 'reportedByUser'
  });
};

module.exports = QualityParameters;
