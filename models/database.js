const { Sequelize, DataTypes } = require('sequelize');

// Parse DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: console.log,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

// GameProgress Model
const GameProgress = sequelize.define('GameProgress', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  word: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  difficulty: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
    field: 'completed_at'
  }
}, {
  tableName: 'GameProgress',
  timestamps: false
});

// GameStatistics Model
const GameStatistics = sequelize.define('GameStatistics', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  totalScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_score'
  },
  wordsCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'words_completed'
  },
  easyCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'easy_completed'
  },
  mediumCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'medium_completed'
  },
  hardCompleted: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'hard_completed'
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: Sequelize.NOW,
    field: 'last_updated'
  }
}, {
  tableName: 'GameStatistics',
  timestamps: false
});

// Initialize models (this will create tables if they don't exist)
async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    await sequelize.sync();
    console.log('Database models synchronized successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

module.exports = {
  sequelize,
  GameProgress,
  GameStatistics,
  initializeDatabase
};
