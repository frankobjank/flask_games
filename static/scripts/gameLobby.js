// https://socket.io/docs/v4/client-api/

// Room, Socket Variables
// Initializing socket
const socket = io();
// TODO: Add leaveRoom() functions to all nav buttons that direct user to different page

// Client username - assign on connect if not logged into account
var username;

// Used on join to keep track of current room
var currentRoom;

// Use for validation when creating new usernames / room names
const nameValidation = '[a-zA-Z0-9_]{4,12}'  // Alphanumeric, underscores, len 3-12
const roomNameValidation = '[a-zA-Z0-9_]{4,18}'  // Alphanumeric, underscores, len 3-18
const roompwValidation = '^$|.{4,18}'  // Empty OR any string len 4-18

// On page load
document.addEventListener('DOMContentLoaded', () => {
    // Join room - will join lobby on initial GET
    joinRoom('lobby');
});

// Overlay for background of modals; 
// Can use same one for every modal since it covers whole screen
const modalOverlay = document.createElement('div');
modalOverlay.id = 'modal-overlay';
// Allows user to click outside of modal to close it
modalOverlay.onclick = () => {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        closeModal(modal);
    })
}

document.querySelector('body').appendChild(modalOverlay);

function createUsernameModal(roomToJoin) {
    // Copied from createUsernameInput for use on lobby header
    // Currently only used to enter username when trying to enter a room.
    // Room will be passed back on set_username response automatically join room after username is set

    // Modal for setting username
    const usernameModal = document.createElement('div');
    usernameModal.className = 'modal set-username active';
    usernameModal.id = 'username-modal';
    // Prevent clicking outside of the modal
    usernameModal.dataset.backdrop = 'static';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header set-username';
    modalHeader.innerText = 'Please enter a username to enter the room.'

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close-button set-username';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        closeModal(usernameModal);
    }

    modalHeader.appendChild(closeButton);
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title set-username';
    modalTitle.innerText = 'Enter a name:';
    
    const modalBody = document.createElement('div');
    modalBody.id = 'username-modal-body';
    modalBody.className = 'modal-body set-username';

    const addUsernameLabel = document.createElement('label');
    addUsernameLabel.htmlFor = 'username-modal-input'

    const addUsernameInput = document.createElement('input');
    addUsernameInput.className = 'modal-input form-control w-auto';
    addUsernameInput.id = 'username-modal-input';
    addUsernameInput.type = 'text';
    addUsernameInput.autocomplete = 'off';
    addUsernameInput.placeholder = 'Enter username';
    addUsernameInput.pattern = nameValidation;

    const submitButton = document.createElement('button');
    submitButton.className = 'username-modal-button btn btn-secondary form-control w-auto';
    submitButton.innerText = 'Submit username';

    submitButton.onclick = () => {
        // Prevent sending blank input
        if (addUsernameInput.value.length > 0) {

            // Using emitWithAck - for callback. Returns promise
            const promise = socket.emitWithAck('set_username', {'username_request': addUsernameInput.value, 'room': currentRoom});
            
            promise
                .then((data) => {
                    // Msg successfully sent / received but server validation failed.
                    if (!data.accepted) {
                        console.log(`Error: ${data.msg}`);
                        return data.accepted;
                    }
                    
                    // Successful request, add username.
                    username = data.username;
                    console.log(`Username successfully added: ${data.username}.`);

                    // Remove username input container from lobby header
                    if (document.querySelector('#username-input-container') !== null) {
                        document.querySelector('#lobby-username-container').removeChild(document.querySelector('#username-input-container'))
                    }

                    // Add welcome to lobby
                    const welcome = createWelcome();
                    document.querySelector('#lobby-username-container').appendChild(welcome);
                    
                    // Close modal
                    closeModal(usernameModal);

                    // This is circular - row.onclick opened this modal and resolving the modal activates the onclick.
                    // There is probably a way to do this with promises.
                    document.querySelector('#room-tr-' + roomToJoin).click();

                })
                .catch((error) => {
                    console.error(`Could not set username: ${error}`);
                });

        };
    };

    // Set `enter` to send message
    addUsernameInput.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            submitButton.click();
        };
    });
    
    modalBody.appendChild(addUsernameLabel);
    modalBody.appendChild(addUsernameInput);
    modalBody.appendChild(submitButton);

    usernameModal.appendChild(modalHeader);
    usernameModal.appendChild(modalTitle);
    usernameModal.appendChild(modalBody);

    return usernameModal;
}


