// Global vars

// For animating card movement and flipping over
const EASING_FUNCTION = 'cubic-bezier(0.25, 1, 0.5, 1)';
const ANIMATION_DURATION = 1;
// Do not change names of ANIMATION_TIMING parameters - can break animation
// Also using a variable in duration broke animation in Firefox, but not Chrome 
const ANIMATION_TIMING = { duration: 1000, iterations: 1 };

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
        playerLi.className = 'connected-players-li';
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


function addPlayers(players) {

    // Save player list
    for (let i = 0; i < players.length; i++) {

        // Check if player already in list
        if (!(playersConnected.includes(players[i]))) {
            playersConnected.push(players[i]);
        }

        // Container exists; set `connected` to True
        if (document.querySelector('#player-container-' + players[i]) !== null) {
            document.querySelector('#player-container-' + players[i]).dataset.connected = '1';
        }
    }   
}

// Opposite of addPlayers
function removePlayers(players) {
        
    // Remove anyone on local list who isn't on server list
    for (let i = 0; i < playersConnected.length; i++) {
        
        // Check if player already in list
        if ((players.includes(playersConnected[i]))) {
            
            console.log(`Removing ${playersConnected[i]} from room.`);
            
            // Remove player from local list
            playersConnected.splice(i, 1);
        }
    }
}

// Update rules modal depending on game
function updateRuleModal(game) {
    // Update modal title
    document.querySelector('#rules-modal-title').innerText = `Rules of ${GAME_DISPLAY_NAMES[game]}`;
    
    // Rules is one big string containing newlines at breaks. Split string by newline for display
    const rulesSplit = RULES[game].split('\n');
    
    for (let i = 0; i < rulesSplit.length; i++) {
        let p = document.createElement('p');
        p.className = 'rules-modal-p';
        p.innerText = rulesSplit[i];
        
        // Update modal body
        document.querySelector('#rules-modal-body').appendChild(p);
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
        document.querySelector('#sub-header-right').appendChild(createRulesButton());

        // Update rules modal according to game
        updateRuleModal(response.game);

        /* Game container - contains board, players, controls */
        gameRoomContainer.appendChild(createGameContainer());

        // So that multiple lists are not needed to keep track, can update Connected Players panel
        // Whenever playersConnected changes
        // document.querySelector('#game-grid-2').appendChild(createConnectedPlayers());

        // Fill in game container depending on game
        switch (response.game) {
            case 'thirty_one':
                // Create board and add to center of grid
                document.querySelector('#game-grid-5').appendChild(createBoardThirtyOne());
                // Add move buttons to center of grid
                document.querySelector('#game-grid-5').appendChild(createMoveButtonsThirtyOne());
                break;

            case 'cribbage':
                document.querySelector('#game-grid-5').appendChild(createBoardCribbage());
                document.querySelector('#game-grid-5').appendChild(createContinueButtonsCribbage());
                break;
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
            if (document.querySelector('#player-container-' + player) ===  null) {
                continue;
            }

            console.log(`Update conn status for ${player}: ${response.connected}`);

            // Set `connected` attribute; 1 for true and 0 for false
            if (response.connected) {
                document.querySelector('#player-container-' + player).dataset.connected = '1';
            }
            else {
                document.querySelector('#player-container-' + player).dataset.connected = '0';
            }

        }
    }
}


