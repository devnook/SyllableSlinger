document.addEventListener('DOMContentLoaded', function() {
    let score = 0;
    let currentWord = '';
    let currentDifficulty = 'easy';
    let syllables = [];
    
    // Global error handler for uncaught promises
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        showError('An error occurred. Please try again.');
    });
    
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
        try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            speechSynth.speak(utterance);
        } catch (error) {
            console.error('Speech synthesis error:', error);
        }
    }

    // Helper function for fetch calls with retry logic
    async function fetchWithRetry(url, options = {}, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || `HTTP error! status: ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
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

    // Update statistics display - Moved before usage
    async function updateStatistics() {
        try {
            const stats = await fetchWithRetry('/get_statistics');
            const statsHtml = `
                <div class="stats-info">
                    <p>Total Words: ${stats.words_completed}</p>
                    <p>Easy: ${stats.easy_completed}</p>
                    <p>Medium: ${stats.medium_completed}</p>
                    <p>Hard: ${stats.hard_completed}</p>
                </div>
            `;
            document.querySelector('.stats-container').innerHTML = statsHtml;
        } catch (error) {
            showError(`Failed to load statistics: ${error.message}`);
        }
    }

    const difficultySelect = document.getElementById('difficulty');
    difficultySelect.addEventListener('change', function() {
        currentDifficulty = this.value;
        document.getElementById('current-difficulty').textContent = 
            this.value.charAt(0).toUpperCase() + this.value.slice(1);
        loadNewWord().catch(error => showError(`Failed to load word: ${error.message}`));
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
            targetArea.appendChild(syllable);
            checkWord();
        });
    }

    async function checkWord() {
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
            
            try {
                // Record progress with retry logic
                await fetchWithRetry('/record_progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        word: currentWord,
                        difficulty: currentDifficulty,
                        score: wordScore
                    })
                });
                
                await updateStatistics();
                updateScore();
                setTimeout(() => loadNewWord().catch(error => showError(`Failed to load word: ${error.message}`)), 1000);
            } catch (error) {
                showError(`Failed to save progress: ${error.message}`);
            }
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

    async function loadNewWord() {
        try {
            const data = await fetchWithRetry(`/get_word?difficulty=${currentDifficulty}`);
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
        } catch (error) {
            showError(`Failed to load word: ${error.message}`);
        }
    }

    // Initialize available difficulties
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

    // Initial statistics update and word loading
    updateStatistics().catch(error => showError(`Failed to load statistics: ${error.message}`));
    loadNewWord().catch(error => showError(`Failed to load word: ${error.message}`));
});
