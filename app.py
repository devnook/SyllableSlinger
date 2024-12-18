import json
import os
import random
from datetime import datetime
from flask import Flask, render_template, jsonify, request
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True  # Enable SQL query logging
db = SQLAlchemy(app)

# Configure logging
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database Models
class GameProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    word = db.Column(db.String(100), nullable=False)
    difficulty = db.Column(db.String(20), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameStatistics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    total_score = db.Column(db.Integer, default=0)
    words_completed = db.Column(db.Integer, default=0)
    easy_completed = db.Column(db.Integer, default=0)
    medium_completed = db.Column(db.Integer, default=0)
    hard_completed = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def get_or_create(cls):
        stats = cls.query.first()
        if not stats:
            stats = cls()
            db.session.add(stats)
            db.session.commit()
        return stats

# Load words data
with open('static/data/words.json', 'r') as f:
    WORDS_DATA = json.load(f)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/get_difficulties')
def get_difficulties():
    difficulties = list(set(word['difficulty'] for word in WORDS_DATA['words']))
    return jsonify(difficulties)

@app.route('/get_word')
def get_word():
    difficulty = request.args.get('difficulty', 'easy')
    filtered_words = [word for word in WORDS_DATA['words'] if word['difficulty'] == difficulty]
    if not filtered_words:
        filtered_words = WORDS_DATA['words']
    
    word_data = random.choice(filtered_words)
    return jsonify({
        'word': word_data['word'],
        'syllables': word_data['syllables'],
        'image': word_data['image'],
        'difficulty': word_data['difficulty'],
        'audio_enabled': True
    })

@app.route('/record_progress', methods=['POST'])
def record_progress():
    try:
        data = request.json
        if not data:
            logger.error("No JSON data received in request")
            return jsonify({'error': 'No data provided'}), 400

        word = data.get('word')
        difficulty = data.get('difficulty')
        score = data.get('score')

        if not all([word, difficulty, score]):
            logger.error(f"Missing required fields in request: {data}")
            return jsonify({'error': 'Missing required fields'}), 400

        # Record progress
        progress = GameProgress(word=word, difficulty=difficulty, score=score)
        db.session.add(progress)

        # Update statistics
        stats = GameStatistics.get_or_create()
        stats.total_score += score
        stats.words_completed += 1
        
        if difficulty == 'easy':
            stats.easy_completed += 1
        elif difficulty == 'medium':
            stats.medium_completed += 1
        elif difficulty == 'hard':
            stats.hard_completed += 1

        stats.last_updated = datetime.utcnow()
        
        try:
            db.session.commit()
            logger.info(f"Successfully recorded progress for word: {word}")
            return jsonify({'success': True})
        except Exception as e:
            db.session.rollback()
            logger.error(f"Database error while recording progress: {str(e)}")
            return jsonify({'error': 'Database error'}), 500

    except Exception as e:
        logger.error(f"Error processing progress recording request: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/get_statistics')
def get_statistics():
    stats = GameStatistics.get_or_create()
    return jsonify({
        'total_score': stats.total_score,
        'words_completed': stats.words_completed,
        'easy_completed': stats.easy_completed,
        'medium_completed': stats.medium_completed,
        'hard_completed': stats.hard_completed
    })

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000)