// Include (for addRooms()):
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
        // Event listener here is async because there is an await in the function
        row.onclick = () => {

            // Prevent joining game room if username not set
            if (currentRoom === 'lobby' && (username === '' || username === undefined)) {
                console.log('Cannot join game room yet: Username is not set.');
                console.log('Opening modal to set username.');

                // Open modal - there is no close button so user must complete it before continuing.
                const usernameModal = createUsernameModal(room.name);
                document.body.appendChild(usernameModal);
                
                // Exit early - will call this function again once username is set
                return;   
            }

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
        tdname.innerText = room.name;
        row.appendChild(tdname);
        
        const tdgame = document.createElement('td');
        tdgame.className = 'room-td';
        tdgame.innerText = room.game_name;
        row.appendChild(tdgame);
        
        const tdplayers = document.createElement('td');
        tdplayers.className = 'room-td';
        tdplayers.id = 'room-td-players-' + room.name;
        tdplayers.innerText = `${room.clients_connected} / ${room.capacity}`;
        row.appendChild(tdplayers);
        
        const tdcreator = document.createElement('td');
        tdcreator.className = 'room-td';
        tdcreator.innerText = room.creator;
        row.appendChild(tdcreator);
        
        const tddate = document.createElement('td');
        tddate.className = 'room-td';
        tddate.innerText = room.date_created;
        row.appendChild(tddate);
        
        const tdin_progress = document.createElement('td');
        tdin_progress.className = 'room-td';
        tdin_progress.id = 'room-td-in_progress-' + room.name;
        tdin_progress.innerText = room.in_progress;
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
    toLobby.className = 'room-nav btn btn-secondary';
    toLobby.id = 'return-lobby-button';
    toLobby.innerText = 'Return to Lobby';
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


function createBoard() {

    // Create div for board
    const board = document.createElement('div');
    board.className = 'board';
    board.id = 'board';

    // Create deck container
    const deckContainer = document.createElement('div');
    deckContainer.className = 'card-container';
    deckContainer.id = 'deck-container';
    
    
    // Create deck button
    const deck = document.createElement('button');
    deck.className = 'playing-card card-back';
    deck.id = 'deck';
    // Adds text on hover
    deck.title = 'Draw a card from the deck.'
    deck.onclick = () => {
        socket.emit('move', {'action': 'draw', 'room': currentRoom});
    }
    
    // Add deck button to container
    deckContainer.appendChild(deck);
    
    // Create discard container
    const discardContainer = document.createElement('div');
    discardContainer.className = 'card-container';
    discardContainer.id = 'discard-container';
    
    // Create discard button
    const discard = document.createElement('button');
    discard.className = 'playing-card card-front';
    discard.id = 'discard-button';
    // Adds text on hover
    // discard.title = 'Pick a card up from discard.'
    discard.onclick = () => {
        socket.emit('move', {'action': 'pickup', 'room': currentRoom});
    }
    
    // Add discard button to container
    discardContainer.appendChild(discard);
    
    // Add deck/discard to board
    board.appendChild(deckContainer);
    board.appendChild(discardContainer);
    
    return board;
}

// Currently unused; Check number of players and in progress
function checkNumPlayers(numPlayers) {
    return (2 <= numPlayers <= 7 && !inProgress);
}

function createMoveButtons() {
    const moveButtonsContainer = document.createElement('div');
    moveButtonsContainer.id = 'move-button-container';

    const drawPickupKnockContainer = document.createElement('div');
    drawPickupKnockContainer.className = 'button-container'
    drawPickupKnockContainer.id = 'draw-pickup-knock-container'

    // Add draw button - same as clicking the deck
    const drawButton = document.createElement('button');
    drawButton.className = 'move-button';
    drawButton.id = 'draw-button';
    drawButton.innerText = 'Draw';
    
    drawButton.onclick = () => {
        socket.emit('move', {'action': 'draw', 'room': currentRoom});
    }
    
    // Add pickup button (from discard) - same as clicking the discard pile
    const pickupButton = document.createElement('button');
    pickupButton.className = 'move-button';
    pickupButton.id = 'pickup-button';
    pickupButton.innerText = 'Pickup';
    
    pickupButton.onclick = () => {
        socket.emit('move', {'action': 'pickup', 'room': currentRoom});
    }
    
    // Add knock button
    const knockButton = document.createElement('button');
    knockButton.className = 'move-button';
    knockButton.id = 'knock-button';
    knockButton.innerText = 'Knock';
    
    knockButton.onclick = () => {
        socket.emit('move', {'action': 'knock', 'room': currentRoom});
    }
    
    drawPickupKnockContainer.appendChild(drawButton);
    drawPickupKnockContainer.appendChild(pickupButton);
    drawPickupKnockContainer.appendChild(knockButton);

    const tempButtonContainer = document.createElement('div');
    tempButtonContainer.id = 'continue-start-container';

    // Create spot for continue / new round buttons that will be only appear in certain cases
    const continueButtonContainer = document.createElement('div');
    continueButtonContainer.className = 'button-container';
    continueButtonContainer.id = 'continue-button-container';
    
    // Continue game button for between rounds
    const continueButton = document.createElement('button');
    
    // new session, start game. round end, continue; game end, new game 
    continueButton.id = 'continue-button';
    continueButton.className = 'move-button';
    continueButton.innerText = 'Continue to Next Round';
    continueButton.disabled = true;

    continueButton.onclick = () => {
        socket.emit('move', {'action': 'continue', 'room': currentRoom});
    }

    continueButtonContainer.appendChild(continueButton);

    // New game button
    const newGameButtonContainer = document.createElement('div');
    
    const newGameButton = document.createElement('button');
    
    newGameButton.className = 'move-button';
    newGameButton.id = 'start-button';
    newGameButton.innerText = 'Start New Game';
    
    newGameButton.onclick = () => {
        socket.emit('move', {'action': 'start', 'room': currentRoom});
    }
    
    newGameButtonContainer.appendChild(newGameButton);
    
    tempButtonContainer.appendChild(continueButtonContainer);
    tempButtonContainer.appendChild(newGameButtonContainer);
    
    moveButtonsContainer.appendChild(drawPickupKnockContainer);
    moveButtonsContainer.appendChild(tempButtonContainer);
    
    return moveButtonsContainer;
}

function createPlayerPanel() {
    // Fill in this panel as players are added via createPlayerContainer
    const playerPanel = document.createElement('div');
    playerPanel.className = 'player-panel';
    playerPanel.id = 'player-panel';

    return playerPanel;
}

function createPlayerContainer(name) {
    
    /* Structure:
        Name
        Hand
        Lives
        Hand Score
    */
    
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';

    // Give container id of 'playerName-container'
    playerContainer.id = name + '-container';
    
    const playerNameContainer = document.createElement('div');
    playerNameContainer.id = name + '-name-container';
    
    const playerNameStrong = document.createElement('strong');
    playerNameStrong.id = name + '-name-strong';
    playerNameStrong.innerText = name;

    playerNameContainer.appendChild(playerNameStrong);

    playerContainer.appendChild(playerNameContainer);
    
    // Put hand in div
    const hand = document.createElement('div');
    hand.className = 'hand-container';
    hand.id = name + '-hand-container';
    
    // Put lives into span
    const lives = document.createElement('div');
    lives.className = 'lives-container';
    lives.id = name + '-lives';
    
    // Put hand score into div
    const handScore = document.createElement('div');
    handScore.id = name + '-hand-score';
    
    playerContainer.appendChild(hand);

    // Text displays beneath cards
    playerContainer.appendChild(lives);
    playerContainer.appendChild(handScore);

    // Add game controls (draw, pickup, knock buttons) for self
    if (name === username) {

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
        senderSpan.innerText = sender + ': ';

        msgElement.append(senderSpan);
    }

    // Debug log
    console.log(`Client received: '${msg}' from '${sender}'`);

    msgElement.innerText += msg;
    
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
    
    const chatLogHeader = document.createElement('h4');
    chatLogHeader.className = 'chat log header';
    chatLogHeader.id = 'chat-log-header';
    // Header should display room name - and player name?
    // Moving away from innerHTML -> innerText
    // chatLogHeader.innerHTML = '<h4>' + username + ' - ' + currentRoom + '</h4>';
    chatLogHeader.innerText = username + ' - ' + currentRoom;
    

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
    sendMessageButton.innerText = '>';
    
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

function setCardDisplay(cardStr, cardObject) {
    /*
        '\u2660': ♠, black
        '\u2665': ♥, red
        '\u2666': ♦, blue
        '\u2663': ♣, green
    */
    
    if (cardStr === null || cardStr.length !== 2) {
       return 'Card data missing or corrupted.';
    }

    let rank = cardStr[0];
    
    // Unpack rank - Change T to 10 for display
    if (rank === 'T') {
        rank = '10';
    }
    
    // Associate unicode suit character with the letter S, H, D, or C
    const SUIT_TO_DISPLAY = {'S': '\u2660', 'H': '\u2665', 'D': '\u2666', 'C': '\u2663'}

    // Add suit to datalist so css can color based on suit
    cardObject.dataset.suit = cardStr[1];
    
    // Set innertext to rank + suit, i.e. 10♥
    cardObject.innerText = rank + SUIT_TO_DISPLAY[cardStr[1]];
}

function createHandButton(serverCard) {
    // serverCard = 'KS', 'QH', 'TD', '9C', ...
    const cardButton = document.createElement('button');
    cardButton.className = 'playing-card card-front hand-button';
    cardButton.id = serverCard;
    // Adds text on hover
    // cardButton.title = 'Discard';
    setCardDisplay(serverCard, cardButton);

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
            playersConnected.push(players[i]);
        }   

        // Check if container exists already
        if (document.querySelector('#' + players[i] + '-container') === null) {
            
            // Create new container if one does not exist
            playerContainer = createPlayerContainer(players[i]);
            document.querySelector('.player-panel').appendChild(playerContainer);

        }
        else {
            document.querySelector('#' + players[i] + '-container').dataset.connected = '1';
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
            
            const containerID = '#' + playersConnected[i] + '-container'

            // Remove player from player panel
            playerContainer = document.querySelector(containerID);
            document.querySelector('.player-panel').removeChild(playerContainer);
            
            console.log(`Found ${playerContainer} with id ${containerID}, removing ${playersConnected[i]} from panel`);
            
            // Remove player from local list
            playersConnected.splice(i, 1);
        }
    }

}

