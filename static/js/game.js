document.addEventListener('DOMContentLoaded', () => {
    const targetArea = document.querySelector('.target-area');
    const syllableContainer = document.querySelector('.syllable-container');
    const difficultySelect = document.getElementById('difficulty');
    const categorySelect = document.getElementById('category');
    const currentDifficultySpan = document.getElementById('current-difficulty');
    let score = 0;
    let currentWord = '';

    function loadNewWord() {
        const difficulty = difficultySelect.value;
        const category = categorySelect.value;
        const url = category ? 
            `/get_word?difficulty=${difficulty}&category=${category}` :
            `/get_word?difficulty=${difficulty}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                currentWord = data.word;
                document.getElementById('game-image').src = data.image;
                currentDifficultySpan.textContent = data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1);

                // Clear previous syllables
                targetArea.innerHTML = '';
                syllableContainer.innerHTML = '';

                // Create target slots
                data.syllables.forEach((_, index) => {
                    const slot = document.createElement('div');
                    slot.className = 'syllable-slot';
                    slot.dataset.index = index;
                    targetArea.appendChild(slot);
                });

                // Create draggable syllables in random order
                const shuffledSyllables = [...data.syllables].sort(() => Math.random() - 0.5);
                shuffledSyllables.forEach((syllable, index) => {
                    const syllableElement = document.createElement('div');
                    syllableElement.className = 'syllable';
                    syllableElement.textContent = syllable;
                    syllableElement.draggable = true;
                    syllableElement.dataset.index = index;
                    
                    syllableElement.addEventListener('dragstart', handleDragStart);
                    syllableElement.addEventListener('dragend', handleDragEnd);
                    
                    syllableContainer.appendChild(syllableElement);
                });
            })
            .catch(error => {
                console.error('Error loading word:', error);
                // Handle error gracefully - maybe show a message to the user
                targetArea.innerHTML = '<p class="error">Error loading word. Please try again.</p>';
            });
    }

    function handleDragStart(e) {
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.textContent);
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    targetArea.addEventListener('dragover', e => {
        e.preventDefault();
        const slot = e.target.closest('.syllable-slot');
        if (slot && !slot.hasChildNodes()) {
            slot.classList.add('drag-over');
        }
    });

    targetArea.addEventListener('dragleave', e => {
        const slot = e.target.closest('.syllable-slot');
        if (slot) {
            slot.classList.remove('drag-over');
        }
    });

    targetArea.addEventListener('drop', e => {
        e.preventDefault();
        const slot = e.target.closest('.syllable-slot');
        if (!slot || slot.hasChildNodes()) return;

        const syllable = document.querySelector('.dragging');
        if (!syllable) return;

        slot.classList.remove('drag-over');
        const clone = syllable.cloneNode(true);
        slot.appendChild(clone);
        syllable.remove();

        // Check if word is complete
        const filledSlots = targetArea.querySelectorAll('.syllable-slot');
        if (Array.from(filledSlots).every(slot => slot.hasChildNodes())) {
            const builtWord = Array.from(filledSlots)
                .map(slot => slot.textContent)
                .join('');

            if (builtWord === currentWord) {
                // Calculate score based on difficulty
                const difficultyScores = {
                    'easy': 10,
                    'medium': 20,
                    'hard': 30
                };
                const pointsEarned = difficultyScores[difficultySelect.value] || 10;
                score += pointsEarned;
                document.querySelector('.score').textContent = `Score: ${score}`;

                // Record progress
                fetch('/record_progress', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        word: currentWord,
                        difficulty: difficultySelect.value,
                        score: pointsEarned
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(() => {
                    updateStatistics();
                    setTimeout(loadNewWord, 1000);
                })
                .catch(error => {
                    console.error('Error recording progress:', error);
                });
            } else {
                // Wrong word - shake animation and reset
                targetArea.classList.add('shake');
                setTimeout(() => {
                    targetArea.classList.remove('shake');
                    Array.from(filledSlots).forEach(slot => {
                        const syllable = slot.firstChild;
                        if (syllable) {
                            const newSyllable = syllable.cloneNode(true);
                            newSyllable.addEventListener('dragstart', handleDragStart);
                            newSyllable.addEventListener('dragend', handleDragEnd);
                            syllableContainer.appendChild(newSyllable);
                            slot.innerHTML = '';
                        }
                    });
                }, 500);
            }
        }
    });

    difficultySelect.addEventListener('change', loadNewWord);
    categorySelect.addEventListener('change', loadNewWord);

    // Update statistics display
    function updateStatistics() {
        fetch('/get_statistics')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
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
            })
            .catch(error => {
                console.error('Error updating statistics:', error);
            });
    }

    // Initialize available difficulties and categories
    fetch('/get_difficulties')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
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
            console.error('Error loading difficulties:', error);
        });

    fetch('/get_categories')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(categories => {
            categorySelect.innerHTML = '';
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'All Categories';
            categorySelect.appendChild(defaultOption);
            
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                categorySelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading categories:', error);
        });

    // Initial statistics update and word load
    updateStatistics();
    loadNewWord();
});
