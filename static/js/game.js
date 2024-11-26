document.addEventListener('DOMContentLoaded', () => {
    const targetArea = document.querySelector('.target-area');
    const syllableContainer = document.querySelector('.syllable-container');
    const difficultySelect = document.getElementById('difficulty');
    const categorySelect = document.getElementById('category');
    const currentDifficultySpan = document.getElementById('current-difficulty');
    let score = 0;
    let currentWord = '';
    let draggedElement = null;

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
                    
                    // Add drag and drop event listeners to each slot
                    slot.addEventListener('dragover', handleDragOver);
                    slot.addEventListener('dragleave', handleDragLeave);
                    slot.addEventListener('drop', handleDrop);
                    
                    targetArea.appendChild(slot);
                });

                // Create draggable syllables in random order
                const shuffledSyllables = [...data.syllables].sort(() => Math.random() - 0.5);
                shuffledSyllables.forEach((syllable, index) => {
                    createDraggableSyllable(syllable, index);
                });
            })
            .catch(error => {
                console.error('Error loading word:', error);
                targetArea.innerHTML = '<p class="error">Error loading word. Please try again.</p>';
            });
    }

    function createDraggableSyllable(syllable, index) {
        const syllableElement = document.createElement('div');
        syllableElement.className = 'syllable';
        syllableElement.textContent = syllable;
        syllableElement.draggable = true;
        syllableElement.dataset.index = index;
        
        syllableElement.addEventListener('dragstart', handleDragStart);
        syllableElement.addEventListener('dragend', handleDragEnd);
        
        syllableContainer.appendChild(syllableElement);
        return syllableElement;
    }

    function handleDragStart(e) {
        draggedElement = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.setData('text/plain', e.target.textContent);
        e.dataTransfer.effectAllowed = 'move';
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        draggedElement = null;
        // Remove drag-over class from all slots
        document.querySelectorAll('.syllable-slot').forEach(slot => {
            slot.classList.remove('drag-over');
        });
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.target.hasChildNodes()) {
            e.target.classList.add('drag-over');
        }
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const slot = e.target.closest('.syllable-slot');
        if (!slot || slot.hasChildNodes()) return;

        slot.classList.remove('drag-over');

        if (draggedElement) {
            const clone = draggedElement.cloneNode(true);
            // Add event listeners to the clone
            clone.addEventListener('dragstart', handleDragStart);
            clone.addEventListener('dragend', handleDragEnd);
            
            slot.appendChild(clone);
            draggedElement.remove();
            draggedElement = null;

            checkWord();
        }
    }

    function checkWord() {
        const filledSlots = targetArea.querySelectorAll('.syllable-slot');
        if (Array.from(filledSlots).every(slot => slot.hasChildNodes())) {
            const builtWord = Array.from(filledSlots)
                .map(slot => slot.firstChild.textContent)
                .join('');

            if (builtWord === currentWord) {
                handleCorrectWord();
            } else {
                handleIncorrectWord(filledSlots);
            }
        }
    }

    function handleCorrectWord() {
        const difficultyScores = {
            'easy': 10,
            'medium': 20,
            'hard': 30
        };
        const pointsEarned = difficultyScores[difficultySelect.value] || 10;
        score += pointsEarned;
        document.querySelector('.score').textContent = `Score: ${score}`;

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
    }

    function handleIncorrectWord(filledSlots) {
        targetArea.classList.add('shake');
        setTimeout(() => {
            targetArea.classList.remove('shake');
            Array.from(filledSlots).forEach(slot => {
                const syllable = slot.firstChild;
                if (syllable) {
                    const newSyllable = createDraggableSyllable(syllable.textContent, syllable.dataset.index);
                    slot.innerHTML = '';
                }
            });
        }, 500);
    }

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

    // Event listeners for difficulty and category changes
    difficultySelect.addEventListener('change', loadNewWord);
    categorySelect.addEventListener('change', loadNewWord);

    // Initialize difficulties
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

    // Initialize categories
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

    // Initial load
    updateStatistics();
    loadNewWord();
});
