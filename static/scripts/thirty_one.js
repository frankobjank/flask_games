// https://socket.io/docs/v4/client-api/

// Room, Socket Variables
// Initializing socket
const socket = io();
let rooms = ['room1', 'room2'];
var currentRoom;

// Client username - assign on connect if not logged into account
var username;

// Number of entries in chat log
var chatLogCount = 0;

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

// On page load - 'Main' function
document.addEventListener('DOMContentLoaded', () => {

    // Elements that need to be on screen
        // Deck (not all the cards, just a button representating the whole deck)
        // Hand
        // Discard pile (same as deck, just a button with one card that represents whole pile)
        // Some representation of other players' hands, scores, avatars
        // Chat / Log box
        // Navigation

    // Auto-join the first room
    // joinRoom(rooms[0]);

    // Creates card table and elements within it
    roomPanel = createRoomPanel();
    
    
    // Add all elements created to container
    document.querySelector('.outer-container').appendChild(roomPanel);
    
    // Need to add onclick for room buttons here after they've been added to document
    addOnClick()
});


function createRoomPanel() {
    const roomPanel = document.createElement('div');
    roomPanel.className = 'room-panel';
    
    for (roomName of rooms) {
        const roomButton = document.createElement('button');
        roomButton.className = 'room-button';
        roomButton.id = roomName + '-button';
        roomButton.innerHTML = roomName;
        
        // Disable button if currently in room
        roomButton.disabled = roomName === currentRoom;
        
        // Adding onclick later with addOnClick()

        roomPanel.appendChild(roomButton);
    }
    
    return roomPanel;
}


function addOnClick() {
    
    // Onclick above was not working; Moving to end of function
    document.querySelectorAll('.room-button').forEach(room => {
        room.onclick = () => {
            if (inProgress) {
                console.log('Cannot switch rooms when game is in progress.');
                return;
            }

            // Check if already in selected room
            if (room.innerHTML === currentRoom) {
                msg = `You are already in ${currentRoom} room.`;
                addToLog(msg);

            } else {
                if (currentRoom === undefined) {
                    joinRoom(room.innerHTML);
                } else {
                    // Leave current room and join new one
                    leaveRoom(username, currentRoom);
                    joinRoom(room.innerHTML);    
                }
            }

        }
    });
}


function createGamePanel() {
    const gamePanel = document.createElement('div');
    gamePanel.className = 'game-panel';
    gamePanel.id = 'game-panel';
    
    table = createTable();
    continueButton = createContinueButton();
    startButton = createStartButton();

    gamePanel.appendChild(table);
    gamePanel.appendChild(continueButton);
    gamePanel.appendChild(startButton);

    return gamePanel;
}


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
        socket.emit('move', {'action': 'draw', 'room': currentRoom});
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
        socket.emit('move', {'action': 'pickup', 'room': currentRoom});
    }
    
    // Add discard button to container
    discardContainer.appendChild(discard);
    
    // Moved this to player container
    // // Create container for hand
    // const handContainer = document.createElement('div');
    // handContainer.className = 'hand-container';
    // Add to table
    // cardTable.appendChild(handContainer);

    return cardTable;
}


function createStartButton() {
    // Start game button
    const start = document.createElement('button');
    
    start.id = 'start-button';
    start.className = 'game-button';
    start.innerHTML = 'Start New Game';

    start.onclick = () => {
        socket.emit('move', {'action': 'start', 'room': currentRoom});
    }

    return start;
}


function createContinueButton() {
    // Continue game button
    const cont = document.createElement('button');
    
    cont.id = 'continue-button';
    cont.className = 'game-button';
    cont.innerHTML = 'Continue to Next Round';
    cont.disabled = true;

    cont.onclick = () => {
        socket.emit('move', {'action': 'continue', 'room': currentRoom});
    }

    return cont;
}


function checkNumPlayers(numPlayers) {
    return (2 <= numPlayers <= 7 && !inProgress);
}


function createPlayerPanel() {
    // Fill in this panel as players are added via createPlayerContainer
    const playerPanel = document.createElement('div');
    playerPanel.className = 'player-panel';
    playerPanel.id = 'player-panel';

    return playerPanel;
}


