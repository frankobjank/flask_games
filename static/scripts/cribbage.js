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
    cribContainer.className = 'crib-container';
    cribContainer.id = 'crib-container';

    const cribCard = document.createElement('div');
    cribCard.className = 'card-container';
    cribCard.id = 'crib-card-container';
    cribCard.appendChild(createPlaceholderCard('crib'))

    cribContainer.appendChild(cribCard);
    
    // Count for crib - maybe put this in crib dataset
    // Eventually want to show number of cards in stack
    const cribCount = document.createElement('p');
    cribCount.id = 'crib-count';
    cribCount.innerText = 'Crib: 0 cards';

    cribContainer.appendChild(cribCount);
    
    // Add crib container to board
    board.appendChild(cribContainer);
    
    return board;
}

function createContinueButtonsCribbage() {
    // Only need `discard` button, + `Continue Round` and `New Game` buttons
    // Moving discard button to player container
    
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
    continueButton.innerText = 'Deal next round';
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
    
    return tempButtonContainer;
}

function addlPlayerContainerCribbage(name, playerContainer) {
    
    /* Structure:
          Name - Dealer
              Hand
        [ Discard button ]
    */
    
    // Add this to NAME container, not playerContainer
    // Create spot for dealer indicator to be filled in later
    const dealerStrong = document.createElement('strong');
    dealerStrong.id = 'dealer-strong-' + name;

    playerContainer.querySelector('#name-container-' + name).appendChild(dealerStrong);
    
    // Set dealer to 0 by default; will be changed on game update
    playerContainer.dataset.dealer = '0';

    // If not self, return container
    if (name !== username) {
        return playerContainer;
    }

    // ONLY FOR SELF: Add discard button
    // Discard can be considered temp button since it can be hidden on non-discard modes
    const discardContainer = document.createElement('div');
    discardContainer.id = 'discard-button-container';

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
        });

        socket.emit('move', {'action': 'discard', 'room': currentRoom, 'username': username, 'cards': translatedCards});
    }
    
    discardContainer.appendChild(discardConfirm);

    playerContainer.appendChild(discardContainer);

    return playerContainer;
}

