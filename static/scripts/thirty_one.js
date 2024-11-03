document.addEventListener('DOMContentLoaded', function() {
    
    // Elements that need to be on screen
        // Deck (not all the cards, just a button representating the whole deck)
        // Hand
        // Discard pile (same as deck, just a button with one card that represents whole pile)
        
        // Some representation of other players' hands, scores, avatars
        // Chat / Log box
        // Navigation

    // Game status
    hasStarted = false;
    gameOver = false;

    // Creates card table and elements within it
    cardTable = createTable();

    // Add table to container
    document.querySelector('.table-container').appendChild(cardTable);
});


function serverRequest(input) {
    console.log(input)
    // Cards can be represented by 2 chars, rank and suit
    // AS, KS, QS, JS, TS, 9S, 8S, 7S, 6S, 5S, 4S, 3S, 2S
    // AH, KH, QH, JH, TH, 9H, 8H, 7H, 6H, 5H, 4H, 3H, 2H
    // AD, KD, QD, JD, TD, 9D, 8D, 7D, 6D, 5D, 4D, 3D, 2D
    // AC, KC, QC, JC, TC, 9C, 8C, 7C, 6C, 5C, 4C, 3C, 2C
    
    // Moves = Draw (no index), 
        // Pickup (no index), 
        // Knock (no index), 
        // Discard (takes index)
    
        // Initialize data to pass to server
    
    // let data = {'move': '', 'card': '', 'reset': false};
    let validMoves = ['draw', 'pickup', 'knock', 'discard'];

    // Validate move provided
    if (!validMoves.includes(input.move)) {
        console.log(`Move ${input.move} is invalid.`)
        return
    }

    // If input is 'reset'
    if (input.reset) {
        console.log('Reset pressed.');
    }

    // Send data via jQuery ajax function
    $.ajax({
        dataType: 'json',
        type: 'POST',
        url: 'thirty_one',
        data: input,
        success: success
    });
}


// Handle the success response from Flask
function success(response) {

    // Catch if response is undefined
    if (response === undefined) {
        return;
    }
}


// Create deck
function createDeck() {
    // Unicode for suits if needed
    // suit_to_display = {"spade": "\u2664", "heart": "\u2665", "diamond": "\u2666", "club": "\u2667"}
    
    let deck = [];

    ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    suits = ['spade', 'heart', 'diamond', 'club'];
    
    for (suit of suits) {
        for (rank of ranks) {
            deck.push([rank, suit]);
        }
    }
    console.log(deck);
    return deck;
}


function createTable() {

    // Create div for card table
    const cardTable = document.createElement('div');
    cardTable.className = 'card-table mb-5';

    // Create deck
    const deck = document.createElement('button');
    deck.id = 'deck';
    deck.innerHTML = 'Deck';
    deck.onclick = () => {
        serverRequest({move: 'draw', card: '', reset: false});
    }

    cardTable.appendChild(deck);
    return cardTable;
}


function updateBoard(response) {
    
}

function drawCard() {
    
}