// https://socket.io/docs/v4/client-api/

// Room, Socket Variables
// Initializing socket
const socket = io();

// Client username - assign on connect if not logged into account
var username;
var currentRoom = 'lobby';

// On page load
document.addEventListener('DOMContentLoaded', () => {

    // Join room - defaults to lobby
    joinRoom(currentRoom);
});

// Include:
    // Option to create new room
    // Option to delete room (but only can be done by creator of room or site admin)
    // Table of rooms - columns:
        // "name": self.name,
        // "game_name": self.game_name,
        // "capacity": self.capacity,
        // "date_created": strftime('%Y-%m-%d %I:%M:%S %p', localtime(self.date_created)),
        // "creator": self.creator,
        // "clients_connected": len(self.clients),
        // "in_progress": in_progress
        
        // 'Join room' button

        // <th id="room-th-name">Name</th>
        // <th id="room-th-game">Game</th>
        // <th id="room-th-players">Players</th>
        // <th id="room-th-date_created">Date Created</th>
        // <th id="room-th-creator">Created By</th>
        // <th id="room-th-in_progress">Game Running?</th>

function addRooms(newRooms) {
    const tbody = document.querySelector('#room-tbody');

    for (const room of newRooms) {

        // Check if room already exists - do not allow rooms with the same name
        if (document.querySelector('#room-tr-' + room.name) !== null) {
            console.log(`Duplicate room found when adding room ${room.name}.`);
            continue;
        }

        const row = document.createElement('tr');
        row.className = 'room-tr';
        row.id = 'room-tr-' + room.name;

        // Adding onclick to row instead of using button or anchor
        row.onclick = () => {

            // Leave lobby and join selected room
            const promise = leaveRoom(username, currentRoom);
                            
            // Process leaveRoom as a promise
            promise
                .then(() => {
                    // On successful leave, teardown will be requested by server
                    console.log(`Successfully left ${currentRoom}.`);

                    joinRoom(room.name);
                })
                .catch((error) => {
                    console.log(`Could not leave ${currentRoom}: ${error}`);
                });
        }

        const tdname = document.createElement('td');
        tdname.className = 'room-td';
        tdname.innerHTML = room.name;
        row.appendChild(tdname);
        
        const tdgame = document.createElement('td');
        tdgame.className = 'room-td';
        tdgame.innerHTML = room.game_name;
        row.appendChild(tdgame);
        
        const tdplayers = document.createElement('td');
        tdplayers.className = 'room-td';
        tdplayers.id = 'room-td-players-' + room.name;
        tdplayers.innerHTML = `${room.clients_connected} / ${room.capacity}`;
        row.appendChild(tdplayers);
        
        const tdcreator = document.createElement('td');
        tdcreator.className = 'room-td';
        tdcreator.innerHTML = room.creator;
        row.appendChild(tdcreator);
        
        const tddate = document.createElement('td');
        tddate.className = 'room-td';
        tddate.innerHTML = room.date_created;
        row.appendChild(tddate);
        
        const tdin_progress = document.createElement('td');
        tdin_progress.className = 'room-td';
        tdin_progress.id = 'room-td-in_progress-' + room.name;
        tdin_progress.innerHTML = room.in_progress;
        row.appendChild(tdin_progress);

        tbody.appendChild(row);
    }
    
}


// Game state
let inProgress = false;
var mode;
var currentPlayer;
var discardCard;
var playerOrder = [];
var chatLogCount = 0;  // Number of entries in chat log
let playersConnected = [];  // Keep track of player names connected

// Multi-dimensional array of player `objects` that can be looked up by username
    // Player objects should include:
    // player = {name: '', order: 0, lives: 0, handSize: 0, hand: [], handScore: 0};
let players = {};


function createLobbyButton() {
    const toLobby = document.createElement('button');
    toLobby.className = 'room-nav';
    toLobby.innerHTML = 'Return to Lobby';
    toLobby.onclick = () => {
        // Leave current room and join lobby
        const promise = leaveRoom(username, currentRoom);
                        
        // Process leaveRoom as a promise
        promise
            .then(() => {
                // On successful leave, teardown will be requested by server
                console.log(`Successfully left ${currentRoom}.`);

                joinRoom('lobby');
            })
            .catch((error) => {
                console.log(`Could not leave ${currentRoom}: ${error}`);
            });
    }
    return toLobby;
}

function createGamePanel() {
    const gamePanel = document.createElement('div');
    gamePanel.className = 'game-panel';
    gamePanel.id = 'game-panel';
    
    board = createBoard();
    continueButton = createContinueButton();
    startButton = createStartButton();

    gamePanel.appendChild(board);
    gamePanel.appendChild(continueButton);
    gamePanel.appendChild(startButton);

    return gamePanel;
}

