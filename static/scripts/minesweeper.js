document.addEventListener('DOMContentLoaded', function() {

    // Set global css vars to size of board
    document.documentElement.style.setProperty('--grid-width', serverBoard.width);
    document.documentElement.style.setProperty('--grid-height', serverBoard.height);
    
    document.getElementById('board-container').style.setProperty('width', serverBoard.width * 30)
    document.getElementById('board-container').style.setProperty('height', serverBoard.height * 30)

    // Keep track if game has started for timer
    hasStarted = false;
    gameOver = false;
    
    // Insert to board-container: panel, board
    document.getElementById('board-container').appendChild(createPanel(serverBoard));
    document.getElementById('board-container').appendChild(createBoard(serverBoard));
});


function serverRequest(input) {

    // Initialize data with nulls, current score
    let data = {'square': null, 'reset': null, 'score': document.getElementById('timer').innerText};

    // If input is 'reset'
    if (input === 'reset') {
        data.reset = true;
    }

    // If input is a number
    else if (!isNaN(input)) {
        data.square = input;
    }

    // Send data via jQuery ajax function
    $.ajax({
        dataType: 'json',
        type: 'POST',
        url: 'minesweeper',
        data: data,
        success: success
    });
}


// Handle the success response from Flask
function success(response) {

    // Catch if response is undefined
    if (response === undefined) {
        return;
    }

    // Updates board if there is there is visible or mines data
    if (response.visible || response.mines) {
        updateBoard(response);
    }

    // Set gameOver to true if mines are included in response
    if (response.mines.length > 0) {
        gameOver = true;
    }
}


// Create panel for mines remaining, reset, timer
function createPanel(serverBoard) {

    let panel = document.createElement('div');
    panel.className = 'panel-container';
    panel.id = 'panel';
    
    // Create panel
    // Mines Remaining
    const mines = document.createElement('span');
    mines.className = 'panel-span mx-2';
    mines.id = 'minesRemaining';
    mines.innerText = padNumber(serverBoard.num_mines);
    
    // Reset button
    const reset = document.createElement('button');
    reset.className = 'btn panel-button mx-1 mb-1';
    reset.id = 'reset';
    reset.innerText = 'Reset';
    
    // Add event listener; setting 'onclick' was activating click on page load
    reset.addEventListener('mouseup', (event) => {
        if (event.button === 0) {  
            
            // Quick way to reset - literally refresh the page
            window.location.reload();
        }
    });
        
    // Timer
    const timer = document.createElement('span');
    timer.className = 'panel-span mx-2';
    timer.id = 'timer';
    timer.innerText = '000'
    
    // Set fillers and filler dimensions
    let panelFillers = []
    for (i = 0; i < 2; i++) {
        const p = document.createElement('span');
        p.className = 'panel-filler mx-2'
    
        if (serverBoard.difficulty === 'easy') {
            p.style.maxWidth = 0;
        }
        else if (serverBoard.difficulty === 'medium') {
            p.style.width = '90px';
        }
        else if (serverBoard.difficulty === 'hard') {
            p.style.width = '285px';
        }

        panelFillers.push(p)
    }
    
    // Add all elements to panel
    panel.appendChild(mines);
    panel.appendChild(panelFillers[0]);
    panel.appendChild(reset);
    panel.appendChild(panelFillers[1]);
    panel.appendChild(timer);

    return panel;
}


