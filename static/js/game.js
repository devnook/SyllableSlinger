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

    // Speech synthesis setup
    const speechSynth = window.speechSynthesis;

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

    // Function to speak text
    function speakText(text) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        speechSynth.speak(utterance);
    }

    // Helper function for fetch calls with retry logic
    async function fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }
                
                return data;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // Function to show error message
    function showError(message, duration = 3000) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'alert alert-danger';
        errorMessage.textContent = message;
        document.querySelector('.game-container').prepend(errorMessage);
        setTimeout(() => errorMessage.remove(), duration);
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
                speakText(syllable.textContent);
            });

            syllable.addEventListener('dragend', () => {
                syllable.classList.remove('dragging');
            });

            // Add click event for pronunciation
            syllable.addEventListener('click', () => {
                speakText(syllable.textContent);
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
            speakText(currentWord);
            const wordScore = getScoreForDifficulty(currentDifficulty);
            score += wordScore;
            
            // Record progress with retry logic
            fetchWithRetry('/record_progress', {
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
            .then(() => updateStatistics())
            .catch(error => {
                showError(`Failed to save progress: ${error.message}`);
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

    // Update statistics display
    function updateStatistics() {
        fetchWithRetry('/get_statistics')
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
            })
            .catch(error => {
                showError(`Failed to load statistics: ${error.message}`);
            });
    }

    function loadNewWord() {
        fetchWithRetry(`/get_word?difficulty=${currentDifficulty}`)
            .then(data => {
                currentWord = data.word;
                document.getElementById('game-image').src = data.image;
                
                const syllableContainer = document.querySelector('.syllable-container');
                syllableContainer.innerHTML = '';
                
                // Add pronunciation button
                const pronounceButton = document.createElement('button');
                pronounceButton.className = 'btn btn-primary mb-2';
                pronounceButton.innerHTML = '🔊 Pronounce';
                pronounceButton.onclick = () => speakText(currentWord);
                syllableContainer.parentNode.insertBefore(pronounceButton, syllableContainer);
                
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
                
                // Pronounce the word when it's loaded
                speakText(currentWord);
            })
            .catch(error => {
                showError(`Failed to load word: ${error.message}`);
            });
    }

    // Initialize available difficulties with retry logic
    fetchWithRetry('/get_difficulties')
        .then(difficulties => {
            difficultySelect.innerHTML = '';
            difficulties.forEach(diff => {
                const option = document.createElement('option');
                option.value = diff;
                option.textContent = diff.charAt(0).toUpperCase() + diff.slice(1);
                difficultySelect.appendChild(option);
            });
        })
        .catch(error => {
            showError(`Failed to load difficulties: ${error.message}`);
        });

    // Initial statistics update
    updateStatistics();
    loadNewWord();
});