function createPlayerContainer(name) {
    
    const br = document.createElement('br');
    
    const playerContainer = document.createElement('p');
    playerContainer.className = 'player-container';

    // Give container id of 'playerName-container'
    playerContainer.id = name + '-container';
    playerContainer.innerHTML = name + br.outerHTML;
    
    
    // Put hand size into span
    const handSize = document.createElement('span');
    handSize.id = name + '-hand-size';
    
    // Put order into span
    const order = document.createElement('span');
    order.className = name + '-player-order';
    order.id = name + '-order';
    
    // Put lives into span
    const lives = document.createElement('span');
    lives.className = name + '-player-lives';
    lives.id = name + '-lives';
    
    // Put current indicator into div
    const current = document.createElement('div');
    current.id = name + '-current';
    if (name === currentPlayer) {
        current.textContent = 'current';
    }
    
    playerContainer.appendChild(handSize);
    playerContainer.appendChild(order);
    playerContainer.appendChild(lives);
    playerContainer.appendChild(current);
    
    // Only add hand, hand score, knock button for self
    if (name === username) {
        // Put hand in div
        const hand = document.createElement('div');
        hand.id = name + '-hand-container';
        
        // Put hand score into div
        const handScore = document.createElement('div');
        handScore.id = name + '-hand-score';
        
        // Add knock button
        const knockButton = document.createElement('button');
        knockButton.className = 'knock-button';
        knockButton.id = name + '-knock';
        knockButton.innerHTML = 'knock';
        
        // Send server request on click
        knockButton.onclick = () => {
            socket.emit('move', {'action': 'knock', 'room': currentRoom});
            console.log(`Sending knock request to server.`)
        }

        playerContainer.appendChild(hand);
        playerContainer.appendChild(handScore);
        playerContainer.appendChild(knockButton);
        
        // Highlight self name and player info
        playerContainer.style.color = 'purple';
    }

    return playerContainer;
}

// ADDED FROM SANDBOX
// Add message to chat log
function addToLog(msg, sender="") {
    chatLogCount++;
    
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-log-message';
    msgElement.id = 'chat-log-message-' + chatLogCount;
    
    // Add sender to msg only if sender is given; otherwise system message
    if (sender.length > 0) {
        const senderSpan = document.createElement('span');
        senderSpan.className = 'player-name chat message';
        senderSpan.id = 'sender-span-' + sender;
        // Can set color by sender !
        // senderSpan.style.color = 'blue';
        senderSpan.innerHTML = sender + ': ';

        msgElement.append(senderSpan);
    }
    else {
        // Set sender to 'system' if no sender provided
        sender = 'system';
    }

    msgElement.innerHTML += msg;
    
    // Set custom attribute 'sender' for all msgs
    msgElement.setAttribute('sender', sender);
    // Could add time received to custom attribute and use that to separate if over certain time
    
    // Check sender of previous msg and add line break to beginning of msg if different sender
    if (chatLogCount > 1) {
        previousMsgId = 'chat-log-message-' + (chatLogCount - 1);
    
        if (document.querySelector('#' + previousMsgId).getAttribute('sender') !== msgElement.getAttribute('sender')) {
            const br = document.createElement('br');
            msgElement.innerHTML = br.outerHTML + msgElement.innerHTML;
        }
    }
    
    const messageArea = document.querySelector('#chat-log-messages');
    messageArea.append(msgElement);
    
    // Scroll to bottom when new msg received
    messageArea.scrollTop = messageArea.scrollHeight;
};