function createBoard(serverBoard) {

    // Create div element for board
    const board = document.createElement('div');
    board.className = 'board';
    board.id = 'board';

    for (let y = 0; y < serverBoard.width; y++) {

        // Create table data cells
        for (let x = 0; x < serverBoard.height; x++) {

            // Calculate index from (x, y) coordinates
            let index = y * serverBoard.height + x;

            // Create div for button
            let square = document.createElement('div');
            square.className = 'square';
            square.index = index;

            // Create button
            let b = document.createElement('button');
            
            // Assign attributes to button
            b.className = 'square-button';
            b.id = index;

            // Add EventListeners to button
            b.addEventListener("mousedown", (event) => {
                
                if (!hasStarted) {
                    hasStarted = true;
                    
                    // Start the timer
                    let count = 0;
                    let intervalId = setInterval(() => {
                        count++;
                        
                        // Stop timer if game over and exit early
                        if (gameOver) {
                            clearInterval(intervalId);
                            return;
                        }

                        document.getElementById('timer').innerHTML = padNumber(count);

                    }, 1000);
                }

                // Left mouse click
                if (event.button === 0 && !gameOver) {
                    
                    // Send button id to server if not flag
                    if (b.getAttribute('data-flagged') === null) {
                        serverRequest(b.id);
                    }
                }
                
                // Right mouse click
                else if (event.button === 2 && !gameOver) {

                    // SUPPOSED TO PREVENT CONTEXT MENU APPEARING; NOT WORKING
                    event.preventDefault();
                    
                    // Toggle flag true/false
                    b.toggleAttribute('data-flagged');

                    // Calc mines - flags for Remaining Mines value
                    let mines = serverBoard.num_mines - document.querySelectorAll('.square-button[data-flagged]').length;

                    // Set to 0 if below 0
                    if (0 > mines) {
                        mines = 0;
                    }
                    
                    // Add to panel; padded by 0s
                    document.getElementById('minesRemaining').innerText = padNumber(mines);
                }
            });
            
            // Grab focus on hover - BUG: this keeps focus even after mouse leaves square
            b.addEventListener("mousemove", (event) => {

                b.focus();
            });

            // TEMP FIX FOR RIGHT CLICK ISSUE - USE KEY 'F' INSTEAD
            b.addEventListener("keydown", (event) => {

                // Press 'F' for right click
                if (event.code === "KeyF" && !gameOver) {

                    // Toggle flag true/false
                    b.toggleAttribute('data-flagged');

                    // Calc mines - flags for Remaining Mines value
                    let minesRemaining = serverBoard.num_mines - document.querySelectorAll('.square-button[data-flagged]').length;
                    
                    // Set to 0 if below 0
                    if (0 > minesRemaining) {
                        minesRemaining = 0;
                    }
                    
                    // Add to panel; padded by 0s
                    document.getElementById('minesRemaining').innerText = padNumber(minesRemaining);
                }
            });

            square.appendChild(b);
            board.appendChild(square);
        }
    }

    return board;
}


function updateBoard(response) {

    // Reveal if visible is not empty
    if (response.visible.length > 0) {

        // List of indices of visible squares
        for (let i = 0; i < response.visible.length; i++) {

            let b = document.getElementById(response.visible[i]);
            
            // Pass without revealing if flag
            if (b.getAttribute('data-flagged') !== null) {
                continue;
            }

            // Square should be visible; disable the button
            b.disabled = true;

            // Display number in square
            let adj = response.adj[i];

            if (adj > 0) {
                b.textContent = adj;
                b.setAttribute('data-adj-num', adj)
            }
        }
    }
    

    
    // Game over; check false flags on lose, flag all mines on win
    if (response.mines.length > 0) {
        
        // Change reset text for win or lose
        if (response.win) {
            document.querySelector('#reset').textContent = 'WIN!'
        }
        else {
            document.querySelector('#reset').textContent = 'LOSE'
        }

        // List of indices of mines
        for (sqIndex of response.mines) {
            let b = document.getElementById(sqIndex);
            
            // Handle unflagged mines
            if (!b.hasAttribute('data-flagged')) {
                // On win - add flags and set mines to flagged
                if (response.win) {
                    b.toggleAttribute('data-flagged');
                    b.setAttribute('data-mine', 'flagged');
                }
                // On lose - set mines to unflagged
                else {
                    b.setAttribute('data-mine', 'unflagged');
                    b.innerText = '*';
                }
            }
            
            // If already flagged, set mines to flagged
            else {
                b.setAttribute('data-mine', 'flagged');
            }
        }

        // Check if any squares were wrongly flagged
        document.querySelectorAll('.square-button[data-flagged]').forEach((b) => {
            
            // b is not a mine
            if (!b.hasAttribute('data-mine')) {
                b.setAttribute('data-flagged', 'miss');
            }
        });
    }
}


// Pad minesRemaining and timer with 0s
function padNumber(num) {
    return num.toString().padStart(3, '0');
}
