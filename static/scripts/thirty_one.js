// Initializing socket
const socket = io();

// Game status
let inProgress = false;

// Client username - assign on connect
var username;

document.addEventListener('DOMContentLoaded', () => {

    // Elements that need to be on screen
        // Deck (not all the cards, just a button representating the whole deck)
        // Hand
        // Discard pile (same as deck, just a button with one card that represents whole pile)
        // Some representation of other players' hands, scores, avatars
        // Chat / Log box
        // Navigation

    // Join room - one for debug
    let room = 'thirty_one_room';
    joinRoom(username, room);

    // Creates card table and elements within it
    playerPanel = createPlayerPanel();
    cardTable = createTable();
    chatLog = createChatLog();
    startButton = createStartButton();

    // Add table / Start button to container
    document.querySelector('.outer-container').appendChild(playerPanel);
    // document.querySelector('.outer-container').appendChild(cardTable);
    // document.querySelector('.outer-container').appendChild(chatLog);
    // document.querySelector('.outer-container').appendChild(startButton);
});


// function serverRequest(input) {
    
//     // Set username in input
//     input.username = username

//     // Pad input to include all attributes [move, card]
//     if (!('move' in input)) {
//         input.move = '';
//     }
//     if (!('card' in input)) {
//         input.card = '';
//     }


    
//     let validMoves = ['draw', 'pickup', 'knock', 'discard'];

//     // Validate move provided
//     if (input.move.length > 0 && (!validMoves.includes(input.move))) {
//         console.log(`Move ${input.move} is invalid.`)
//         return
//     }

//     console.log(input)
// }


function createTable() {

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
        socket.emit('move', {'action': 'draw'});
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
    discard.id = 'discard';
    discard.onclick = () => {
        socket.emit('move', {'action': 'pickup'});
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


function createStartButton() {
    // Start game button
    const start = document.createElement('button');
    
    start.className = 'start-game-button';
    start.innerHTML = 'start new game';

    start.onclick = () => {
        
        socket.emit('move', {'action': 'start'});
    }

    // Disable start button when game in progress
    if (inProgress) {
        start.disabled;
    }

    return start;
}


function checkNewButton(numPlayers) {
    return (2 <= numPlayers <= 7 && !inProgress);
}


function createPlayerPanel() {
    // Fill in this panel later
    const playerPanel = document.createElement('div');
    playerPanel.className = 'player-panel';

    return playerPanel;
}


function createChatLog() {
    const chatLog = document.createElement('div');

    return chatLog;
}


function update(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
    }
    
    // On connect, add username
    if (response.action === 'add_username') {
        username = response.username;
    }
    
    // on add player, add to player panel
    else if (response.action === 'add_player') {
        const playerContainer = document.createElement('p');
        const br = document.createElement('br');

        playerContainer.innerHTML = response.player + br.outerHTML;

        document.querySelector('.player-panel').appendChild(playerContainer);
    }

}

// Socket functions / events

// Join room
function joinRoom(username, room) {
    socket.emit('join', {'username': username, 'room': room});
}

// Leave room
function leaveRoom(username, room) {
    socket.emit('leave', {'username': username, 'room': room});
}

// Custom 'update' event on action from server
socket.on('update', data => {
    update(data);
});
