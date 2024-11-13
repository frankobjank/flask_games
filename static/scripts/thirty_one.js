// Room, Socket Variables
// Initializing socket
const socket = io();
let room = 'thirty_one_room';

// Client username - assign on connect if not logged into account
var username;

// Keep track of player names connected
let playersConnected = [];

// Game state
let inProgress = false;
var mode;
var currentPlayer;
var discardCard;
var playerOrder = [];

// Multi-dimensional array of player `objects` that can be looked up by username
    // Player objects should include:
    // player = {name: '', order: 0, lives: 0, handSize: 0, hand: [], handScore: 0};
let players = {};




document.addEventListener('DOMContentLoaded', () => {

    // Elements that need to be on screen
        // Deck (not all the cards, just a button representating the whole deck)
        // Hand
        // Discard pile (same as deck, just a button with one card that represents whole pile)
        // Some representation of other players' hands, scores, avatars
        // Chat / Log box
        // Navigation

    // This actually happens before 'connect' event
    joinRoom(room);

    // Creates card table and elements within it
    playerPanel = createPlayerPanel();
    cardTable = createTable();
    chatLog = createChatLog();
    startButton = createStartButton();

    // Add table / Start button to container
    document.querySelector('.outer-container').appendChild(playerPanel);
    document.querySelector('.outer-container').appendChild(cardTable);
    document.querySelector('.outer-container').appendChild(chatLog);
    document.querySelector('.outer-container').appendChild(startButton);
});


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
        socket.emit('move', {'action': 'draw', 'room': room});
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
    discard.id = 'discard-button';
    discard.onclick = () => {
        socket.emit('move', {'action': 'pickup', 'room': room});
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
    
    start.className = 'start-button';
    start.innerHTML = 'start new game';

    start.onclick = () => {
        socket.emit('move', {'action': 'start', 'room': room});
    }

    // Disable start button when game in progress
    if (inProgress) {
        start.disabled;
    }

    return start;
}


function checkNumPlayers(numPlayers) {
    return (2 <= numPlayers <= 7 && !inProgress);
}


function createPlayerPanel() {
    // Fill in this panel later
    const playerPanel = document.createElement('div');
    playerPanel.className = 'player-panel';

    return playerPanel;
}