// Create player for any game; customize function called below
function createPlayerContainer(name, order, gridNumber) {
    
    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-container';
    
    // Give container id of 'playerName-container'
    playerContainer.id = 'player-container-' + name;

    // Set order and grid number in dataset
    playerContainer.dataset.order = order;
    playerContainer.dataset.gridNumber = gridNumber;
    
    // Put hand in div
    const hand = document.createElement('div');
    hand.className = 'hand-container';
    hand.id = 'hand-container-' + name;
    
    const playerNameContainer = document.createElement('div');
    playerNameContainer.className = 'name-container';
    playerNameContainer.id = 'name-container-' + name;
    
    const currentPlayerStrong = document.createElement('strong');
    currentPlayerStrong.id = 'current-strong-' + name;
    playerNameContainer.appendChild(currentPlayerStrong);
    
    const playerNameStrong = document.createElement('strong');
    playerNameStrong.id = 'name-strong-' + name;
    playerNameStrong.innerText = name;
    playerNameContainer.appendChild(playerNameStrong);
    
    // If on top row of grid (or middle for now), put name above hand
    if ([1, 2, 3, 4, 6].includes(gridNumber)) {
        playerContainer.appendChild(playerNameContainer);
        playerContainer.appendChild(hand);
    }

    // If on bottom row, put name below hand
    else if ([7, 8, 9].includes(gridNumber)) {
        playerContainer.appendChild(hand);
        playerContainer.appendChild(playerNameContainer);
    }

    // Add custom fields depending on game and return the container
    switch (game) {
        case 'thirty_one':
            return addlPlayerContainerThirtyOne(name, playerContainer);
        case 'cribbage':
            return addlPlayerContainerCribbage(name, playerContainer);
    }
}


// Determine where player containers should go in game grid
// Fills WHOLE GRID, not specific spots
function fillPlayerGrid(playerOrder, gameName) {
    // Grids that should be filled according to number of players, starting with self (8)
    // 8 is bottom center; cardinal directions are filled first, then ordinal
    const gridsToFill = [8, 2, 4, 6, 1, 3, 7, 9].slice(0, playerOrder.length);

    // Order to fill in the grids if they are present so that players are always in clockwise order
    const priorityOrder = [8, 7, 4, 1, 2, 3, 6, 9];

    // Get index for self in player order
    const selfIndex = playerOrder.indexOf(username);

    // Ex: playerOrder = [P1, me, P3]
    // Need to fill in 8: me, 2: P3, 6: P1

    let newOrder = [];

    // Iterate through player order starting at self index
    for (let i = selfIndex; i < playerOrder.length + selfIndex; i++) {
        // Since i will overflow length, use modulo for accessing array
        let modIndex = i % playerOrder.length;

        // console.log(
        //   `i = ${i}; self index = ${selfIndex} modIndex = ${modIndex}; Player ${playerOrder[modIndex]}`
        // );

        newOrder.push(playerOrder[modIndex]);
    }
    console.log(gridsToFill);

    // Fill in grid numbers according to 'gridsToFill', in order of 'priorityOrder'
    for (let j = 0; j < priorityOrder.length; j++) {
        
        let gridContainer = document.querySelector('#game-grid-' + priorityOrder[j]);

        // Empty grid ONLY IF IT CONTAINS PLAYER to make room for new player
        if (gridContainer.querySelector('.player-container') !== null) {
            document.querySelector('#game-grid-' + priorityOrder[j]).replaceChildren();
        }

        // Iterate through 'priorityOrder' and check if number is in 'gridsToFill'
        if (gridsToFill.includes(priorityOrder[j])) {
    
            console.log(`Priority Order = ${priorityOrder[j]}`);
    
            // Get player index from the index that priorityOrder[j] appears in gridsToFill
            let playerIndex = gridsToFill.indexOf(priorityOrder[j]);
            console.log(
                `Player ${newOrder[playerIndex]} should go in grid ${priorityOrder[j]}`
            );

            // Create player container based on game
            let playerContainer;

            playerContainer = createPlayerContainer(
                newOrder[playerIndex], playerOrder.indexOf(newOrder[playerIndex]), priorityOrder[j]
            );

            // Add player container to grid
            gridContainer.appendChild(playerContainer);
        }
    }
    // Elements should now be in order with self at the bottom and other players filled in around the board
}


