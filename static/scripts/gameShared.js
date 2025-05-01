// Global vars

// For animating card movement and flipping over
const EASING_FUNCTION = 'cubic-bezier(0.25, 1, 0.5, 1)';
const ANIMATION_TIMING = { duration: 1000, iterations: 1 };
const ANIMATION_DURATION = 1;

// Game state
let inProgress = false;
var mode;
var game;
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

// Create `Rules` button to pull up the rules modal
function createRulesButton() {
    const rules = document.createElement('button');
    rules.className = 'room-nav room-header btn btn-secondary';
    rules.id = 'rules-button';
    rules.innerText = 'Rules';
    rules.onclick = () => {

        // Open rules modal
        openModal(document.querySelector('#rules-modal'));
    }

    return rules;
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
function createGameContainer() {
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-grid-container';

    // Use different number of grids for each game?
    // Create 3x3 grid for game container to add board and players to
    // Grid IDs are 1-indexed for easier visualization
    // Board will go in div 5 (2, 2), self in div 8 (2, 3), other spots filled as players are added
    for (let col = 1; col < 4; col++) {
        for (let row = 1; row < 4; row++) {
            
            const gridItem = document.createElement('div');
            gridItem.className = 'game-grid';
            
            // Convert row and col to ID number, starting at 1 left->right and ending at 9
            gridItem.id = 'game-grid-' + (row + ((col - 1) * 3));
            
            // Set row and column values
            gridItem.style.gridArea = `${col} / ${row}`;

            gameContainer.appendChild(gridItem);
        }
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

            // Remove player container from DOM
            document.querySelector(containerID).remove();

            console.log(`Found ${document.querySelector(containerID)} with id ${containerID}, removing ${playersConnected[i]} from room.`);
            
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
        
        // Save game name (thirty_one, cribbage, natac) in `game` var
        game = response.game;

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
        // document.querySelector('#sub-header-right').appendChild(createConnectedPlayers());
        document.querySelector('#sub-header-right').appendChild(createRulesButton());

        // Update rules modal according to game
        document.querySelector('#rules-modal-title').innerText = `Rules of ${GAME_DISPLAY_NAMES[response.game]}`;
        document.querySelector('#rules-modal-body').innerText = `${RULES[response.game]}`;

        /* Game container - contains board, players, controls */
        gameRoomContainer.appendChild(createGameContainer());

        // Fill in game container depending on game
        if (response.game === 'thirty_one') {
            
            // Create board and add to center of grid
            document.querySelector('#game-grid-5').appendChild(createBoardThirtyOne());
            
            // Add move buttons to center of grid
            document.querySelector('#game-grid-5').appendChild(createMoveButtonsThirtyOne());
        }
        
        else if (response.game === 'cribbage') {
            // Put deck and crib in grid-4
            document.querySelector('#game-grid-4').appendChild(createBoardCribbage());
            
            // Add move buttons to grid-4? or player's grid
            document.querySelector('#game-grid-4').appendChild(createMoveButtonsCribbage());
        }

        
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

// Moved this from thirtyOne.js to gameShared.js since it can be reused in cribbage

// Animation of deck to player 
    // If self, use card object && end face-up
    // If other, use placeholder && end face-down
function animateDraw(cardStr, player, handScore=0) {

    let card;
    let cardContainer;

    // Unknown card for non-self player
    if (cardStr === 'unknown') {
        card = createPlaceholderCard('unknown');
        
        // Create dummy card container
        cardContainer = document.createElement('div');
        cardContainer.className = 'card-container dummy-container';
    }

    // Known card for self player
    else {
        card = createCardObject(cardStr);
        // Set card to face-up orientation
        card.style.transform += `rotateY(180deg)`

        // Create new card container
        cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        // Card.id = 'card-AS'
        cardContainer.id = card.id + '-container'
    }
    
    // Add card to card container
    cardContainer.appendChild(card);

    // Start hidden and become visible at end of animation
    card.style.visibility = 'hidden';
    
    // Add card container to hand container of current player
    document.querySelector('#' + player + '-hand-container').appendChild(cardContainer);

    // Add handler as click listener event
    if (game === 'thirty_one') {
        card.addEventListener('click', handHandlerThirtyOne);
    }
    else if (game === 'cribbage') {
        card.addEventListener('click', handHandlerCribbage);
    }

    // Get end positions by comparing deck and new card container

    // Card will start at deck and move to hand
    // Starting position
    const deckRect = document.querySelector('#deck-container').getBoundingClientRect();

    const cardRect = card.getBoundingClientRect()

    // Calc movement distances - compare left and top
    const deltaX = cardRect.left - deckRect.left
    const deltaY = cardRect.top - deckRect.top

    // Create a clone to animate
    // this prevents having to actually move the original card
    // arg `true` means copy is a deep copy, i.e. it includes all node's descendants as well
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    // Change id of clone and any child nodes that have ids so no duplicate ids
    // There won't be an id for a dummy card
    if (clone.id) {
        clone.id = 'clone-' + card.id;
    }

    // Card starts face-up by default; flip over to start face-down
    clone.style.transform = `rotateY(180deg)`;
    clone.style.visibility = 'visible';

    // Add clone to DOM
    document.body.appendChild(clone);
    
    // Start clone at deck location
    clone.style.left = `${deckRect.left}px`;
    clone.style.top = `${deckRect.top}px`;
    clone.style.width = `${deckRect.width}px`;
    clone.style.height = `${deckRect.height}px`;
    clone.style.position = 'fixed';

    // Clone animation

    // Set animation object so `finish` event listener can be added
    let animObject;

    // Flip if for self
    if (player === username) {
        animObject = clone.animate(moveCard(deltaX, deltaY, 'down', 'up'), ANIMATION_TIMING);
    }
    // Keep face-down for other
    else {
        animObject = clone.animate(moveCard(deltaX, deltaY, 'down', 'down'), ANIMATION_TIMING);
    }

    // Add event listener to animObject to trigger on animation end
    animObject.addEventListener('finish', () => {
        // Reveal real card
        card.style.visibility = 'visible';
    
        // Remove clone card
        clone.remove();

        // Update hand score if given (only for 31)
        if (game === 'thirty_one') {
            if (player === username && handScore > 0) {
                document.querySelector('#' + player + '-hand-score').innerText = ' Hand Score: ' + handScore + ' ';
            };
        }
    });
}

// Rules for each game
const RULES = {
    'thirty_one': 
    'Each turn, a player must either draw a card from the deck or pick up a card from the discard pile. The player must then discard a card to the discard pile, thereby maintaining 3 cards in their hand at all times. The goal of the game is to not be caught with the lowest score. Your score is the highest combination of cards in your hand that are of the same suit. Face cards are all worth 10 points and aces are worth 11 points. The highest possible score is 31. If a player achieves this score, they "blitz" and the round ends immediately. All other players lose an extra life. If you think you have more points than at least one other player, you can "knock". When a player knocks, all other players get one more draw, and then everyone reveals their cards. The player with the lowest score loses an extra life. If the player who knocked has the lowest score, they lose 2 extra lives. A player is knocked out of the game when they lose a life after losing all of their extra lives. The last remaining player wins the game.',
    
    'cribbage':
    'cribbage rules to come',
}
