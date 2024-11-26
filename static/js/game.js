document.addEventListener('DOMContentLoaded', function() {
    let score = 0;
    let currentWord = '';
    let currentDifficulty = 'easy';
    let syllables = [];
    
    // Initialize audio
    const synth = new Tone.Synth().toDestination();
    const successSound = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }
    }).toDestination();
    const errorSound = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.2, release: 0.1 }
    }).toDestination();

    // Function to play syllable sound
    function playSyllableSound() {
        synth.triggerAttackRelease('C4', '8n');
    }

    // Function to play success sound
    function playSuccessSound() {
        successSound.triggerAttackRelease('G4', '8n');
        setTimeout(() => successSound.triggerAttackRelease('C5', '4n'), 100);
    }

    // Function to play error sound
    function playErrorSound() {
        errorSound.triggerAttackRelease('E3', '8n');
    }

    const difficultySelect = document.getElementById('difficulty');
    difficultySelect.addEventListener('change', function() {
        currentDifficulty = this.value;
        document.getElementById('current-difficulty').textContent = 
            this.value.charAt(0).toUpperCase() + this.value.slice(1);
        loadNewWord();
    });

    function getScoreForDifficulty(difficulty) {
        const scoreMap = {
            'easy': 10,
            'medium': 20,
            'hard': 30
        };
        return scoreMap[difficulty] || 10;
    }

    function initializeDragAndDrop() {
        const draggables = document.querySelectorAll('.syllable');
        const targetArea = document.querySelector('.target-area');

        draggables.forEach(syllable => {
            syllable.addEventListener('dragstart', (e) => {
                syllable.classList.add('dragging');
                e.dataTransfer.setData('text/plain', syllable.textContent);
                playSyllableSound();
            });

            syllable.addEventListener('dragend', () => {
                syllable.classList.remove('dragging');
            });
        });

        targetArea.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        targetArea.addEventListener('drop', (e) => {
            e.preventDefault();
            const syllable = document.querySelector('.dragging');
            const content = e.dataTransfer.getData('text/plain');
            
            targetArea.appendChild(syllable);
            checkWord();
        });
    }

    function checkWord() {
        const targetArea = document.querySelector('.target-area');
        const syllables = targetArea.querySelectorAll('.syllable');
        let builtWord = '';
        
        syllables.forEach(syllable => {
            builtWord += syllable.textContent;
        });

        if (builtWord === currentWord) {
            syllables.forEach(syllable => {
                syllable.classList.add('correct');
            });
            playSuccessSound();
            const wordScore = getScoreForDifficulty(currentDifficulty);
            score += wordScore;
            
            // Record progress
            fetch('/record_progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    word: currentWord,
                    difficulty: currentDifficulty,
                    score: wordScore
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to record progress');
                }
                return response.json();
            })
            .then(() => {
                updateStatistics();
            })
            .catch(error => {
                console.error('Error recording progress:', error);
            });
            
            updateScore();
            setTimeout(loadNewWord, 1000);
        } else if (builtWord.length >= currentWord.length) {
            playErrorSound();
            syllables.forEach(syllable => {
                syllable.classList.add('incorrect');
            });
            setTimeout(() => {
                resetSyllables();
                syllables.forEach(syllable => {
                    syllable.classList.remove('incorrect');
                });
            }, 500);
        }
    }

    function resetSyllables() {
        const syllableContainer = document.querySelector('.syllable-container');
        const targetArea = document.querySelector('.target-area');
        const syllables = targetArea.querySelectorAll('.syllable');
        
        syllables.forEach(syllable => {
            syllableContainer.appendChild(syllable);
            syllable.classList.remove('correct', 'incorrect');
        });
    }

    function updateScore() {
        document.querySelector('.score').textContent = `Score: ${score}`;
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function loadNewWord() {
        fetch(`/get_word?difficulty=${currentDifficulty}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch word');
                }
                return response.json();
            })
            .then(data => {
                currentWord = data.word;
                document.getElementById('game-image').src = data.image;
                
                const syllableContainer = document.querySelector('.syllable-container');
                syllableContainer.innerHTML = '';
                
                const shuffledSyllables = shuffle(data.syllables);
                shuffledSyllables.forEach(syllable => {
                    const syllableElement = document.createElement('div');
                    syllableElement.className = 'syllable';
                    syllableElement.draggable = true;
                    syllableElement.textContent = syllable;
                    syllableContainer.appendChild(syllableElement);
                });
                
                document.querySelector('.target-area').innerHTML = '';
                initializeDragAndDrop();
            })
            .catch(error => {
                console.error('Error loading new word:', error);
            });
    // Update statistics display
    function updateStatistics() {
        fetch('/get_statistics')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch statistics');
                }
                return response.json();
            })
            .then(stats => {
                const statsHtml = `
                    <div class="stats-info">
                        <p>Total Words: ${stats.words_completed}</p>
                        <p>Easy: ${stats.easy_completed}</p>
                        <p>Medium: ${stats.medium_completed}</p>
                        <p>Hard: ${stats.hard_completed}</p>
                    </div>
                `;
                document.querySelector('.stats-container').innerHTML = statsHtml;
            });
    }
    
    // Initial statistics update
    updateStatistics();
    }

    // Initialize available difficulties
    fetch('/get_difficulties')
        .then(response => response.json())
        .then(difficulties => {
            difficultySelect.innerHTML = '';
            difficulties.forEach(diff => {
                const option = document.createElement('option');
                option.value = diff;
                option.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
                difficultySelect.appendChild(option);
            });
        });

    loadNewWord();
});