// Populating hand with no animation; called in updateHandNoAnimation()
function populateHandStatic(playerName, hand, hand_score=0) {
    
    const playerHandContainer = document.querySelector('#hand-container-' + playerName);
    
    if (playerHandContainer.hasChildNodes()) {
        // Empty old hand to get ready for new hand - replaceChildren with no args
        playerHandContainer.replaceChildren();
    }

    // Create buttons for hand with array from server
    for (const card of hand) {
        const cardObject = createCardObject(card);

        // Send server request on click; custom handlers per game
        // Game is global var
        switch (game) {
            case 'thirty_one':
                cardObject.addEventListener('click', handHandlerThirtyOne);
                break;
            case 'cribbage':
                cardObject.addEventListener('click', handHandlerCribbage);
                break;
        }

        // Create a card container - div that encloses a playing card
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        // Configure id this way so container can be selected with the card id
        cardContainer.id = 'card-' + card + '-container';
        
        // Add card object to card container
        cardContainer.appendChild(cardObject);

        // Add card container to hand container
        playerHandContainer.appendChild(cardContainer);
    }
    
    // Update hand score - ONLY FOR 31
    if (game === 'thirty_one') {
        document.querySelector('#hand-score-' + playerName).innerText = ' Hand Score: ' + hand_score + ' ';
    }
}

// Calls populateHandStatic() for front-facing cards; populates placeholders for back-facing cards
function updateHandNoAnimation(playerName, playerIndex, response) {
    // Create front-facing hand for self, clickable
    if (username === playerName) {
        populateHandStatic(playerName, response.hand, response.hand_score);
    }

    // Create front-facing hand for others on game end, not clickable
    // Using `else if` here implies playerName is not the self player
    else if (response.mode === 'end_round' || response.mode === 'end_game') {
        populateHandStatic(playerName, response.final_hands[playerIndex], response.final_scores[playerIndex]);
    }

    // Create back-facing hand for others if not end of round / game
    else {
        // Remove all cards if there were any
        document.querySelector('#hand-container-' + playerName).replaceChildren()

        // Loop hand size to add placeholders that display backs of cards
        for (let i = 0; i < response.hand_sizes[playerIndex]; i++) {

            const dummyCard = createPlaceholderCard('unknown');
            
            // Add dummy card to container
            const dummyContainer = document.createElement('div');
            dummyContainer.className = 'card-container dummy-container';

            dummyContainer.appendChild(dummyCard);

            document.querySelector('#hand-container-' + playerName).appendChild(dummyContainer);
        }
        
        // Remove hand score - ONLY FOR 31
        if (game === 'thirty_one') {
            document.querySelector('#hand-score-' + playerName).innerText = '';
        }
    }
}


// Animations/ general game functions

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
    document.querySelector('#hand-container-' + player).appendChild(cardContainer);

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

        // Send server request on click; custom handlers per game
        // Game is global var
        switch (game) {
            case 'thirty_one':
                card.addEventListener('click', handHandlerThirtyOne);
                // Update hand score if given (only for 31)
                if (player === username && handScore > 0) {
                    document.querySelector('#hand-score-' + player)
                        .innerText = ' Hand Score: ' + handScore + ' ';
                };
                break;
            case 'cribbage':
                card.addEventListener('click', handHandlerCribbage);
                break;
        }
    });
}

// Rules for each game
const RULES = {
    'thirty_one':
    "Each turn, a player must either draw a card from the deck or pick up a card from the discard pile. \
    The player must then discard a card to the discard pile, so that they always have 3 cards in their \
    hand at the end of their turn.\
    \n\
    A player's hand score is the highest combination of cards in their hand that are of the same suit. \
    Face cards are all worth 10 points and aces are worth 11 points. The highest possible score is 31. \
    If a player achieves this score, they 'blitz' and the round ends immediately, and all other players \
    lose an extra life.\
    \n\
    A player can also 'knock' on their turn instead of picking up a card, triggering the end of a round. \
    The player who knocks does not draw or discard a card the turn that they knock. All other players get \
    one more turn, and then everyone reveals their cards. The player with the lowest score loses an extra \
    life (represented by the stars below the player's name). If the player who knocked has the lowest score, \
    they lose 2 extra lives.\
    \n\
    Each player starts with three extra lives, and a player is kicked out of the game after losing all extra \
    lives, plus one additional life. The last remaining player wins the game.",
    
    'cribbage':
    'cribbage rules to come',
}