// Create chat log / panel
function createChatLogPanel(username) {

    const chatLogPanel = document.createElement('div');
    chatLogPanel.className = 'chat log panel';
    chatLogPanel.id = 'chat-log-panel';
    
    const chatLogContainer = document.createElement('div');
    chatLogContainer.className = 'chat log container rounded-0';
    chatLogContainer.id = 'chat-log-container';

    const chatLogMessages = document.createElement('div');
    chatLogMessages.className = 'chat log messages';
    chatLogMessages.id = 'chat-log-messages';
    
    // input start
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chat input container';
    inputContainer.id = 'chat-input-container';
    
    const usernameSpan = document.createElement('div');
    usernameSpan.className = 'chat-span input';
    usernameSpan.id = 'chat-input-username';
    // `&nbsp;` adds a space before input box
    usernameSpan.innerHTML = username + ': &nbsp;';
    
    const messageInput = document.createElement('input');
    messageInput.className = 'chat input';
    messageInput.id = 'chat-input-box';
    messageInput.type = 'text';
    messageInput.autocomplete = 'off';
    
    const paddingSpan = document.createElement('span');
    paddingSpan.className = 'chat input padding span'
    paddingSpan.id = 'chat-input-padding-span'
    paddingSpan.innerHTML = ' &nbsp;';
    
    const sendMessageButton = document.createElement('button');
    sendMessageButton.className = 'chat-button input';
    sendMessageButton.id = 'chat-input-send-button';
    sendMessageButton.innerHTML = '>';
    
    // Button onclick behavior
    sendMessageButton.onclick = () => {
        // Prevent sending blank messages
        if (messageInput.value.length > 0) {
            socket.send({'msg': messageInput.value, 'username': username, 'room': currentRoom});
            
            // Clear input area
            messageInput.value = '';
        };
    };

    // Set `enter` to send message
    messageInput.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            sendMessageButton.click();
        };
    });
    
    inputContainer.appendChild(usernameSpan);
    inputContainer.appendChild(messageInput);
    inputContainer.appendChild(paddingSpan);
    inputContainer.appendChild(sendMessageButton);
    // input end

    // Add messages & input to container
    chatLogContainer.appendChild(chatLogMessages);
    chatLogContainer.appendChild(inputContainer);

    // Add container to panel
    chatLogPanel.appendChild(chatLogContainer);

    return chatLogPanel;
};


function cardToDisplay(serverCard) {
    /*
        '\u2664': ♤,
        '\u2665': ♥,
        '\u2666': ♦,
        '\u2667': ♧
    */

    if (serverCard === null) {
        return 'No card';
    }

    rank = serverCard[0];
    suit = serverCard[1];
    
    if (rank === 'T') {
        rank = '10';
    }

    if (suit === 'S') {
        suit = '\u2664';
    }
    else if (suit === 'H') {
        suit = '\u2665';
    }
    else if (suit === 'D') {
        suit = '\u2666';
    }
    else if (suit === 'C') {
        suit = '\u2667';
    }

    return rank + suit;
}


function createHandButton(serverCard) {
    // serverCard = 'KS', 'QH', 'TD', '9C', ...
    const cardButton = document.createElement('button');
    cardButton.className = 'hand-button';
    cardButton.id = serverCard;
    cardButton.innerHTML = cardToDisplay(serverCard);

    // Send server request on click
    cardButton.onclick = () => {
        socket.emit('move', {'action': 'discard', 'room': currentRoom, 'card': cardButton.id});
        console.log(`Requesting discard ${cardButton.id}`)
    }
    return cardButton;
}


function addPlayers(players) {

    // Save player list
    for (player of players) {
        // Check if player already in list
        if (!(playersConnected.includes(player))) {
            
            // If player not in list, add to list and player panel
            playersConnected.push(player);
            
            // Create new container
            playerContainer = createPlayerContainer(player);
            document.querySelector('.player-panel').appendChild(playerContainer);
        }
    }

}


// Opposite of addPlayers
function removePlayers(players) {
    console.log(`Removing players: ${players}`)
        
    // Remove anyone on local list who isn't on server list
    for (player of playersConnected) {
        // Check if player already in list
        if ((players.includes(player))) {
            
            addToLog(`${player} has left.`)

            let containerID = '#' + player + '-container'

            // Remove player from player panel
            playerContainer = document.querySelector(containerID);
            document.querySelector('.player-panel').removeChild(playerContainer);
            
            console.log(`Found ${playerContainer} with id ${containerID}, removing ${player} from panel`);

            // Remove player from local list
            const index = playersConnected.indexOf(player);
            if (index > -1) {
                playersConnected.splice(index, 1);
            }
        }
    }

}


