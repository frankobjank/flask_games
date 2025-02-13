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
        socket.emit('move', {'action': 'draw', 'room': currentRoom, 'username': username});
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
        socket.emit('move', {'action': 'pickup', 'room': currentRoom, 'username': username});
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
        socket.emit('move', {'action': 'draw', 'room': currentRoom, 'username': username});
    }
    
    // Add pickup button (from discard) - same as clicking the discard pile
    const pickupButton = document.createElement('button');
    pickupButton.className = 'move-button';
    pickupButton.id = 'pickup-button';
    pickupButton.innerText = 'Pickup';
    
    pickupButton.onclick = () => {
        socket.emit('move', {'action': 'pickup', 'room': currentRoom, 'username': username});
    }
    
    // Add knock button
    const knockButton = document.createElement('button');
    knockButton.className = 'move-button';
    knockButton.id = 'knock-button';
    knockButton.innerText = 'Knock';
    
    knockButton.onclick = () => {
        socket.emit('move', {'action': 'knock', 'room': currentRoom, 'username': username});
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
        socket.emit('move', {'action': 'continue', 'room': currentRoom, 'username': username});
    }

    continueButtonContainer.appendChild(continueButton);

    // New game button
    const newGameButtonContainer = document.createElement('div');
    
    const newGameButton = document.createElement('button');
    
    newGameButton.className = 'move-button';
    newGameButton.id = 'start-button';
    newGameButton.innerText = 'Start New Game';
    
    newGameButton.onclick = () => {
        socket.emit('move', {'action': 'start', 'room': currentRoom, 'username': username});
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

function createCardContainer(cardStr) {
    // Create a card container - div that encloses a playing card
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    cardContainer.id = 'card-container' + cardStr;

    return cardContainer;
}

function createHandButton(cardStr) {

    // serverCard = 'KS', 'QH', 'TD', '9C', ...
    const cardButton = document.createElement('button');
    cardButton.className = 'playing-card card-front hand-button';
    cardButton.id = 'card-' + cardStr;
    
    // Adds text on hover
    // cardButton.title = 'Discard';
    setCardDisplay(cardStr, cardButton);

    // Send server request on click
    cardButton.onclick = () => {
        socket.emit('move', {'action': 'discard', 'room': currentRoom, 'username': username, 'card': cardStr});
        console.log(`Requesting discard ${cardStr}`)
    }

    // Return container to be added to hand
    return cardButton;
}

function populateHand(playerName, hand, hand_score, mode) {
    
    const playerHandContainer = document.querySelector('#' + playerName + '-hand-container');
    
    if (playerHandContainer.hasChildNodes()) {
        // Empty old hand to get ready for new hand - replaceChildren with no args
        playerHandContainer.replaceChildren();
    }

    // Create buttons for hand with array from server
    for (const card of hand) {
        const cardButton = createHandButton(card);

        // Disable card button for all if end of round or non-self player
        if (mode === 'end_round' || mode === 'end_game' || username !== playerName) {
            cardButton.disabled = true;
        }
        // // Disable card button if non-self player
        // else if (username !== playerName) {
        //     cardButton.disabled = true;
        // }
        
        // Add card button to card container
        const cardContainer = createCardContainer(card)
        cardContainer.appendChild(cardButton);

        // Add card container to hand container
        playerHandContainer.appendChild(cardContainer);
    }
    
    // Update hand score
    document.querySelector('#' + playerName + '-hand-score').innerText = ' Hand Score: ' + hand_score + ' ';
}

// Old updateGameRoom
function updateThirtyOne(response) {
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
                        // buttons make consistent styling
                        // div helps differentiate them from the actual card buttons
                    const dummyCard = document.createElement('div');
                    dummyCard.className = 'playing-card card-back';
                    
                    // Add dummy card to container - do dummies need ids for animation purposes?
                        // I think no but might change later
                    const dummyContainer = document.createElement('div');
                    dummyContainer.className = 'card-container dummy-container';

                    dummyContainer.appendChild(dummyCard);

                    document.querySelector('#' + playerOrder[i] + '-hand-container').appendChild(dummyContainer);
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
