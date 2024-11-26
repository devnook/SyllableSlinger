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

// Initialize models with retry logic
async function initializeDatabase(retries = 5, delay = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('Database connection established successfully.');

      // Sync models without force
      await sequelize.sync({ force: false });
      console.log('Database models synchronized successfully.');
      return true;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error);
      
      if (attempt === retries) {
        console.error('Max retries reached. Could not establish database connection.');
        throw error;
      }
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  return false;
}

module.exports = {
  sequelize,
  GameProgress,
  GameStatistics,
  initializeDatabase
};