function updateRoom(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
    }

    // Add event - setup room to call on join, 
    //           - teardown room to call on leave
    
    // On connect, add username, join room
    if (response.action === 'setup_room') {
        // Update global var `currentRoom`
        currentRoom = response.room;

        // Disable current room button in room panel
        for (room of rooms) {
            roomButtonID = '#' + room + '-button';

            // Disable button if currently in room; Enable all others
            document.querySelector(roomButtonID).disabled = room === currentRoom;
        }

        // Assign username if not yet defined
        if (username === undefined) {
            username = response.username;
        }

        // Create game, player, chat panels if username is assigned
        if (username.length > 0) {
            
            // Create panels from scratch on EVERY join
            // Game, player, chat panels are removed on leave
            
            // Create new game panel
            const gamePanel = createGamePanel();
            document.querySelector('.outer-container').appendChild(gamePanel);
            
            // Create new player panel
            const playerPanel = createPlayerPanel();
            document.querySelector('.outer-container').appendChild(playerPanel);
            
            if (document.querySelector('#chat-log-panel') === null) {
                const chatLogPanel = createChatLogPanel(username);
                document.querySelector('.outer-container').appendChild(chatLogPanel);
            }
            else {
                // If chat log exists it should persist;
                // Remove and then append to end of outer-container div
                const chatLogPanel = document.querySelector('.outer-container').removeChild(document.querySelector('#chat-log-panel'));

                document.querySelector('.outer-container').appendChild(chatLogPanel);
            }

            
        };
    }

    // On leave
    else if (response.action === 'teardown_room') {
        
        // Remove game panel if it exists
        if (document.querySelector('#game-panel') !== null) {
            
            // .remove() removes element without having to know parent
            document.querySelector('#game-panel').remove();
        }
        
        // Maybe combine player panel with game panel?
        // Remove old player panel
        if (document.querySelector('#player-panel') !== null) {
            document.querySelector('#player-panel').remove();
        }
        
        // Remove chat panel - or persist chat panel
        // if (document.querySelector('#chat-log-panel') !== null) {
        //     document.querySelector('#chat-log-panel').remove();
        // }

        // Set current room to null
        currentRoom = null;
        
        // Reset game vars when leaving room
        inProgress = false;
        mode = '';
        currentPlayer = '';
        discardCard = '';
        playerOrder = [];
        playersConnected = [];
    }

    // Add players to player panel on join
    else if (response.action === 'add_players') {
        addPlayers(response.players);
    }
    
    // Remove players on leave
    else if (response.action === 'remove_players') {
        removePlayers(response.players);
    }
}

