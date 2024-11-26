const express = require('express');
const path = require('path');
const cors = require('cors');
const expressLayouts = require('express-ejs-layouts');
const { sequelize, GameProgress, GameStatistics, initializeDatabase } = require('./models/database');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('static'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));
app.use(expressLayouts);
app.set('layout', 'base');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Load words data
const WORDS_DATA = require('./static/data/words.json');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/get_difficulties', (req, res) => {
  try {
    const difficulties = [...new Set(WORDS_DATA.words.map(word => word.difficulty))];
    res.json(difficulties);
  } catch (error) {
    console.error('Error getting difficulties:', error);
    res.status(500).json({ error: 'Failed to get difficulties' });
  }
});

app.get('/get_word', (req, res) => {
  try {
    const difficulty = req.query.difficulty || 'easy';
    const filteredWords = WORDS_DATA.words.filter(word => word.difficulty === difficulty);
    const wordData = filteredWords.length > 0 
      ? filteredWords[Math.floor(Math.random() * filteredWords.length)]
      : WORDS_DATA.words[Math.floor(Math.random() * WORDS_DATA.words.length)];

    res.json({
      word: wordData.word,
      syllables: wordData.syllables,
      image: wordData.image,
      difficulty: wordData.difficulty,
      audio_enabled: true
    });
  } catch (error) {
    console.error('Error getting word:', error);
    res.status(500).json({ error: 'Failed to get word' });
  }
});

app.post('/record_progress', async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    const { word, difficulty, score } = req.body;

    if (!word || !difficulty || score === undefined) {
      await t.rollback();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Record progress
    await GameProgress.create({
      word,
      difficulty,
      score,
    }, { transaction: t });

    // Get or create statistics
    let stats = await GameStatistics.findOne({ transaction: t });
    if (!stats) {
      stats = await GameStatistics.create({}, { transaction: t });
    }

    // Update statistics
    const updateData = {
      totalScore: stats.totalScore + score,
      wordsCompleted: stats.wordsCompleted + 1,
      lastUpdated: new Date(),
    };

    switch (difficulty) {
      case 'easy':
        updateData.easyCompleted = stats.easyCompleted + 1;
        break;
      case 'medium':
        updateData.mediumCompleted = stats.mediumCompleted + 1;
        break;
      case 'hard':
        updateData.hardCompleted = stats.hardCompleted + 1;
        break;
    }

    await stats.update(updateData, { transaction: t });
    await t.commit();

    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    console.error('Error recording progress:', error);
    res.status(500).json({ error: 'Failed to record progress' });
  }
});

app.get('/get_statistics', async (req, res) => {
  try {
    let stats = await GameStatistics.findOne();
    if (!stats) {
      stats = await GameStatistics.create({});
    }

    res.json({
      total_score: stats.totalScore,
      words_completed: stats.wordsCompleted,
      easy_completed: stats.easyCompleted,
      medium_completed: stats.mediumCompleted,
      hard_completed: stats.hardCompleted
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
