document.addEventListener('DOMContentLoaded', () => {
    const targetArea = document.querySelector('.target-area');
    const syllableContainer = document.querySelector('.syllable-container');
    const difficultySelect = document.getElementById('difficulty');
    const categorySelect = document.getElementById('category');
    const currentDifficultySpan = document.getElementById('current-difficulty');
    let score = 0;
    let currentWord = '';
    let draggedElement = null;
    let isDragging = false;

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
                    createDraggableSyllable(syllable, index);
                });

                // Add drop event listeners to target area and slots
                setupDropZones();
            })
            .catch(error => {
                console.error('Error loading word:', error);
                targetArea.innerHTML = '<p class="error">Error loading word. Please try again.</p>';
            });
    }

    function setupDropZones() {
        const slots = targetArea.querySelectorAll('.syllable-slot');
        slots.forEach(slot => {
            slot.addEventListener('dragover', handleDragOver);
            slot.addEventListener('dragleave', handleDragLeave);
            slot.addEventListener('drop', handleDrop);
        });
    }

    function createDraggableSyllable(syllable, index) {
        const syllableElement = document.createElement('div');
        syllableElement.className = 'syllable';
        syllableElement.textContent = syllable;
        syllableElement.draggable = true;
        syllableElement.dataset.index = index;
        syllableElement.dataset.syllable = syllable;
        
        attachDragListeners(syllableElement);
        syllableContainer.appendChild(syllableElement);
        return syllableElement;
    }

    function attachDragListeners(element) {
        element.addEventListener('dragstart', handleDragStart);
        element.addEventListener('dragend', handleDragEnd);
        element.addEventListener('mousedown', () => {
            element.classList.add('being-dragged');
        });
        element.addEventListener('mouseup', () => {
            element.classList.remove('being-dragged');
        });
    }

    function handleDragStart(e) {
        isDragging = true;
        draggedElement = e.target;
        e.target.classList.add('dragging');
        
        // Set drag data
        e.dataTransfer.setData('text/plain', e.target.dataset.syllable);
        e.dataTransfer.effectAllowed = 'move';
        
        // Add drag feedback
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
    }

    function handleDragEnd(e) {
        isDragging = false;
        if (draggedElement) {
            draggedElement.style.opacity = '1';
            draggedElement.classList.remove('dragging');
        }
        draggedElement = null;
        
        // Remove drag-over class from all slots
        document.querySelectorAll('.syllable-slot').forEach(slot => {
            slot.classList.remove('drag-over');
        });
    }

    function handleDragOver(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const slot = e.target.closest('.syllable-slot');
        if (!slot || slot.hasChildNodes()) {
            e.dataTransfer.dropEffect = 'none';
            return;
        }
        
        slot.classList.add('drag-over');
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const slot = e.target.closest('.syllable-slot');
        if (slot) {
            slot.classList.remove('drag-over');
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const slot = e.target.closest('.syllable-slot');
        if (!slot || !draggedElement || slot.hasChildNodes()) {
            return false;
        }

        slot.classList.remove('drag-over');

        try {
            // Create a new syllable element instead of cloning
            const syllable = draggedElement.dataset.syllable;
            const index = draggedElement.dataset.index;
            const newSyllable = document.createElement('div');
            newSyllable.className = 'syllable';
            newSyllable.textContent = syllable;
            newSyllable.draggable = true;
            newSyllable.dataset.index = index;
            newSyllable.dataset.syllable = syllable;
            
            // Attach new event listeners
            attachDragListeners(newSyllable);
            
            // Add to slot
            slot.appendChild(newSyllable);
            
            // Remove original
            draggedElement.remove();
            draggedElement = null;
            isDragging = false;

            // Check word completion
            checkWord();
            
            return true;
        } catch (error) {
            console.error('Error in handleDrop:', error);
            return false;
        }
    }

    function checkWord() {
        const filledSlots = targetArea.querySelectorAll('.syllable-slot');
        if (Array.from(filledSlots).every(slot => slot.hasChildNodes())) {
            const builtWord = Array.from(filledSlots)
                .map(slot => slot.firstChild.dataset.syllable)
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
                    createDraggableSyllable(syllable.dataset.syllable, syllable.dataset.index);
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