function createBoard() {

    // Create div for board
    const board = document.createElement('div');
    board.className = 'board mb-5';

    // Create deck container
    const deckContainer = document.createElement('div');
    deckContainer.className = 'deck-container';
    
    // Add deck to board
    board.appendChild(deckContainer);

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
    
    // Add discard to board
    board.appendChild(discardContainer);
    
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
    // Add to board
    // board.appendChild(handContainer);

    return board;
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
    
    // new session, start game. round end, continue; game end, new game 
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

// Add message to chat log
function addToLog(msg, sender) {
    chatLogCount++;
    
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-log-message';
    msgElement.id = 'chat-log-message-' + chatLogCount;
    
    // Add sender to msg if not a system message
    if (sender !== 'system') {
        const senderSpan = document.createElement('span');
        senderSpan.className = 'player-name chat message';
        senderSpan.id = 'sender-span-' + sender;
        // Can set color by sender !
        // senderSpan.style.color = 'blue';
        senderSpan.innerHTML = sender + ': ';

        msgElement.append(senderSpan);
    }

    // Debug log
    console.log(`Client received: ${msg} from ${sender}`);

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
    
    const chatLogHeader = document.createElement('div');
    chatLogHeader.className = 'chat log header';
    chatLogHeader.id = 'chat-log-header';
    // Header should display room name - and player name?
    chatLogHeader.innerHTML = '<h4>' + username + ' - ' + currentRoom + '</h4>';
    

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
    chatLogContainer.appendChild(chatLogHeader);
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
    for (let i = 0; i < players.length; i++) {

        // Check if player already in list
        if (!(playersConnected.includes(players[i]))) {
            
            // If player not in list, add to list and player panel
            playersConnected.push(players[i]);
        }

        // Check if container exists already
        if (document.querySelector('#' + players[i] + '-container') === null) {
            
            // Create new container if one does not exist
            playerContainer = createPlayerContainer(players[i]);
            document.querySelector('.player-panel').appendChild(playerContainer);
        }

        // If container already exists, set their connection status to connected
        else {
            document.querySelector('#' + players[i] + '-container').setAttribute('connected', '1');
            players[i].connected = true;
        }
    }

}

// Opposite of addPlayers
function removePlayers(players) {
        
    // Remove anyone on local list who isn't on server list
    for (let i = 0; i < playersConnected.length; i++) {
        // Check if player already in list
        if ((players.includes(playersConnected[i]))) {
            
            let containerID = '#' + playersConnected[i] + '-container'

            // Remove player from player panel
            playerContainer = document.querySelector(containerID);
            document.querySelector('.player-panel').removeChild(playerContainer);
            
            console.log(`Found ${playerContainer} with id ${containerID}, removing ${playersConnected[i]} from panel`);
            
            // Remove player from local list
            playersConnected.splice(i, 1);
        }
    }

}

function updateLobby(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
    }
    
    // Called on join. Client adds username, builds room.
    if (response.action === 'setup_room') {
        
        // Update global var `currentRoom`
        currentRoom = response.room;
        
        // Assign username if not yet defined
        if (username === undefined) {
            username = response.username;
        }
    
        // Update header
        document.querySelector('#room-name-header').innerHTML = 'Lobby';
        
        // Create lobby container
        lobbyContainer = document.createElement('div');
        lobbyContainer.className = 'lobby-container';
        document.querySelector('.outer-container').appendChild(lobbyContainer);
        
        lobbyHeader = document.createElement('div');
        lobbyHeader.className = 'lobby-header';
        lobbyContainer.appendChild(lobbyHeader);

        addRoomContainer = document.createElement('div');
        addRoomContainer.className = 'add-room';
        lobbyContainer.appendChild(addRoomContainer);
        
        addRoomAnchor = document.createElement('a');
        addRoomAnchor.className = 'add-room';
        addRoomAnchor.id = 'add-room-nav';
        addRoomAnchor.href = '/create_room.html';
        addRoomAnchor.innerHTML = 'Create Room';

        addRoomContainer.appendChild(addRoomAnchor);

        // Add username input `form` here?

        tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        lobbyContainer.appendChild(tableContainer);

        roomTable = document.createElement('table');
        roomTable.className = 'table table-striped room-table';
        roomTable.id = 'room-table';
        tableContainer.appendChild(roomTable);

        // Creating thead
        thead = document.createElement('thead');
        thead.className = 'room-thead';
        thead.id = 'room-thead';
        roomTable.appendChild(thead);

        // Creating all header cells
        theadRoom = document.createElement('th');
        theadRoom.id = 'room-thead-name';
        theadRoom.innerHTML = 'Room';
        thead.appendChild(theadRoom);

        theadGame = document.createElement('th');
        theadGame.id = 'room-thead-game';
        theadGame.innerHTML = 'Game';
        thead.appendChild(theadGame);

        theadPlayers = document.createElement('th');
        theadPlayers.id = 'room-thead-players';
        theadPlayers.innerHTML = 'Players';
        thead.appendChild(theadPlayers);

        theadCreator = document.createElement('th');
        theadCreator.id = 'room-thead-creator';
        theadCreator.innerHTML = 'Created By';
        thead.appendChild(theadCreator);

        theadDate = document.createElement('th');
        theadDate.id = 'room-thead-date_created';
        theadDate.innerHTML = 'Date Created';
        thead.appendChild(theadDate);

        theadInProgress = document.createElement('th');
        theadInProgress.id = 'room-thead-in_progress';
        theadInProgress.innerHTML = 'Game Running?';
        thead.appendChild(theadInProgress);
        // End thead

        // Create tbody - to be filled in via addRooms
        tbody = document.createElement('tbody');
        tbody.className = 'room-tbody';
        tbody.id = 'room-tbody';
        roomTable.appendChild(tbody);
    }

    // Called on leave. Removes panels so they can be re-added with new data.
    else if (response.action === 'teardown_room') {

        // Remove lobby container
        if (document.querySelector('.lobby-container') !== null) {
            document.querySelector('.lobby-container').remove();
        }
    }

    // Add rooms to lobby
    else if (response.action === 'add_rooms') {
        // Called when loading lobby and when creating new room
        addRooms(response.rooms);
    }

    // Update number of players in a room when a player leaves or joins
    else if (response.action === 'update_lobby_table') {
        
        // Check that row exists
        if (document.querySelector('#room-tr-' + response.row) === null) {
            console.log(`${response.row} does not exist.`);
            return;
        }

        // Update number of players
        if (response.col === 'players') {
            document.querySelector('#room-td-players-' + response.row).innerHTML = response.new_value;
        }

        // Update in_progress
        else if (response.col === 'in_progress') {
            // This will be difficult to do on server side, maybe the rooms can detect when there is a change in in_progress variable and send to lobby when that change occurs. It could also do the same for number of players....
            document.querySelector('#room-td-in_progress-' + response.row).innerHTML = response.new_value;
        }
        
    }
}