// function createUsernameInput() {
//     // Add username - only display this if username not set yet
//     const usernameInputContainer = document.createElement('div');
//     usernameInputContainer.id = 'username-input-container';
    
//     const addUsernameLabel = document.createElement('label');
//     addUsernameLabel.htmlFor = 'username-input'

//     const addUsernameInput = document.createElement('input');
//     addUsernameInput.className = 'lobby-header-input form-control w-auto';
//     addUsernameInput.id = 'username-input';
//     addUsernameInput.type = 'text';
//     addUsernameInput.autocomplete = 'off';
//     addUsernameInput.placeholder = 'Enter username';
//     addUsernameInput.pattern = nameValidation;
    
//     usernameInputContainer.appendChild(addUsernameInput);

//     const submitButton = document.createElement('button');
//     submitButton.className = 'lobby-header-button btn btn-secondary form-control w-auto';
//     submitButton.innerText = 'Submit username';

//     submitButton.onclick = () => {
//         // Prevent sending blank input
//         if (addUsernameInput.value.length > 0) {

//             // Using emitWithAck - for callback. Returns promise
//             const promise = socket.emitWithAck('set_username', {'username_request': addUsernameInput.value, 'room': currentRoom});
            
//             promise
//                 .then((data) => {
//                     // Msg successfully sent / received but server validation failed.
//                     if (!data.accepted) {
//                         console.log(`Error: ${data.msg}`);
//                         return;
//                     }
                    
