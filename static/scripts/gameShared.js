// Global vars

// For animating card movement and flipping over
const EASING_FUNCTION = 'cubic-bezier(0.25, 1, 0.5, 1)';
const ANIMATION_TIMING = { duration: 1000, iterations: 1 };
const ANIMATION_DURATION = 1;

// Game state
let inProgress = false;
var mode;
var currentPlayer;
var discardCard;
var playerOrder = [];
var chatLogCount = 0;  // Number of entries in chat log
let playersConnected = [];  // Keep track of player names connected

// Get a random integer - used for choosing a random object from non-self player
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

// Create `Return to lobby` button
function createLobbyButton() {
    const toLobby = document.createElement('button');
    toLobby.className = 'room-nav room-header btn btn-secondary';
    toLobby.id = 'return-lobby-button';
    toLobby.innerText = 'Return to Lobby';
    toLobby.onclick = () => {
        // Leave current room and join lobby
        leaveAndJoin(username, 'lobby');
    }
    return toLobby;
}

// Visual of players currently connected
// Eventually will be used as a way to show players connected before creating player containers
// Players will be assigned spots around the board when a new game is started instead of immediately when they join
function createConnectedPlayers() {
    const connectedPlayers = document.createElement('ul');
    connectedPlayers.className = 'room-header';
    connectedPlayers.id = 'connected-players-div';
    for (const player of playersConnected) {
        const playerLi = document.createElement('li');
        playerLi.
        playerLi.id = 'connected-players-' + player;
        playerLi.innerText = player;
        connectedPlayers.appendChild(playerLi);
    }

    return connectedPlayers;
}

// Create grid for game; 3x3 with board in middle.
function createGameContainer(game) {
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-grid-container';

    // Use different number of grids for each game?
    // Create 3x3 grid for game container to add board and players to
    // Grid IDs are 1-indexed for easier visualization
    // Board will go in div 5 (2, 2), self in div 8 (2, 3), other spots filled as players are added
    if (game === 'thirty_one') {
        for (let col = 1; col < 4; col++) {
            for (let row = 1; row < 4; row++) {
                
                const gridItem = document.createElement('div');
                gridItem.className = 'game-grid';
    
                // Convert row and col to ID number, starting at 1 left->right and ending at 9
                gridItem.id = 'game-grid-' + (row + ((col - 1) * 3));
                
                // Set row and column values
                gridItem.style.gridArea = `${col} / ${row}`;

                if (gridItem.id === 'game-grid-5') {
                    // Create board and add to middle cell of grid
                    gridItem.appendChild(createBoard());
                    
                    // Add move buttons after player panel so it appears at the bottom
                    gridItem.appendChild(createMoveButtons());

                }
    
                gameContainer.appendChild(gridItem);
            }
        }
    }

    if (game === 'cribbage') {
        // Instead of numbered cells for grid, maybe use top, center, bottom,
        // and left (for optional third player)
    }

    return gameContainer;
}

function addPlayers(players, game) {

    // Save player list
    for (let i = 0; i < players.length; i++) {

        // Check if player already in list
        if (!(playersConnected.includes(players[i]))) {
            playersConnected.push(players[i]);
        }

        // Create new player container if one does not exist
        if (document.querySelector('#' + players[i] + '-container') === null) {
            
            // Check game and place players according to game
            if (game === 'thirty_one') {
                // Can check for first empty game container
                // Loop to check for empty grid spaces: check if grid has children or not
                for (let j = 1; j < 10; j++) {
                    
                    // If grid space does not have child nodes, append new player container
                    if (!document.querySelector('#game-grid-' + j).hasChildNodes()) {
                        document.querySelector('#game-grid-' + j).appendChild(createPlayerContainer(players[i]));
                        break;
                    }
                }
            }

            else if (game === 'cribbage') {
                // Add to bottom if self, top if 2nd, left if third
            }
        }

        // Container exists already; set `connected` to True
        else {
            document.querySelector('#' + players[i] + '-container').dataset.connected = '1';
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

            // Remove player from DOM - I believe this was incorrect; fixed below
            // remove(document.querySelector(containerID));
            document.querySelector(containerID).remove();

            
            console.log(`Found ${document.querySelector(containerID)} with id ${containerID}, removing ${playersConnected[i]} room.`);
            
            // Remove player from local list
            playersConnected.splice(i, 1);
        }
    }

}

// Mostly same across games; change will probably be with board
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
        username = response.username;

        if (username.length === 0) {
            console.log('Username not set, cannot continue to set up room')
            return
        }
        
        // Set up game room

        // Update page title
        document.querySelector('title').innerText = `The Space: ${GAME_DISPLAY_NAMES[response.game]}`;

        // Update header (title of room)
        document.querySelector('#sub-header-center-h2').innerText = `${response.room} - ${GAME_DISPLAY_NAMES[response.game]}`;

        // Remove anything from left and right sub-headers
        document.querySelector('#sub-header-left').replaceChildren()
        document.querySelector('#sub-header-right').replaceChildren()
        
        // The outermost level before outer-container
        // Contains everything - return to lobby button, chat box, players, board
        // Game, player, chat panels are removed on leave - Create board from scratch on EVERY join
        const gameRoomContainer = document.createElement('div');
        gameRoomContainer.id = 'game-room-container'
        document.querySelector('#outer-container').appendChild(gameRoomContainer);
        
        // Add return to lobby button to header; must remove on leave
        document.querySelector('#sub-header-left').appendChild(createLobbyButton());
        
        // Keep track of players connected
        // So that multiple lists are not needed to keep track, can update Connected Players panel
        // Whenever playersConnected changes
        document.querySelector('#sub-header-right').appendChild(createConnectedPlayers());

        /* Game container - contains board, players, controls */
        gameRoomContainer.appendChild(createGameContainer(response.game));
        
        /* End of game container */
        
        // Create new chat panel if doesn't exist
        if (document.querySelector('#chat-log-panel') === null) {
            gameRoomContainer.appendChild(createChatLogPanel(username));
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
        currentRoom = `teardown of ${currentRoom}`;
        
        // Reset game vars when leaving room
        inProgress = false;
        currentPlayer = '';
        discardCard = '';
        playerOrder = [];
        playersConnected = [];
        mode = '';
        
    }

    // Add players to player panel on join
    else if (response.action === 'add_players') {
        addPlayers(response.players, response.game);
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
            if (response.connected) {
                document.querySelector('#' + player + '-container').dataset.connected = '1';
            }
            else {
                document.querySelector('#' + player + '-container').dataset.connected = '0';
            }

        }
    }
}
