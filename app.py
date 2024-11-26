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
db = SQLAlchemy(app)

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

@app.route('/get_categories')
def get_categories():
    categories = list(set(word['category'] for word in WORDS_DATA['words']))
    return jsonify(categories)

@app.route('/get_word')
def get_word():
    difficulty = request.args.get('difficulty', 'easy')
    category = request.args.get('category', None)
    
    filtered_words = WORDS_DATA['words']
    
    if difficulty:
        filtered_words = [word for word in filtered_words if word['difficulty'] == difficulty]
    
    if category:
        filtered_words = [word for word in filtered_words if word['category'] == category]
    
    if not filtered_words:
        filtered_words = WORDS_DATA['words']
    
    word_data = random.choice(filtered_words)
    return jsonify({
        'word': word_data['word'],
        'syllables': word_data['syllables'],
        'image': word_data['image'],
        'difficulty': word_data['difficulty']
    })

@app.route('/record_progress', methods=['POST'])
def record_progress():
    data = request.json
    word = data.get('word')
    difficulty = data.get('difficulty')
    score = data.get('score')

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
    
    db.session.commit()
    return jsonify({'success': True})

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
