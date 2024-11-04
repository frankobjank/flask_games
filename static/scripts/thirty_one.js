document.addEventListener('DOMContentLoaded', () => {
    // Elements that need to be on screen
        // Deck (not all the cards, just a button representating the whole deck)
        // Hand
        // Discard pile (same as deck, just a button with one card that represents whole pile)
        // Some representation of other players' hands, scores, avatars
        // Chat / Log box
        // Navigation
    
    // Initializing socket
    const socket = io();
    
    // Game status
    let inProgress = false;

    // Join room - one for debug
    let room = 'thirty_one_room';
    joinRoom(room)

    // Creates card table and elements within it
    playerPanel = createPlayerPanel();
    cardTable = createTable();
    startButton = createStartButton();

    // Add table / Start button to container
    document.querySelector('.outer-container').appendChild(playerPanel);
    document.querySelector('.outer-container').appendChild(cardTable);
    document.querySelector('.outer-container').appendChild(startButton);
});


function serverRequest(input) {
    // Cards can be represented by 2 chars, rank and suit
    // AS, KS, QS, JS, TS, 9S, 8S, 7S, 6S, 5S, 4S, 3S, 2S
    // AH, KH, QH, JH, TH, 9H, 8H, 7H, 6H, 5H, 4H, 3H, 2H
    // AD, KD, QD, JD, TD, 9D, 8D, 7D, 6D, 5D, 4D, 3D, 2D
    // AC, KC, QC, JC, TC, 9C, 8C, 7C, 6C, 5C, 4C, 3C, 2C
    
    // Moves:
        // Draw (no index), 
        // Pickup (no index), 
        // Knock (no index), 
        // Discard (takes index)

    // Pad input to include all attributes [move, card, newGame]
    if (!(move in input)) {
        input.move = '';
    }
    if (!(card in input)) {
        input.card = '';
    }
    if (!(newGame in input)) {
        input.newGame = false;
    }

    
    let validMoves = ['draw', 'pickup', 'knock', 'discard'];

    // Validate move provided
    if (input.move.length > 0 && (!validMoves.includes(input.move))) {
        console.log(`Move ${input.move} is invalid.`)
        return
    }

    console.log(input)

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

    update(response);
}


function createTable(serverBoard) {

    // Create div for card table
    const cardTable = document.createElement('div');
    cardTable.className = 'card-table mb-5';

    // Create deck container
    const deckContainer = document.createElement('div');
    deckContainer.className = 'deck-container';
    
    // Add container to table
    cardTable.appendChild(deckContainer);

    // Create deck button
    const deck = document.createElement('button');
    deck.id = 'deck';
    deck.innerHTML = 'Deck';
    deck.onclick = () => {
        serverRequest({move: 'draw', card: '', newGame: false});
    }

    // Add deck button to container
    deckContainer.appendChild(deck);
    
    // Create discard container
    const discardContainer = document.createElement('div');
    discardContainer.className = 'discard-container';
    
    // Add container to table
    cardTable.appendChild(discardContainer);
    
    // Create discard button
    const discard = document.createElement('button');
    discard.id = 'discard'
    discard.onclick = () => {
        serverRequest({move: 'pickup'});
    }
    
    // Add discard button to container
    discardContainer.appendChild(discard);
    
    // Create container for hand
    const handContainer = document.createElement('div');
    handContainer.className = 'hand-container';
    
    // Add to table
    cardTable.appendChild(handContainer);

    return cardTable;
}


function createNewButton() {
    // New game button
    const b = document.createElement('button');
    
    b.className = 'new-game-button';
    b.innerHTML = 'New game';

    b.onclick = () => {
        serverRequest({newGame: true});
    }

    // Disable start button when game in progress
    if (inProgress) {
        b.disabled;
    }
}


function checkStartButton(numPlayers) {
    return (2 <= numPlayers <= 7 && !inProgress)
}


function createPlayerPanel() {
    const playerPanel = document.createElement('div');
    
    return playerPanel
}


function createChatLog() {

}


function update(response) {

}
