document.addEventListener('DOMContentLoaded', function() {
    let score = 0;
    let currentWord = '';
    let currentDifficulty = 'easy';
    let syllables = [];

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
            }).then(() => {
                updateStatistics();
            });
            
            updateScore();
            setTimeout(loadNewWord, 1000);
        } else if (builtWord.length >= currentWord.length) {
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
            .then(response => response.json())
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
            });
    // Update statistics display
    function updateStatistics() {
        fetch('/get_statistics')
            .then(response => response.json())
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

    // Initialize available difficulties and categories
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

    const categorySelect = document.getElementById('category');
    fetch('/get_categories')
        .then(response => response.json())
        .then(categories => {
            categorySelect.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                categorySelect.appendChild(option);
            });
        });

    // Update word fetching to include category
    categorySelect.addEventListener('change', loadNewWord);
    
    function loadNewWord() {
        const difficulty = difficultySelect.value;
        const category = categorySelect.value;
        const params = new URLSearchParams({
            difficulty: difficulty,
            ...(category && { category: category })
        });

        fetch(`/get_word?${params}`)
            .then(response => response.json())
            .then(data => {
                currentWord = data.word;
                const syllables = data.syllables;
                document.getElementById('game-image').src = data.image;
                document.getElementById('current-difficulty').textContent = 
                    data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1);
                
                // Update syllable display
                updateSyllableDisplay(syllables);
            });
    }

    loadNewWord();
});