//                     // Successful request, add username.
//                     username = data.username;
//                     console.log(`Username successfully added: ${data.username}.`);

//                     document.querySelector('#lobby-username-container').removeChild(document.querySelector('#username-input-container'));

//                     // Add welcome to lobby
//                     const welcome = createWelcome();
//                     document.querySelector('#lobby-username-container').appendChild(welcome);
//                 })
//                 .catch((error) => {
//                     console.error(`Could not set username: ${error}`);
//                 });

//         };
//     };

//     // Set `enter` to send message
//     addUsernameInput.addEventListener('keyup', (event) => {
//         event.preventDefault();
//         if (event.key === 'Enter') {
//             submitButton.click();
//         };
//     });

//     usernameInputContainer.appendChild(submitButton);

//     return usernameInputContainer;
// }

function createWelcome() {
    const welcome = document.createElement('h4');
    welcome.id = 'lobby-welcome';
    welcome.innerText = `Welcome ${username}`;
    return welcome;
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

        // Remove toLobby button
        document.querySelector('#sub-header-left').replaceChildren();
    
        // Update header
        document.querySelector('#sub-header-center-h2').innerText = 'Lobby';
        
        // Create lobby container
        const lobbyContainer = document.createElement('div');
        lobbyContainer.className = 'lobby-container';
        document.querySelector('#outer-container').appendChild(lobbyContainer);
        
        // // -- Lobby header --
        // const lobbyHeader = document.createElement('div');
        // lobbyHeader.className = 'lobby-header';
        // lobbyHeader.id = 'lobby-header-container';
        // lobbyContainer.appendChild(lobbyHeader);
        
        // Container for new room button
        const newRoomContainer = document.createElement('div');
        newRoomContainer.className = 'create-room';
        
        // Create new room modal
        const newRoomModal = createNewRoomModal();
        newRoomContainer.appendChild(newRoomModal);
        
        const newRoomButton = document.createElement('button');
        newRoomButton.className = 'lobby-header-button btn btn-secondary form-control w-auto';
        newRoomButton.id = 'open-modal-create-room';
        newRoomButton.innerText = 'Create Room';
        newRoomButton.onclick = () => {
            openModal(document.querySelector('#create-room-modal'));
        }
        
        newRoomContainer.appendChild(newRoomButton);
        // lobbyHeader.appendChild(newRoomContainer);
        
        // Add new room to sub-header instead of lobby header for consistency
        document.querySelector('#sub-header-left').appendChild(newRoomContainer);
        
        const lobbyUsername = document.createElement('div');
        lobbyUsername.className = 'add-username';
        lobbyUsername.id = 'lobby-username-container';
        
        // Add welcome to sub-header-right instead of lobby header - will need to clear on game room setup
        // lobbyHeader.appendChild(lobbyUsername);
        document.querySelector('#sub-header-right').appendChild(lobbyUsername);
        
        if (username === undefined || username.length === 0) {
            // const usernameInputContainer = createUsernameInput();
            // lobbyUsername.appendChild(usernameInputContainer);
            
        }
        else if (username.length > 0) {
            const welcome = createWelcome();
            lobbyUsername.appendChild(welcome);
            }

        // -- End lobby header --

        // Lobby table
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        lobbyContainer.appendChild(tableContainer);

        const roomTable = document.createElement('table');
        roomTable.className = 'table table-striped room-table';
        roomTable.id = 'room-table';
        tableContainer.appendChild(roomTable);

        // -- Lobby thead --
        const thead = document.createElement('thead');
        thead.className = 'room-thead';
        thead.id = 'room-thead';
        roomTable.appendChild(thead);

        // All header cells
        const theadRoom = document.createElement('th');
        theadRoom.id = 'room-thead-name';
        theadRoom.innerText = 'Room';
        thead.appendChild(theadRoom);

        const theadGame = document.createElement('th');
        theadGame.id = 'room-thead-game';
        theadGame.innerText = 'Game';
        thead.appendChild(theadGame);

        const theadPlayers = document.createElement('th');
        theadPlayers.id = 'room-thead-players';
        theadPlayers.innerText = 'Players';
        thead.appendChild(theadPlayers);

        const theadCreator = document.createElement('th');
        theadCreator.id = 'room-thead-creator';
        theadCreator.innerText = 'Created By';
        thead.appendChild(theadCreator);

        const theadDate = document.createElement('th');
        theadDate.id = 'room-thead-date_created';
        theadDate.innerText = 'Date Created';
        thead.appendChild(theadDate);

        const theadInProgress = document.createElement('th');
        theadInProgress.id = 'room-thead-in_progress';
        theadInProgress.innerText = 'Game Running?';
        thead.appendChild(theadInProgress);
        // -- End Lobby thead --

        // tbody - to be filled in via addRooms
        const tbody = document.createElement('tbody');
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
            document.querySelector('#room-td-players-' + response.row).innerText = response.new_value;
        }

        // Update in_progress
        if (response.col === 'in_progress') {
            
            document.querySelector('#room-td-in_progress-' + response.row).innerText = response.new_value;
        }
        
    }
}

