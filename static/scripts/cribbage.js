// Functions must have unique names; this means there can only be one function like createBoard
// must make it generic and add specific things to 31 or cribbage with a conditional statement or additional functions

function createBoardCribbage() {

    // Neither deck nor crib should be clickable for cribbage - all drawing is automated

    // Create div for board
    const board = document.createElement('div');
    board.className = 'board';
    board.id = 'board';

    // Create deck container
    const deckContainer = document.createElement('div');
    deckContainer.className = 'card-container';
    deckContainer.id = 'deck-container';
    
    // Create deck and add deck to container
    deckContainer.appendChild(createPlaceholderCard('deck'));
    
    // Add deck to board
    board.appendChild(deckContainer);

    // Create crib container
    const cribContainer = document.createElement('div');
    cribContainer.className = 'card-container';
    cribContainer.id = 'crib-container';
    
    // Add crib container to board
    board.appendChild(cribContainer);
    
    return board;
}

function createMoveButtonsCribbage() {
    // Only need `discard` or `confirm discard` button
        // + Continue Round and New Game buttons
    
    // Discard can be considered temp button since it can be hidden on non-discard modes

    const moveButtonsContainer = document.createElement('div');
    moveButtonsContainer.id = 'move-button-container';

    // Add discard confirm button
    const discardConfirm = document.createElement('button');
    discardConfirm.className = 'move-button';
    discardConfirm.id = 'discard-confirm-button';
    discardConfirm.innerText = 'Discard to crib';
    
    discardConfirm.onclick = () => {
        // Get all cards staged for discard
        const chosenCards = document.querySelectorAll('.staged-for-discard');
        
        // Loop through cards and extract rank and suit
        let translatedCards = [];

        chosenCards.forEach(card => {
            translatedCards.push(`${card.dataset.rank}${card.dataset.suit}`)
        })

        socket.emit('move', {'action': 'discard', 'room': currentRoom, 'username': username, 'cards': translatedCards});
    }
    
    moveButtonsContainer.appendChild(discardConfirm);

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
    
    moveButtonsContainer.appendChild(tempButtonContainer);
    
    return moveButtonsContainer;
}