function createPlayerContainer(name) {
    const playerContainer = document.createElement('p');
    const br = document.createElement('br');
    // Add all elements here - move up from update()
    const playerHand = document.createElement('div');

    // Give container id of 'playerName-container'
    playerContainer.id = name + '-container'
    playerContainer.innerHTML = name + br.outerHTML;

    playerContainer.appendChild(playerHand);

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
    
    // On connect, add username, join room
    if (response.action === 'add_username') {
        username = response.username;
        console.log(`Adding username ${username}`);
    }
    
    // Add players to player panel on join
    else if (response.action === 'add_players') {

        console.log(`Received action: add_players, players = ${response.players}`);

        // Save player list
        for (player of response.players) {
            // Check if player already in list
            if (!(playersConnected.includes(player))) {
                
                // If player not in list, add to list and player panel
                playersConnected.push(player);
                
                playerContainer = createPlayerContainer(player);

                document.querySelector('.player-panel').appendChild(playerContainer);
            }
        }
    }

    // Remove players on leave
    else if (response.action === 'remove_players') {

        console.log(`Received action: remove_players, players = ${response.players}`)

        // Remove anyone on local list who isn't on server list
        for (player of playersConnected) {
            // Check if player already in list
            if ((response.players.includes(player))) {
                
                // Remove player from local list
                const index = players.indexOf(player);
                if (index > -1) {
                    players.splice(index, 1);
                    console.log(`Found ${player} at index ${index}, removing player ${player}`);
                }

                // Remove player container 
                containerID = '#' + player + '-container';
                playerContainer = document.querySelector(containerID);
                
                console.log(`Found ${playerContainer} with id ${containerID}, removing player ${player}`);
                
                document.querySelector('.player-panel').removeChild(playerContainer);
            }
        }
    }

    // Update board based on server response:

    // # Generic data
    // "action": "update_board",  # for client to know what type of update this is
    // "room": self.room_name,  # name of room
    // "mode": self.mode,  # current game mode - might help restrict inputs on client side
    // "in_progress": self.in_progress,  # whether game is in progress
    // "player_order": self.player_order,  # list of player names in order
    // "current_player": self.current_player,  # current player's name
    // "discard": discard_card,  # top card of discard pile
    // "hand_sizes": hand_sizes,  # number of cards in each players' hands
    // "lives": lives,  # remaining lives of all players

    // # Specific to player
    // "hand": self.players[player_name].zip_hand(),  # hand for self only
    // "hand_score": self.calc_hand_score(self.players[player_name]),  # hand score for self
    
    else if (response.action === 'update_board') {
        
        // Unpack general state
        inProgress = response.in_progress;
        mode = response.mode;
        currentPlayer = response.currentPlayer;
        discardCard = response.discard;
        
        if (!inProgress) {
            console.log('Received update response but game is not in progress.');
            return;
        }

        // Add discard card to display on discard button
        document.querySelector('#discard-button').innerHTML = discardCard;
        
        if (response.player_order === undefined) {
            console.log('Player order missing from response.');
            return;
        }

        // Unpack players
        // Eventually want to rearrange players to be correct player order
        playerOrder = response.player_order;
        
        
        // The `in` keyword in loop produces indices (like enumerate)
        for (i in playerOrder) 
            // playerOrder[i] is the player name
            players[playerOrder[i]] = {'name': playerOrder[i], 'order': i, 'lives': response.lives[i], 'handSize': response.hand_sizes[i]};
            
            // Once player array is populated, add to player panel for display
            // Turn each attribute (name, order, etc) into a <span> for display
            containerID = '#' + playerOrder[i] + '-container'
            
            // Put order into span
            const order = document.createElement('span');
            order.id = playerOrder[i] + '-order';
            order.innerHTML = i;

            // Add order to player-container
            document.querySelector(containerID).appendChild(order);
            
            // Put lives into span
            const lives = document.createElement('span');
            lives.id = playerOrder[i] + '-lives';
            lives.innerHTML = response.lives[i];

            // Add lives to player-container
            document.querySelector(containerID).appendChild(lives);
            
            // Put hand size into span
            const handSize = document.createElement('span');
            handSize.id = playerOrder[i] + '-hand-size';
            handSize.innerHTML = response.hand_sizes[i];

            // Add hand size to player-container
            document.querySelector(containerID).appendChild(handSize);
            
            // If self, add hand to player object and player container
            if (username === playerOrder[i]) {
                players[playerOrder[i]].hand = response.hand;
                players[playerOrder[i]].handScore = response.hand_score;
                
                // Add hand to container as div
                const hand = document.createElement('div');
                hand.id = playerOrder[i] + '-hand';
                hand.innerHTML = response.hand;
                
                document.querySelector(containerID).appendChild(hand);
                
                // Add hand score to container as div
                const handScore = document.createElement('div');
                handScore.id = playerOrder[i] + '-hand-score';
                handScore.innerHTML = response.hand_score;
                
                document.querySelector(containerID).appendChild(handScore);
            }

            // If current player, mark true
            if (currentPlayer === playerOrder[i]) {
                
                // Make some visual change to show current player. Maybe bold the player name
                document.querySelector('#' + currentPlayer + '-current-player').innerHTML = <b>current</b>;
            }
        


        
    }

}

// Socket functions / events

// Join room
function joinRoom(room) {
    console.log('Client join event.');
    
    // Removing need for passing username here; can assign random name on server side
    // socket.emit('join', {'username': username, 'room': room});
    
    // Pass name of room to server
    socket.emit('join', {'room': room});
}

// Leave room
function leaveRoom(username, room) {
    // For debug:
    console.log(`${username} has left the ${room} room.`);
    
    socket.emit('leave', {'username': username, 'room': room});
}

// Custom 'update' event on action from server
socket.on('update', data => {
    // For debug:
    console.log(`Client received update event: ${JSON.stringify(data)}.`);

    update(data);
});

socket.on('connect', () => {
    console.log('Client connect event.');
});

// On disconnect, add username
socket.on('disconnect', () => {
    console.log('Client disconnect event.');
    // socket.emit('leave', {'username': username, 'room': room});
});

// Debug msgs for now
socket.on('message', data => {
    console.log(`Client received: ${data.msg}`);
});


// // Submit chat message with 'Enter'
// document.addEventListener('DOMContentLoaded', () => {
//     // Make 'enter' key submit message
//     let msg = document.querySelector('#user_message');
//     msg.addEventListener('keyup', event => {
//         event.preventDefault();
//         if (event.keyCode === 13) {
//             document.querySelector('#send_message').click();
//         }
//     })
// })