function createNewRoomModal() {
    // Lookup to dynamically set max capacity (min capacity is 2 for all)
    const capacityLookup = {'thirty_one': 7, 'cribbage': 3, 'natac': 4};

    // Modal for setting up a new room
    const newRoomModal = document.createElement('div');
    newRoomModal.className = 'modal create-room';
    newRoomModal.id = 'create-room-modal';

    // Close modal when escape key is pressed
    // Bug -- This only worked when close button or input field was selected
    // newRoomModal.addEventListener('keydown', (event) => {
    //     console.log(`key ${event.code} pressed`)
    //     if (event.code === 'Escape') {
    //         console.log('escape being pressed?')
    //         closeModal(newRoomModal);
    //     }
    // })

    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header create-room';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title create-room';
    modalTitle.innerText = 'Create a New Room';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close-button create-room';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        closeModal(newRoomModal);
    }
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body create-room';

    // Set up under `form` even though the handler will be a socket.io event instead of a regular GET or POST
    const form = document.createElement('form');

    // Choose game
    const gameFieldset = document.createElement('fieldset');
    gameFieldset.id = 'create-room-game-fieldset';

    const gameLegend = document.createElement('legend');
    gameLegend.id = 'create-room-game-legend';
    gameLegend.innerText = 'Choose a Game:';

    gameFieldset.appendChild(gameLegend);

    const gameChoicesContainer = document.createElement('div');
    gameChoicesContainer.className = 'btn-group'
    
    const thirtyOneInput = document.createElement('input');
    thirtyOneInput.type = 'radio';
    thirtyOneInput.id = 'create-room-thirty_one';
    thirtyOneInput.name = 'game';
    thirtyOneInput.value = 'thirty_one';
    thirtyOneInput.autocomplete = 'off';
    thirtyOneInput.required = true;
    
    const thirtyOneLabel = document.createElement('label');
    thirtyOneLabel.className = 'btn btn-secondary';
    thirtyOneLabel.htmlFor = 'create-room-thirty_one';
    thirtyOneLabel.innerText = 'Thirty One';
    
    const cribbageInput = document.createElement('input');
    cribbageInput.type = 'radio';
    cribbageInput.id = 'create-room-cribbage';
    cribbageInput.name = 'game';
    cribbageInput.value = 'cribbage';
    cribbageInput.autocomplete = 'off';
    cribbageInput.required = true;
    
    const cribbageLabel = document.createElement('label');
    cribbageLabel.className = 'btn btn-secondary';
    cribbageLabel.htmlFor = 'create-room-cribbage';
    cribbageLabel.innerText = 'Cribbage';
    
    const natacInput = document.createElement('input');
    natacInput.type = 'radio';
    natacInput.id = 'create-room-natac';
    natacInput.name = 'game';
    natacInput.value = 'natac';
    natacInput.autocomplete = 'off';
    natacInput.required = true;
    
    const natacLabel = document.createElement('label');
    natacLabel.className = 'btn btn-secondary';
    natacLabel.htmlFor = 'create-room-natac';
    natacLabel.innerText = 'Natac';

    gameChoicesContainer.appendChild(thirtyOneInput);
    gameChoicesContainer.appendChild(thirtyOneLabel);
    gameChoicesContainer.appendChild(cribbageInput);
    gameChoicesContainer.appendChild(cribbageLabel);
    gameChoicesContainer.appendChild(natacInput);
    gameChoicesContainer.appendChild(natacLabel);

    gameFieldset.appendChild(gameLegend);
    gameFieldset.appendChild(gameChoicesContainer);
    
    let btnArray = [thirtyOneLabel, cribbageLabel, natacLabel]
    
    // Add event listener for label buttons to be active (selected) on click
    btnArray.forEach(btn => {
        btn.addEventListener('click', () => {
            
            // Set clicked button to active and DE-activate all others
            btn.classList.add('active');
            
            // Loop through array again to find all others
            btnArray.forEach(btnCompare => {
                if (btn.innerText !== btnCompare.innerText){
                    btnCompare.classList.remove('active');
                }
            })
        })
    })

    const roomFieldset = document.createElement('fieldset');
    roomFieldset.id = 'create-room-details-fieldset';
    
    const roomLegend = document.createElement('legend');
    roomLegend.id = 'create-room-details-legend';
    roomLegend.innerText = 'Room Name and Password';

    // Room name
    const roomContainer = document.createElement('div');
    roomContainer.id = 'create-room-name-container';
    
    const roomLabel = document.createElement('label');
    roomLabel.htmlFor = 'create-room-name'
    roomLabel.innerText = 'Room Name:';
    
    const roomHelpText = 'Room name must be 4-18 characters long and only contain letters, numbers, or underscores.';

    const roomInput = document.createElement('input');
    roomInput.className = 'form-control';
    roomInput.id = 'create-room-name';
    roomInput.type = 'text';
    // Use same pattern as username - includes min and max length
    roomInput.title = roomHelpText;
    roomInput.pattern = roomNameValidation;
    roomInput.autocomplete = 'off';
    roomInput.required = true;

    // const roomSmall = document.createElement('small');
    // roomSmall.className = 'form-small';
    // roomSmall.innerText = roomHelpText;
    
    roomContainer.appendChild(roomLabel);
    roomContainer.appendChild(roomInput);
    // roomContainer.appendChild(roomSmall);
    
    // Password (optional)
    const pwContainer = document.createElement('div');
    pwContainer.id = 'create-room-password-container';
    
    const pwHelpText = 'Password must either be blank or 4-18 characters.';

    const pwLabel = document.createElement('label');
    pwLabel.htmlFor = 'create-room-password';
    pwLabel.innerText = 'Password for Room (optional):';
    
    const pwInput = document.createElement('input');
    pwInput.className = 'form-control';
    pwInput.id = 'create-room-password';
    pwInput.type = 'password';
    // No char restrictions; len is 0 OR 4-18
    pwInput.title = pwHelpText;
    pwInput.pattern = roompwValidation;
    pwInput.autocomplete = 'off';

    // const pwSmall = document.createElement('small');
    // pwSmall.className = 'form-small';
    // pwSmall.innerText = roomHelpText;
    
    pwContainer.appendChild(pwLabel);
    pwContainer.appendChild(pwInput);
    // pwContainer.appendChild(pwSmall);
    
    roomFieldset.appendChild(roomLegend);
    roomFieldset.appendChild(roomContainer);
    roomFieldset.appendChild(pwContainer);

    // const capacityContainer = document.createElement('div');
    // capacityContainer.id = 'create-room-capacity-container';

    // const capacityLabel = document.createElement('label');
    // capacityLabel.for = 'create-room-capacity';
    // capacityLabel.innerHTML = 'Room Capacity: 2 to ';
    
    // const capacityInput = document.createElement('input');
    // capacityInput.id = 'create-room-capacity';
    // capacityInput.type = 'number';
    // capacityInput.step = '1';
    // capacityInput.min = '2';
    // // Eventually max will be determined by which game is chosen
    // capacityInput.max = '4';

    // const capacitySpan = document.createElement('span');
    // capacitySpan.innerText = 'players.'

    // capacityContainer.appendChild(capacityLabel);
    // capacityContainer.appendChild(capacityInput);
    
    const submitContainer = document.createElement('div');
    submitContainer.id = 'create-room-submit-container';
    
    const submitButton = document.createElement('button');
    submitButton.id = 'create-room-submit';
    submitButton.innerText = 'Create Room';

    // Button onclick behavior
    submitButton.onclick = () => {
        // `form` here is the create room form
        console.log(`Name: ${roomInput.value}\nGame: ${form.elements["game"].value}`);
        
        // Prevent sending blank messages
        if (roomInput.value.length === 0 || form.elements["game"].value === undefined) {
            console.log('Missing a value; cannot submit.')
            return;
        }

        // Using emitWithAck - Wait for server to accept request. Returns promise
        const promise = socket.emitWithAck('create_room', {'new_room_name': roomInput.value, 'game': form.elements["game"].value, 'password': pwInput.value, 'username': username, 'room': currentRoom});
                    
        promise
            .then((data) => {
                // Message received / returned, but server failed validation
                if (!data.accepted) {
                    
                    // Server may send message to client to fix something specific
                    if (data.client_msg) {
                        const serverResponse = document.createElement('div');
                        serverResponse.className = 'form-server-response';
                        serverResponse.innerText = data.client_msg;

                        // Add to room container so client will see it next to room name input
                        roomContainer.appendChild(serverResponse);
                    }
                    
                    // Log in console and exit early
                    console.log(`Error: ${data.msg}`)
                    return;
                }
                
                // Close modal on success
                console.log('Room created successfully.');
                closeModal(newRoomModal);                
            })
            .catch((error) => {
                console.error(`Could not create room: ${error}`);
            });
    };
    
    // Set `enter` to submit the form
    form.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            submitButton.click();
        };
    });
    
    submitContainer.appendChild(submitButton);
    
    form.appendChild(gameFieldset);
    form.appendChild(roomFieldset);
    // Removing capacity from the options for the time being
    // Capacity will be defaulted to the max players a game can handle
    // form.appendChild(capacityContainer);
    form.appendChild(submitContainer);

    modalBody.appendChild(form);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    newRoomModal.appendChild(modalHeader);
    newRoomModal.appendChild(modalBody);

    return newRoomModal;
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

        if (username.length === 0) {
            console.log('Username not set, cannot continue to set up room')
            return
        }
        
        // Set up game room

        // Update header
        document.querySelector('#sub-header-center-h2').innerText = response.room;

        // Remove anything from left and right sub-headers
        document.querySelector('#sub-header-left').replaceChildren()
        document.querySelector('#sub-header-right').replaceChildren()
        
        // The outermost level before outer-container
        // Contains everything - return to lobby button, chat box, players, board
        // Game, player, chat panels are removed on leave - Create board from scratch on EVERY join
        const gameRoomContainer = document.createElement('div');
        gameRoomContainer.id = 'game-room-container'
        document.querySelector('#outer-container').appendChild(gameRoomContainer);
        
        // Create `to lobby` button - could be above / outside of game container
        const toLobby = createLobbyButton();

        // Add return to lobby button to header; must remove on leave
        document.querySelector('#sub-header-left').appendChild(toLobby);

        /* Start game container - contains board, players, controls */
        const gameContainer = document.createElement('div');
        gameContainer.id = 'game-container';
        gameRoomContainer.appendChild(gameContainer);
        
        // Create board
        const board = createBoard();
        gameContainer.appendChild(board);
        
        // Create player panel 
        const playerPanel = createPlayerPanel();
        gameContainer.appendChild(playerPanel);
        
        // Add move buttons after player panel so it appears at the bottom
        const moveButtonsContainer = createMoveButtons()
        gameContainer.appendChild(moveButtonsContainer);
        /* End game container */
        
        // Create new chat panel if doesn't exist
        if (document.querySelector('#chat-log-panel') === null) {
            const chatLogPanel = createChatLogPanel(username);
            gameRoomContainer.appendChild(chatLogPanel);
        }

        // Remove and then append to end of game-room-container
        const chatLogPanel = gameRoomContainer.removeChild(document.querySelector('#chat-log-panel'));  

        gameRoomContainer.appendChild(chatLogPanel);
    }
    

    // Called on leave. Removes panels so they can be re-added with new data.
    else if (response.action === 'teardown_room') {

        // Teardown game room - Remove game panel if it exists
        if (document.querySelector('#game-room-container') !== null) {
            document.querySelector('#game-room-container').remove();
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
                document.querySelector('#' + player + '-container').dataset.connected = '1';
                players[player].connected = true;
            }
            else {
                document.querySelector('#' + player + '-container').dataset.connected = '0';
                players[player].connected = false;
            }

        }
    }
}