function createPlayerContainerCribbage(name, order, gridNumber) {
    
    /* Structure:
        Name - Dealer
        Hand
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

    // Create spot for dealer indicator to be filled in later
    const dealerStrong = document.createElement('strong');
    dealerStrong.id = name + '-dealer-strong';
    playerNameContainer.appendChild(dealerStrong);
    
    playerContainer.appendChild(playerNameContainer);
    
    // Put hand in div
    const hand = document.createElement('div');
    hand.className = 'hand-container';
    hand.id = name + '-hand-container';
    
    playerContainer.appendChild(hand);
    
    // Set order and grid number in dataset
    playerContainer.dataset.order = order;
    playerContainer.dataset.gridNumber = gridNumber;
    
    // Set dealer to 0 by default; will be changed on game update
    playerContainer.dataset.dealer = '0';

    return playerContainer;
}

// Set discard action for card in hand
var handHandlerCribbage = function handOnClickCribbage(event) {
    
    // Disable input for card if end of round or non-self player
    if (mode === 'end_round' || mode === 'end_game' || mode === 'show') {
        return;
    }
    
    // Cards should be toggle-able to be staged for discard
    if (mode === 'discard') {
        // Get size of player hand by getting grandparent element and counting card containers
        const handSize = this.parentElement.parentElement.querySelectorAll('.card-container').length
        
        // Check that player's hand is over 4 to prevent staging after discarding
        if (handSize === 4) {
            console.log('Hand already has 4 cards; cannot discard any more.');
            return;
        }

        // Actual discard event is tied to discard confirm button
        console.log(`Staging ${this} for discard`);
        this.classList.toggle('staged-for-discard');
    }

    // Cards should be selectable if in play
    if (mode === 'play') {

    }
}

function updateCribbage(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
    }
    
    // Update board based on server response:

    // # Generic data
    // "game": "cribbage",  # specifies game
    // "action": "update_board",  # for client to know what type of update this is
    // "room": self.room_name,  # name of room
    // "mode": self.mode,  # current game mode - might help restrict inputs on client side
    // "in_progress": self.in_progress,  # whether game is in progress
    // "player_order": self.player_order,  # list of player names in order
    // "current_player": self.current_player,  # current player's name
    // "hand_sizes": hand_sizes,  # number of cards in each players' hands
    // "total_scores": total_scores,  # overall score of game (0-121)
    // "crib_size": len(self.crib),  # show size of crib as players discard
    // "dealer": self.dealer,  # dealer of round
    // "played_cards": played_cards,  # list of dicts {"player": ..., "card": ...}
    // "play_count": play_count,  # current count of the play
    // "final_hands": final_hands,  # reveal all hands to all players

    // # Specific to player
    // "recipient": player_name,
    // "hand": [card.portable for card in self.players[player_name].hand],  # hand for self only
    // "num_to_discard": num_to_discard,  # if discard phase, number of cards to discard
    // "log": self.players[player_name].log,  # new log msgs - split up for each player
    // "action_log": custom_action_log,
    
    // Removing this from blocking updates since game needs to update to end state on game end
    if (!inProgress) {
        console.log('Received update response but game is not in progress.');
    }
    
    if (response.player_order === undefined) {
        console.log('Player order missing from response.');
        return;
    }
    
    // UPDATE CARDS FIRST so animation will be completed before rest of update
    // Run animation depending on response.action
    // The rest of the update will not wait until end of animation - must include all updates to cards 

    // Unpack for players still in the game 
    playerOrder = response.player_order;

    for (actionObject of response.action_log) {

        // May need to make multiple actions async so they don't happen simultaneously
        console.log(`Action = ${actionObject.action}, ${actionObject.player}, ${actionObject.card}`);
        
        // Action keys for non-play; non-show
            // "action", "player", "cards"
        // Action keys for play; show
            // "action", "player", "points", "reason", "cards", "mode"
        
        // Possible actions:
        // self.action_log.append({"action": "deal", "player": "all", "cards": []})        
        // self.action_log.append({"action": "discard", "player": packet["name"], "cards": [card for card in packet["cards"]], "num_to_discard": len(packet["cards"])})
        // self.action_log.append({"action": "starter", "player": "all", "cards": [self.starter.portable]})
        // self.action_log.append({"action": "play_card", "player": packet["name"], "cards": [played_card]})
        // self.action_log.append({"action": "start_show", "player": self.current_player, "cards": [card.portable for card in four_card_hand]})
        // self.action_log.append({"action": "score", "player": player, "points": points, "reason": reason, "cards": cards, "mode": self.mode})

            
        // Start - empty client hand, deal the required cards
        // No action
        // client hand has cards from previous round,
        // Animate deal if action === 'start' (combination of `draw` animations)
        if (actionObject.action === 'deal') {
            
            // Iterate through player order to update all players' hands
            for (let playerIndex = 0; playerIndex < playerOrder.length; playerIndex++) {
                console.log(`Dealing for: ${playerOrder[playerIndex]}`);
                
                // Empty old hand to get ready for new hand
                document.querySelector('#' + playerOrder[playerIndex] + '-hand-container').replaceChildren();
            
                // Keep drawing until hand reaches hand size
                for (let cardIndex = 0; cardIndex < response.hand_sizes[playerIndex]; cardIndex++) {
                    
                    // For self player, use response.hand
                    if (playerOrder[playerIndex] === username) {
                        animateDraw(response.hand[cardIndex], playerOrder[playerIndex]);
                    }
                    // For non-self player, use unknown card
                    else {
                        animateDraw('unknown', playerOrder[playerIndex]);
                    }
                }
            }
        }

        // Create animateToCrib - turns all cards face-down and put in crib container
        else if (actionObject.action === 'discard') {
            // REMEMBER TO UNSTAGE ALL CARDS AFTER CARDS ARE DISCARDED, disallow staging cards, and hide discard button
            animateToCrib(actionObject.player, actionObject.cards, actionObject.num_to_discard);
        }

        // Create animateFlip - flip up a card in place
        else if (actionObject.action === 'starter') {
            animateFlip(actionObject.card, player='');
        }

    }

    // NEED TO REVIEW - COPIED FROM THIRTYONE
    // No action; cards will be updated but no animation will happen
        // Ex: Reloading page in middle of game
    if (response.action_log.length === 0) {
        console.log('No action specified');

        // Add cards to hands
        for (let playerIndex = 0; playerIndex < playerOrder.length; playerIndex++) {
            updateHandNoAnimation(playerOrder[playerIndex], playerIndex, response);
        }

        // update discard outside of player loop
        updateDiscardNoAnimation(response.discard);
    }
    

    
    // Unpack general state
    inProgress = response.in_progress;
    // Must put current player update here since turn may increment on server side
    // Potentially animate changing current player
    currentPlayer = response.current_player;

    // Fill log
    for (const msg of response.log) {
        addToLog(msg, 'system');
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


    // Loop player order to fill containers apart from cards
    for (let i = 0; i < playerOrder.length; i++) {
        
        console.log(`filling in player info: ${playerOrder[i]}`)

        // Once player array is populated, add to player panel display or dataset
        const playerContainer = document.querySelector('#' + playerOrder[i] + '-container');

        // Create front-facing hand for others on game end, not clickable
        // Animation idea: reveal of cards (first card flips, second card, third card)
        if ((username !== playerOrder[i]) && (response.mode === 'end_round' || response.mode === 'end_game')) {
            populateHandStatic(playerOrder[i], response.final_hands[i], response.final_scores[i], response.mode)
        }

        if (!document.querySelector('#' + playerOrder[i] + '-hand-container').hasChildNodes()){
            console.log(`${playerOrder[i]} hand is empty.`);
        }        
        
        // Set dataset `current` atribute - must be a string, so '1' = true and '0' = false
        // Animation idea: move current marker to new current player
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

        // Add dealer indicator and update player container dataset
        if (response.dealer === playerOrder[i]) {
            playerContainer.dataset.dealer = '1';
            document.querySelector('#' + playerOrder[i] + '-dealer-strong').innerText = ' - Dealer'
        }
        else {
            playerContainer.dataset.dealer = '0';
            document.querySelector('#' + playerOrder[i] + '-dealer-strong').innerText = ''
        }
    }
}
