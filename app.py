import json
import os
import random
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "a secret key"

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
        'difficulty': word_data['difficulty']
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