function updateGame(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
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
    // "recipient": player_name,
    // "hand": self.players[player_name].zip_hand(),  # hand for self only
    // "hand_score": self.calc_hand_score(self.players[player_name]),  # hand score for self
    
    if (response.action === 'update_board') {
        
        // Unpack general state
        inProgress = response.in_progress;
        mode = response.mode;
        currentPlayer = response.current_player;
        discardCard = response.discard;

        // Fill log
        for (msg of response.log) {
            addToLog(msg);
        }
        
        if (!inProgress) {
            console.log('Received update response but game is not in progress.');
            return;
        }
        
        if (response.player_order === undefined) {
            console.log('Player order missing from response.');
            return;
        }
        
        // Disable start button when game in progress; Enable when not in progress
        document.querySelector('#start-button').disabled = inProgress;
        
        // Enable continue button on round end (and NOT on game end)
        if (mode === 'end_round') {
            document.querySelector('#continue-button').disabled = false;
            
            // TODO figure out how to delay display of winner by ~3 seconds to make reveal more realistic to a real game
            // Maybe use roundEnd flag that gets reset every round start. Or can go by specific log messages but that seems more fragile
        }
        
        // Disable continue button on every other mode
        else {
            document.querySelector('#continue-button').disabled = true;
        }

        // Add discard card to display on discard button
        document.querySelector('#discard-button').innerHTML = cardToDisplay(discardCard);
        
        // Unpack players
        // Eventually want to rearrange players to be correct player order
        playerOrder = response.player_order;
        
        // Loop player order to fill containers
        for (let i = 0; i < playerOrder.length; i++) {
            
            // playerOrder[i] is the player name
            players[playerOrder[i]] = {'name': playerOrder[i], 'order': i, 'lives': response.lives[i], 'handSize': response.hand_sizes[i]};

            // Once player array is populated, add to player panel for display
            // Turn each attribute (name, order, etc) into a <span> for display
            playerID = '#' + playerOrder[i];


            // Update order
            document.querySelector(playerID + '-order').innerHTML = ' order: ' + i + ' ';
            
            // Update lives
            document.querySelector(playerID + '-lives').innerHTML = ' lives: ' + response.lives[i] + ' ';
            
            // Update hand size
            document.querySelector(playerID + '-hand-size').innerHTML = ' hand size: ' + response.hand_sizes[i] + ' ';
            console.log(`username = ${username}`)
            console.log(`playerOrder[i] = ${playerOrder[i]}`)
            
            // If self, update hand with exact cards
            if (username === playerOrder[i]) {
                // Update `players` array
                players[playerOrder[i]].hand = response.hand;
                players[playerOrder[i]].handScore = response.hand_score;
                
                playerHandContainer = document.querySelector(playerID + '-hand-container');
                
                if (playerHandContainer.hasChildNodes()) {
                    // Empty old hand to get ready for new hand - replaceChildren with no args
                    playerHandContainer.replaceChildren();
                }

                // Create buttons for hand with array from server
                for (card of response.hand) {
                    playerHandContainer.appendChild(createHandButton(card));
                }
                
                // Update hand score HTML
                document.querySelector(playerID + '-hand-score').innerHTML = ' hand score: ' + response.hand_score + ' ';   
            }
            
            
            // If current player, mark true
            if (currentPlayer === playerOrder[i]) {
                
                // Make some visual change to show current player. Maybe bold the player name
                document.querySelector(playerID + '-current').innerHTML = 'current';
                
                // Set attribute - not sure if bool is allowed, so 1 for true and 0 for false
                document.querySelector(playerID + '-container').setAttribute('current', '1');
            }
            else {
                document.querySelector(playerID + '-current').innerHTML = '';
                document.querySelector(playerID + '-container').setAttribute('current', '0');
            }
        }
    }
}


// Socket functions / events

// Join room
function joinRoom(room) {
    console.log('Client join event.');
    
    // Pass name of room to server
    socket.emit('join', {'room': room});
    
    // Server should check for game state on join and load game if game is in progress
}

// Leave room
function leaveRoom(username, room) {
    console.log('Client leave event.');
    
    if (currentRoom === null || currentRoom === undefined) {
        console.log('Leave room called but not in room.');
        return;
    }
    
    // For debug:
    console.log(`${username} has left ${room}.`);

    socket.emit('leave', {'username': username, 'room': room});
}

// Updating room state
socket.on('update_room', data => {
    // For debug:
    console.log(`Client received update_room event: ${JSON.stringify(data)}.`);
    
    updateRoom(data);
});

// Updating game state
socket.on('update_game', data => {
    // For debug:
    console.log(`Client received update game event: ${JSON.stringify(data)}.`);
    
    updateGame(data);
});

// Example from socket.io using socket.recovered
// socket.on("connect", () => {
//     if (socket.recovered) {
//       // any event missed during the disconnection period will be received now
//     } else {
//       // new or unrecoverable session
//     }
//   });

socket.on('connect', () => {
    console.log('Client connect event.');
    // Incorporate `socket.recovered`?
});

// On disconnect, add username
socket.on('disconnect', () => {
    console.log('Client disconnect event.');
});


// Use this for reloading the page on reconnect - should ping server to reload page? or at least fill in missing info
socket.on("reconnect", (attempt) => {
    console.log('ON RECONNECT')
    // attempt = number of attempts to reconnect
    // ...
  });

// Receiving log / chat messages
socket.on('message', data => {
    addToLog(data.msg, data.sender);
    console.log(`Client received: ${data.msg}`);
});

// Receiving log / chat messages
socket.on('debug_msg', data => {
    console.log(`Client debug msg received: ${data.msg}`);
});