function updateCribNoAnimation(crib) {

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
        const handSize = this.parentElement.parentElement.querySelectorAll('.card-container').length;
        
        // Check that player's hand is over 4 to prevent staging after discarding
        if (handSize === 4) {
            console.log('Hand already has 4 cards; cannot discard any more.');
            return;
        }

        console.log(`Card ${this.id} clicked during discard mode`);
        
        // If card is unstaged: check if can be staged
        // Check if player has already staged enough cards and should not stage any more
        if (
            !this.classList.contains('staged-for-discard') && 
            handSize - document.querySelectorAll('.staged-for-discard').length <= 4
        ) {
            console.log('Already staged enough cards; cannot stage any more.');
            return;
        }

        // At this point an unstaged card is allowed to be staged, or a staged card could be unstaged
        this.classList.toggle('staged-for-discard');

        // This is only for staging, actual discard event is tied to discard confirm button
    }

    // Cards should be selectable if in play
    if (mode === 'play') {
        console.log('TODO hand onclick during play');
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

    inProgress = response.in_progress;

    // Removing this from blocking updates since game needs to update to end state on game end
    if (!inProgress) {
        console.log('Received update response but game is not in progress.');
    }
    
    if (response.player_order === undefined) {
        console.log('Player order missing from response.');
        return;
    }

    // Unpack for players still in the game 
    playerOrder = response.player_order;

    // Create player containers if any are missing
    // Check if game is in progress; create player containers if they don't exist
    if (inProgress) {

        console.log('Game is in progress; check if player containers need to be created');
        
        // Create new player containers if there is mismatch in length between
        // playerOrder and number of player containers - this may not be sufficient
        // check because on new game with same number of players there could be a new
        // order. Complete check would check all player names and see if they were in
        // the right order.
        if (playerOrder.length !== document.querySelectorAll('.player-container').length) {
            console.log('Calling fillPlayerGrid to create player containers');
            fillPlayerGrid(playerOrder, response.game);
        }
    }

    // UPDATE CARDS FIRST so animation will be completed before rest of update
    // Run animation depending on response.action
    // The rest of the update will not wait until end of animation - must include all updates to cards 


    for (actionObject of response.action_log) {

        // May need to make multiple actions async so they don't happen simultaneously
        console.log(`Action = ${actionObject.action}, ${actionObject.player}, ${actionObject.card}`);
        
        // Action keys for non-play; non-show
            // "action", "player", "cards"
        // Action keys for play; show
            // "action", "player", "points", "reason", "cards", "mode"
        
        // Possible actions from cribbage.py
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
                document.querySelector('#hand-container-' + playerOrder[playerIndex]).replaceChildren();
            
                // Keep drawing until hand reaches hand size
                for (let cardIndex = 0; cardIndex < response.hand_sizes[playerIndex]; cardIndex++) {
                    
                    let cardToDraw;
                    // For self player, use response.hand
                    if (playerOrder[playerIndex] === username) {
                        cardToDraw = response.hand[cardIndex];
                    }
                    // For non-self player, use unknown card
                    else {
                        cardToDraw = 'unknown';
                    }
                    animateDraw(cardToDraw, playerOrder[playerIndex]);
                    
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

    // No action; cards will be updated but no animation will happen
        // Ex: Reloading page in middle of game
    if (response.action_log.length === 0) {
        console.log('No action specified');

        // Add cards to hands
        for (let playerIndex = 0; playerIndex < playerOrder.length; playerIndex++) {
            updateHandNoAnimation(playerOrder[playerIndex], playerIndex, response);
        }

        // Update crib outside of player loop
        updateCribNoAnimation(response.crib);
    }
    
    // Must put current player update here since turn may increment on server side
    // Potentially animate changing current player
    currentPlayer = response.current_player;
    // Update global mode var
    mode = response.mode;

    // Fill log
    for (const msg of response.log) {
        addToLog(msg, 'system');
    }

    // Update buttons (start game, continue, discard)
    
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
    }
    
    // Disable continue button on every other mode
    else {
        document.querySelector('#continue-button').disabled = true;
        // HIDE button when not active
        document.querySelector('#continue-button').style.display = 'none';
    }

    // Enable discard if player still has to discard; otherwise disable
    if (response.mode === 'discard' && response.num_to_discard > 0) {
        document.querySelector('#discard-confirm-button').disabled = false;
        document.querySelector('#discard-confirm-button').style.display = '';
    }
    else {
        document.querySelector('#discard-confirm-button').disabled = true;
        document.querySelector('#discard-confirm-button').style.display = 'none';
    }


    // Loop player order to fill containers apart from cards
    for (let i = 0; i < playerOrder.length; i++) {
        
        console.log(`filling in player info: ${playerOrder[i]}`)

        // Once player array is populated, add to player panel display or dataset
        const playerContainer = document.querySelector('#player-container-' + playerOrder[i]);

        // Create front-facing hand for others on game end, not clickable
        // Animation idea: reveal of cards (first card flips, second card, third card)
        // Adapted from thirty one, might have to adjust final hands, or make sure to use final hands for show hands
        if ((username !== playerOrder[i]) && (response.mode === 'show')) {
            populateHandStatic(playerOrder[i], response.final_hands[i])
        }

        if (!document.querySelector('#hand-container-' + playerOrder[i]).hasChildNodes()){
            console.log(`${playerOrder[i]} hand is empty.`);
        }

        // Make cards selectable for self depending on mode
            // Discard - only if they have not discarded already
            // On play - only if they can play the card - will have to get from server, 
                // like a 'can_play' flag that can translate to selectable
        if (username === playerOrder[i]) {
            cardsInHand = document.querySelector('#hand-container-' + playerOrder[i]).querySelectorAll('.rotate-card-container');
            if (mode === 'discard') {
                // Select all cards and make selectable
                cardsInHand.forEach(card => {
                    card.classList.add('selectable');
                });
            }
            else if (mode === 'play') {

            }
            // If no conditions are met, make sure selectable class is not on the card
            else {
                cardsInHand.forEach(card => {
                    card.classList.remove('selectable');
                });
            }
        }

        
        // Mark current player only if mode is not discard, since anyone can go during discard
        // Animation idea: move current marker to new current player
        if (response.mode !== 'discard') {
            if (currentPlayer === playerOrder[i]) {
                playerContainer.dataset.current = '1';
                // Add marker to current player - '\u2192' is right pointing arrow →
                document.querySelector('#current-strong-' + playerOrder[i]).innerText = '\u2192';
            }
            else {
                playerContainer.dataset.current = '0';
                document.querySelector('#current-strong-' + playerOrder[i]).innerText = '';
            }
        }
        
        // Set connected status to True when creating player
        playerContainer.dataset.connected = '1';

        // Add dealer indicator and update player container dataset
        if (response.dealer === playerOrder[i]) {
            playerContainer.dataset.dealer = '1';
            document.querySelector('#dealer-strong-' + playerOrder[i]).innerText = ' - Dealer'
        }
        else {
            playerContainer.dataset.dealer = '0';
            document.querySelector('#dealer-strong-' + playerOrder[i]).innerText = ''
        }
    }
}