function updateGameRoom(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
    }
    
    // Called on join. Client adds username, builds room.
    if (response.action === 'setup_room') {
        
        // Update global var `currentRoom`
        currentRoom = response.room;
        
        // Assign username if not yet defined
        if (username === undefined) {
            username = response.username;
        }
    
        // Set up game room
        // Update header
        document.querySelector('#room-name-header').innerHTML = response.room;

        gameContainer = document.createElement('div');
        gameContainer.className = 'game-container';
        document.querySelector('.outer-container').appendChild(gameContainer);

        // Create `to lobby` button
        const toLobby = createLobbyButton();
        gameContainer.appendChild(toLobby);
        
        // Create game, player, chat panels if username is assigned
        if (username.length > 0) {
            
            // Create panels from scratch on EVERY join
            // Game, player, chat panels are removed on leave
            
            // Create new game panel
            const gamePanel = createGamePanel();
            gameContainer.appendChild(gamePanel);
            
            // Create new player panel
            const playerPanel = createPlayerPanel();
            gameContainer.appendChild(playerPanel);
            
            if (document.querySelector('#chat-log-panel') === null) {
                const chatLogPanel = createChatLogPanel(username);
                gameContainer.appendChild(chatLogPanel);
            }
            else {
                // If chat log exists it should persist;
                // Remove and then append to end of game-container div
                const chatLogPanel = gameContainer.removeChild(document.querySelector('#chat-log-panel'));

                gameContainer.appendChild(chatLogPanel);
            }         
        }
    }
    

    // Called on leave. Removes panels so they can be re-added with new data.
    else if (response.action === 'teardown_room') {

        // Teardown game room - Remove game panel if it exists
        if (document.querySelector('.game-container') !== null) {
            document.querySelector('.game-container').remove();
        }

        // Reset msg count to 0 if chat is not persisting
        chatLogCount = 0;

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

    // Update player connection
    else if (response.action === 'conn_status') {
        
        // Response player should only contain 1 player for conn_status messages
        for (const player of response.players) {
            
            // Check if player exists - player may not have been added yet
            if (document.querySelector('#' + player + '-container') ===  null) {
                continue;
            }

            console.log(`Update conn status for ${player}: ${response.connected}`);

            // Set `connected` attribute; 1 for true and 0 for false
            // Update local `players` object
            if (response.connected) {
                document.querySelector('#' + player + '-container').setAttribute('connected', '1');
                players[player].connected = true;
            }
            else {
                document.querySelector('#' + player + '-container').setAttribute('connected', '0');
                players[player].connected = false;
            }

        }
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
    // "dealer": self.dealer,  # dealer of round
    // "knocked": self.knocked,  # player who knocked (empty string until a knock)

    // # Specific to player
    // "recipient": player_name,
    // "hand": self.players[player_name].zip_hand(),  # hand for self only
    // "hand_score": self.calc_hand_score(self.players[player_name]),  # hand score for self

    // Add markers for dealer and knocked
    
    if (response.action === 'update_board') {
        
        // Unpack general state
        inProgress = response.in_progress;
        mode = response.mode;
        currentPlayer = response.current_player;
        discardCard = response.discard;

        // Fill log
        for (const msg of response.log) {
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
            players[playerOrder[i]] = {'name': playerOrder[i], 'order': i, 'lives': response.lives[i], 'handSize': response.hand_sizes[i], 'connected': true};

            // Once player array is populated, add to player panel for display
            // Turn each attribute (name, order, etc) into a <span> for display
            playerID = '#' + playerOrder[i];


            // Update order
            document.querySelector(playerID + '-order').innerHTML = ' order: ' + i + ' ';
            
            // Update lives
            document.querySelector(playerID + '-lives').innerHTML = ' lives: ' + response.lives[i] + ' ';
            
            // Update hand size
            document.querySelector(playerID + '-hand-size').innerHTML = ' hand size: ' + response.hand_sizes[i] + ' ';
            
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
                for (const card of response.hand) {
                    playerHandContainer.appendChild(createHandButton(card));
                }
                
                // Update hand score HTML
                document.querySelector(playerID + '-hand-score').innerHTML = ' hand score: ' + response.hand_score + ' ';   
            }
            
            
            // If current player, mark true
            if (currentPlayer === playerOrder[i]) {
                
                // Make some visual change to show current player. Maybe bold the player name
                // document.querySelector(playerID + '-current').innerHTML = 'current';
                
                // Set attribute - not sure if bool is allowed, so 1 for true and 0 for false
                document.querySelector(playerID + '-container').setAttribute('current', '1');
            }
            else {
                // document.querySelector(playerID + '-current').innerHTML = '';
                document.querySelector(playerID + '-container').setAttribute('current', '0');
            }

            // Set connected status to True when creating player
            document.querySelector(playerID + '-container').setAttribute('connected', '1');
        }
    }
}