function populateHand(playerName, hand, hand_score) {

    // Update `players` array
    players[playerName].hand = hand;
    players[playerName].handScore = hand_score;
    
    const playerHandContainer = document.querySelector('#' + playerName + '-hand-container');
    
    if (playerHandContainer.hasChildNodes()) {
        // Empty old hand to get ready for new hand - replaceChildren with no args
        playerHandContainer.replaceChildren();
    }

    // Create buttons for hand with array from server
    for (const card of hand) {
        // TODO: Create hands for all non-self players' - should not be clickable
        const cardButton = createHandButton(card)
        
        // Disable card button if non-self player
        if (username !== playerName) {
            cardButton.disabled = true;
        }

        playerHandContainer.appendChild(cardButton);
    }
    
    // Update hand score
    document.querySelector('#' + playerName + '-hand-score').innerText = ' Hand Score: ' + hand_score + ' ';
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
    // "final_hands": final_hands,  # list of everyone's hands to reveal on round end
    // "final_scores": final_scores,  # list of everyone's hand scores to reveal on round end

    // # Specific to player
    // "recipient": player_name,
    // "hand": self.players[player_name].zip_hand(),  # hand for self only
    // "hand_score": self.calc_hand_score(self.players[player_name]),  # hand score for self

    // Add markers for dealer and knocked
    
    if (response.action === 'update_board') {
        console.log(`Updating board: with ${response}`)

        // Unpack general state
        inProgress = response.in_progress;
        mode = response.mode;
        currentPlayer = response.current_player;
        discardCard = response.discard;

        // Fill log
        for (const msg of response.log) {
            addToLog(msg, "system");
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
            
            // TODO figure out how to delay display of winner by ~2 seconds to make reveal more 
            // realistic to a real game. Maybe use roundEnd flag that gets reset every round start?
            // Or can go by specific log messages but that seems more fragile
        }
        
        // Disable continue button on every other mode
        else {
            document.querySelector('#continue-button').disabled = true;
        }

        // Add discard card to display on discard button
        setCardDisplay(discardCard, document.querySelector('#discard-button'));
        
        // Unpack players
        // Eventually want to rearrange players to be correct player order
        playerOrder = response.player_order;
        
        // Loop player order to fill containers
        for (let i = 0; i < playerOrder.length; i++) {
            
            // playerOrder[i] is the player name
            players[playerOrder[i]] = {'name': playerOrder[i], 'order': i, 'lives': response.lives[i], 'handSize': response.hand_sizes[i], 'connected': true};

            // Once player array is populated, add to player panel display or dataset
            const playerContainer = document.querySelector('#' + playerOrder[i] + '-container');

            // Update order
            playerContainer.dataset.order = i;
            
            // Update lives
            document.querySelector('#' + playerOrder[i] + '-lives').innerText = 'Lives: ';
            playerContainer.dataset.lives = response.lives[i];
            
            // Add stars according to number of lives left
            if (response.lives[i] > 0) {
                const lifeStarsContainer = document.createElement('span');
                lifeStarsContainer.className = 'life-stars-container';

                for (let life = 0; life < response.lives[i]; life++) {
                    lifeStarsContainer.innerText += '\u2605 ';
                } 
                document.querySelector('#' + playerOrder[i] + '-lives').appendChild(lifeStarsContainer);
            }
            // If 0 lives, add 'on the bike'
            else {
                
                // Remove any stars remaining
                document.querySelector('#' + playerOrder[i] + '-lives').replaceChildren()
                
                // Add text
                document.querySelector('#' + playerOrder[i] + '-lives').innerText += 'on the bike';
            }
            
            // Create front-facing hand for self, clickable
            if (username === playerOrder[i]) {
                populateHand(playerOrder[i], response.hand, response.hand_score)  
            }

            // Create front-facing hand for others on game end, not clickable
            // Using `else if` here implies playerOrder[i] is not the self player
            else if (mode === 'end_round' || mode === 'end_game') {
                populateHand(playerOrder[i], response.final_hands[i], response.final_scores[i])
            }

            // Create back-facing hand for others
            else {
                // Remove all cards if there were any
                document.querySelector('#' + playerOrder[i] + '-hand-container').replaceChildren()

                // Loop hand size to add divs that display backs of cards
                for (let j = 0; j < response.hand_sizes[i]; j++) {
                    // Not sure if these should be buttons or divs:
                        // buttons make consitent styling
                        // div helps diffentiate them from the actual card buttons
                    const dummyCard = document.createElement('div');
                    dummyCard.className = 'playing-card card-back';

                    document.querySelector('#' + playerOrder[i] + '-hand-container').appendChild(dummyCard);
                }
                // Remove hand score
                document.querySelector('#' + playerOrder[i] + '-hand-score').innerText = '';
            }
            
            // Set attribute - I believe it must be a string, so '1' = true and '0' = false
            if (currentPlayer === playerOrder[i]) {
                
                playerContainer.dataset.current = '1';
            }
            else {
                playerContainer.dataset.current = '0';
            }

            // Set connected status to True when creating player
            playerContainer.dataset.connected = '1';
        }
    }
}

// Modal functions

function openModal(modal) {
    if (modal == null) return;
    modal.classList.add('active');
    modalOverlay.classList.add('active');
}

function closeModal(modal) {
    if (modal == null) return;
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');
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
        // Using await and emitWithAck - has a callback and is blocking
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
    console.log(`Client received 'update_lobby' event: ${JSON.stringify(data)}.`);
    
    updateLobby(data);
});

// Updating room state
socket.on('update_gameroom', data => {
    // For debug:
    console.log(`Client received 'update_gameroom' event: ${JSON.stringify(data)}.`);
    
    updateGameRoom(data);
});

// Updating game state
socket.on('update_board', data => {
    // For debug:
    console.log(`Client received 'update_board' event: ${JSON.stringify(data)}.`);
    
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

socket.on('disconnect', (reason) => {
    console.log(`\nClient disconnect event for reason: ${reason}.\n`);
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
