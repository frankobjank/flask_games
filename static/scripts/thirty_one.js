// Game state
let inProgress = false;
var mode;
var currentPlayer;
var discardCard;
var playerOrder = [];
var chatLogCount = 0;  // Number of entries in chat log
let playersConnected = [];  // Keep track of player names connected

function createLobbyButton() {
    const toLobby = document.createElement('button');
    toLobby.className = 'room-nav btn btn-secondary';
    toLobby.id = 'return-lobby-button';
    toLobby.innerText = 'Return to Lobby';
    toLobby.onclick = () => {
        // Leave current room and join lobby
        leaveAndJoin(username, 'lobby');
    }
    return toLobby;
}

function createGameContainer() {
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';

    // Create 3x3 grid for game container to add board and players to
    // Grid IDs are 1-indexed for easier visualization
    // Board will go in div 5 (2, 2), self in div 8 (2, 3), other spots filled as players are added

    for (let col = 1; col < 4; col++) {
        for (let row = 1; row < 4; row++) {
            
            const gridItem = document.createElement('div');
            gridItem.class = 'game-grid';

            // Convert row and col to ID number, starting at 1 left->right and ending at 9
            gridItem.id = 'game-grid-' + (row + ((col - 1) * 3));
            
            // Set row and column values
            gridItem.style.gridArea = `${col} / ${row}`;

            gameContainer.appendChild(gridItem);
        }
    }

    return gameContainer;
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
    
    // New session, start game. round end, continue; game end, new game 
    continueButton.id = 'continue-button';
    continueButton.className = 'move-button';
    continueButton.innerText = 'Continue to Next Round';
    continueButton.disabled = true;
    // Start with button hidden
    continueButton.style.display = 'none';

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

function createPlayerContainer(name) {
    
    /* Structure:
        Name ( - knocked)?
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

    const currentPlayerStrong = document.createElement('strong');
    currentPlayerStrong.id = name + '-current-strong';
    playerNameContainer.appendChild(currentPlayerStrong);
    
    const playerNameStrong = document.createElement('strong');
    playerNameStrong.id = name + '-name-strong';
    playerNameStrong.innerText = name;
    playerNameContainer.appendChild(playerNameStrong);
    
    const knockedStrong = document.createElement('strong');
    knockedStrong.id = name + '-knocked-strong';
    playerNameContainer.appendChild(knockedStrong);
    
    playerContainer.appendChild(playerNameContainer);
    
    // Put hand in div
    const hand = document.createElement('div');
    hand.className = 'hand-container';
    hand.id = name + '-hand-container';
    
    // Put lives into div
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

    // if (name === username) {

    //     // Highlight self name and player info
    //     playerContainer.style.color = 'purple';
    // }

    return playerContainer;
}

function setCardDisplay(cardStr, cardObject) {
    /*
        '\u2660': ♠, black
        '\u2665': ♥, red
        '\u2666': ♦, blue
        '\u2663': ♣, green
    */
    
    if (cardStr === null || cardStr.length !== 2) {
        cardObject.innerText = '-'
        return;
    }

    let rank = cardStr[0];
    
    // Unpack rank - Change T to 10 for display
    if (rank === 'T') {
        rank = '10';
    }
    
    // Associate unicode suit character with the letter S, H, D, or C
    const SUIT_TO_DISPLAY = {'S': '\u2660', 'H': '\u2665', 'D': '\u2666', 'C': '\u2663'}

    // Add rank to dataset so css can center `10` correctly
    // Also allows to select any card of one rank if needed
    cardObject.dataset.rank = cardStr[0];

    // Add suit to dataset so css can color based on suit
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

        // Create new player container if one does not exist
        if (document.querySelector('#' + players[i] + '-container') === null) {
            
            // Changing destination from player panel -> game container grid
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

            // Remove player from player panel
            remove(document.querySelector(containerID));
            // Change from player-panel to remove from DOM
            // document.querySelector('.player-panel').removeChild(playerContainer);
            
            console.log(`Found ${document.querySelector(containerID)} with id ${containerID}, removing ${playersConnected[i]} from panel`);
            
            // Remove player from local list
            playersConnected.splice(i, 1);
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
        // if (username.length === 0) {
            // I think username can be assigned no matter what, the double `if` statement looked odd
            username = response.username;
        // }

        if (username.length === 0) {
            console.log('Username not set, cannot continue to set up room')
            return
        }
        
        // Set up game room

        // Update page title
        document.querySelector('title').innerText = `The Space: ${GAME_DISPLAY_NAMES[chosenGame]}`;

        // Update header (title of room)
        document.querySelector('#sub-header-center-h2').innerText = `${response.room} - ${GAME_DISPLAY_NAMES[chosenGame]}`;

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

        /* Game container - contains board, players, controls */
        const gameContainer = createGameContainer()
        gameRoomContainer.appendChild(gameContainer);
        
        
        // Select board to add grid to - middle of game container
        const gridFive = document.querySelector('#game-grid-5');
        // Create board and add to grid
        gridFive.appendChild(createBoard());
        
        // Add move buttons after player panel so it appears at the bottom
        gridFive.appendChild(createMoveButtons());
        
        /* End of game container */
        
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

function populateHand(playerName, hand, hand_score, mode) {
    
    const playerHandContainer = document.querySelector('#' + playerName + '-hand-container');
    
    if (playerHandContainer.hasChildNodes()) {
        // Empty old hand to get ready for new hand - replaceChildren with no args
        playerHandContainer.replaceChildren();
    }

    // Create buttons for hand with array from server
    for (const card of hand) {
        const cardButton = createHandButton(card)
        
        // Disable card button for all if end of round or non-self player
        if (mode === 'end_round' || mode === 'end_game' || username !== playerName) {
            cardButton.disabled = true;
        }
        // // Disable card button if non-self player
        // else if (username !== playerName) {
        //     cardButton.disabled = true;
        // }

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

        // Unpack general state
        inProgress = response.in_progress;
        currentPlayer = response.current_player;
        discardCard = response.discard;

        // Fill log
        for (const msg of response.log) {
            addToLog(msg, "system");
        }
        
        // Removing this from blocking updates since game needs to update to end state on game end
        if (!inProgress) {
            console.log('Received update response but game is not in progress.');
        }
        
        if (response.player_order === undefined) {
            console.log('Player order missing from response.');
            return;
        }

        // Disable knock button (for all) if there has been a knock
        if (response.knocked) {
            document.querySelector('#knock-button').disabled = true;
        }
        // Enable knock button if no one has knocked
        else {
            document.querySelector('#knock-button').disabled = false;
        }
        
        // Disable start button when game in progress; Enable when not in progress
        document.querySelector('#start-button').disabled = inProgress;
        if (inProgress) {
            // Hide start button when game in progress
            document.querySelector('#start-button').style.display = 'none';
        }
        else {
            // Unhide start button when game not in progress
            document.querySelector('#start-button').style.display = '';
        }
        
        // Enable continue button on round end (and NOT on game end)
        if (response.mode === 'end_round') {
            document.querySelector('#continue-button').disabled = false;
            // Unhide button when active
            document.querySelector('#continue-button').style.display = '';
            
            // TODO figure out how to delay display of winner by ~2 seconds to make reveal more 
            // realistic to a real game. Maybe use roundEnd flag that gets reset every round start?
            // Or can go by specific log messages but that seems more fragile
        }
        
        // Disable continue button on every other mode
        else {
            document.querySelector('#continue-button').disabled = true;
            // HIDE button when not active
            document.querySelector('#continue-button').style.display = 'none';
        }

        // Add discard card to display on discard button
        setCardDisplay(discardCard, document.querySelector('#discard-button'));
        
        // Check for knocked out players
        // Display should only be reset when next round round starts. Server can wait to kick them out
        // Until beginning of next round
        for (const player of playersConnected) {
            if (!response.player_order.includes(player)) {
                // Replace lives with 'knocked out'
                document.querySelector('#' + player + '-lives').innerText = 'Knocked out'
                // Remove all cards
                document.querySelector('#' + player + '-hand-container').replaceChildren()
                // Remove hand score
                document.querySelector('#' + player + '-hand-score').innerText = '';
                
                // Reset `current` status
                document.querySelector('#' + player + '-current-strong').innerText = '';
                document.querySelector('#' + player + '-container').dataset.current = '0';
                // Reset `knocked`
                document.querySelector('#' + player + '-knocked-strong').innerText = '';
                document.querySelector('#' + player + '-container').dataset.knocked = '0';
            }
        }

        // Unpack for players still in the game 
        // Eventually want to rearrange players to be correct player order
        playerOrder = response.player_order;
        
        // Loop player order to fill containers
        for (let i = 0; i < playerOrder.length; i++) {
            
            // playerOrder[i] is the player name

            // Once player array is populated, add to player panel display or dataset
            const playerContainer = document.querySelector('#' + playerOrder[i] + '-container');

            // Update order
            playerContainer.dataset.order = i;
            
            // Update lives
        
            // If not knocked out, set number of extra lives
            document.querySelector('#' + playerOrder[i] + '-lives').innerText = 'Extra Lives: ';
            playerContainer.dataset.lives = response.lives[i];
            
            // Use NUMBERS for comparisons, not strings!
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
            else if (response.lives[i] === 0) {
                
                // Remove any stars remaining
                document.querySelector('#' + playerOrder[i] + '-lives').replaceChildren()
                
                // Add text
                document.querySelector('#' + playerOrder[i] + '-lives').innerText += 'on the bike';
            }
                        
            // Server will set lives to -1 if knocked out
            else if (response.lives[i] === -1) {
                document.querySelector('#' + playerOrder[i] + '-lives').innerText = 'Knocked out';
            }
            
            
            // Create front-facing hand for self, clickable
            if (username === playerOrder[i]) {
                populateHand(playerOrder[i], response.hand, response.hand_score, response.mode)  
            }

            // Create front-facing hand for others on game end, not clickable
            // Using `else if` here implies playerOrder[i] is not the self player
            else if (response.mode === 'end_round' || response.mode === 'end_game') {
                populateHand(playerOrder[i], response.final_hands[i], response.final_scores[i], response.mode)
            }

            // Create back-facing hand for others if not end of round / game
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
            
            // Set dataset `current` atribute - must be a string, so '1' = true and '0' = false
            if (currentPlayer === playerOrder[i]) {
                playerContainer.dataset.current = '1';
                // Add marker to current player - '\u2192' is right pointing arrow →
                document.querySelector('#' + playerOrder[i] + '-current-strong').innerText = '\u2192';
            }
            else {
                playerContainer.dataset.current = '0';
                document.querySelector('#' + playerOrder[i] + '-current-strong').innerText = '';
            }
            
            // Set connected status to True when creating player
            playerContainer.dataset.connected = '1';
            
            // Set knocked status - add text to name container
            if (response.knocked === playerOrder[i]) {
                playerContainer.dataset.knocked = '1';
                document.querySelector('#' + playerOrder[i] + '-knocked-strong').innerText = ' - knocked';
            }
            else {
                playerContainer.dataset.knocked = '0';
                document.querySelector('#' + playerOrder[i] + '-knocked-strong').innerText = '';
            }
        }
    }
}