// Socket functions / events

// Join room
function joinRoom(room) {
    console.log('Client join event.');
    
    // Pass name of room to server
    socket.emit('join', {'room': room});
    
    // Server checks for game state on join and load game if game is in progress
}

// Leave room - async function so it blocks join from running until room teardown
async function leaveRoom(username, room) {
    
    console.log('Requesting leave event.');

    if (currentRoom === null || currentRoom === undefined) {
        console.log('Leave room called but not in room.');
        return;
    }

    try {
        // Using emitWithAck - has a callback and is blocking
        const response = await socket.emitWithAck('leave', {'username': username, 'room': room});
        console.log(`Response = ${response}`);
        return response;        
    } 
    catch (err) {
        throw new Error(`Leave error: ${err}`);
    }

}

// Updating lobby
socket.on('update_lobby', data => {
    // For debug:
    console.log(`Client received update_lobby event: ${JSON.stringify(data)}.`);
    
    updateLobby(data);
});

// Updating room state
socket.on('update_gameroom', data => {
    // For debug:
    console.log(`Client received update_gameroom event: ${JSON.stringify(data)}.`);
    
    updateGameRoom(data);
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

socket.on('disconnect', () => {
    console.log('Client disconnect event.');
});


// Use this for reloading the page on reconnect - should ping server to reload page? or at least fill in missing info
socket.on('reconnect', (attempt) => {
    console.log('ON RECONNECT')
    // attempt = number of attempts to reconnect
    // ...
  });

// Receiving log / chat messages
socket.on('chat_log', data => {
    addToLog(data.msg, data.sender);
});

// Receiving debug messages
socket.on('debug_msg', data => {
    console.log(`Client debug msg received: ${data.msg}`);
});
