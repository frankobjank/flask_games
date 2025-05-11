function createBoardThirtyOne() {

    // Create div for board
    const board = document.createElement('div');
    board.className = 'board';
    board.id = 'board';

    // Create deck container
    const deckContainer = document.createElement('div');
    deckContainer.className = 'card-container';
    deckContainer.id = 'deck-container';
    
    // Create deck button
    const deck = createPlaceholderCard('deck');
    
    // Set deck to send `draw` action to server
    deck.addEventListener('click', deckHandler);
    
    // Add deck button to container
    deckContainer.appendChild(deck);
    
    // Create discard container
    const discardContainer = document.createElement('div');
    discardContainer.className = 'card-container';
    discardContainer.id = 'discard-container';
    
    // Create discard button
    const discard = createPlaceholderCard('discard');
    
    // Set discard to send `pickup` action to server
    discard.addEventListener('click', discardHandler);
    
    // Add discard button to container
    discardContainer.appendChild(discard);
    
    // Add deck/discard to board
    board.appendChild(deckContainer);
    board.appendChild(discardContainer);
    
    return board;
}

function createMoveButtonsThirtyOne() {
    // Create draw, pickup, and knock buttons
        // + Continue Round and New Game buttons

    const moveButtonsContainer = document.createElement('div');
    moveButtonsContainer.id = 'move-button-container';

    const drawPickupKnockContainer = document.createElement('div');
    drawPickupKnockContainer.className = 'button-container';
    drawPickupKnockContainer.id = 'draw-pickup-knock-container';

    // Add draw button - same as clicking the deck
    const drawButton = document.createElement('button');
    drawButton.className = 'move-button';
    drawButton.id = 'draw-button';
    drawButton.innerText = 'Draw';
    
    // Set onclick to same as clicking deck button
    drawButton.onclick = () => {
        // The deck button MUST EXIST at this point
        const deckButton = document.querySelector('#deck-button');
        if (deckButton !== null) {
            deckButton.click();
        }
        else {
            console.log('Missing deck button');
        }
    }
    
    // Add pickup button (from discard) - same as clicking the discard pile
    const pickupButton = document.createElement('button');
    pickupButton.className = 'move-button';
    pickupButton.id = 'pickup-button';
    pickupButton.innerText = 'Pickup';
    
    // Set onclick to the same as clicking discard button
    pickupButton.onclick = () => {
        // The discard button MUST EXIST at this point
        const discardButton = document.querySelector('#discard-button');
        if (discardButton !== null) {
            discardButton.click();
        }
        else {
            console.log('Missing discard button');
        }
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

function createPlayerContainerThirtyOne(name, order, gridNumber) {
    
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

    // Set order and grid number in dataset
    playerContainer.dataset.order = order;
    playerContainer.dataset.gridNumber = gridNumber;

    return playerContainer;
}

// Populating hand with no animation; called in updateHandNoAnimation()
function populateHandStatic(playerName, hand, hand_score) {
    
    const playerHandContainer = document.querySelector('#' + playerName + '-hand-container');
    
    if (playerHandContainer.hasChildNodes()) {
        // Empty old hand to get ready for new hand - replaceChildren with no args
        playerHandContainer.replaceChildren();
    }

    // Create buttons for hand with array from server
    for (const card of hand) {
        const cardObject = createCardObject(card);

        // Send server request on click
        cardObject.addEventListener('click', handHandlerThirtyOne);

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
    
    // Update hand score
    document.querySelector('#' + playerName + '-hand-score').innerText = ' Hand Score: ' + hand_score + ' ';
}

function setNewDiscard(cardStr) {

    let newDiscard;

    // If no discard, make placeholder card object
    if (!cardStr || cardStr.length === 0) {
        newDiscard = createPlaceholderCard('discard');
    }
    // If discard given, create card object
    else {
        newDiscard = createCardObject(cardStr);
    }
    
    // Set id for discard button
    newDiscard.id = 'discard-button';
    
    // Make sure card is face up
    newDiscard.style.transform = 'rotateY(180deg)';
    
    // Add onclick to request pickup from server
    newDiscard.addEventListener('click', discardHandler);

    return newDiscard;
}

// Animating card from hand to discard
function animateToDiscard(player, cardStr, handScore) {
    
    const discard = document.querySelector('#discard-button');

    // Define card depending on self / non-self player
    let card;
    let cardContainer;

    // If player is self, card is known
    if (player === username) {
        card = document.querySelector(`#card-${cardStr}`);
        cardContainer = card.parentElement;
    }
    // If player is not self, pop random card from `player`'s hand
    else {
        // Out of hand container, get random card container
        const handContainer = document.querySelector('#' + player + '-hand-container');
        let allCardContainers = handContainer.querySelectorAll('.card-container');
        cardContainer = allCardContainers[getRandomInt(allCardContainers.length)];
        // Once random card container is chosen, there is only one card that can be selected
        card = cardContainer.querySelector('.rotate-card-container');
    }

    // Create new card object to put in discard; get attributes from old card
    const newDiscard = setNewDiscard(cardStr);
    
    // Get starting position of card
    const cardRect = card.getBoundingClientRect();

    // Get discard position
    const discardRect = discard.getBoundingClientRect();

    // Calc movement distances - compare left and top
    const deltaX = discardRect.left - cardRect.left
    const deltaY = discardRect.top - cardRect.top

    // Create a clone to animate 
    // this prevents having to actually move the original card
    // function `cloneNode()` creates a copy of an object.
    // arg `true` means copy is a deep copy, i.e. it includes all node's descendants as well
    // Clone should be of newDiscard so it has display of known card
    const clone = newDiscard.cloneNode(true);
    clone.classList.add('clone');
    // change id of clone so no duplicate ids
    clone.id = 'clone-' + clone.id;

    document.body.appendChild(clone);
    
    // Start clone at card's dimensions - cloneNode doesn't copy these values
    clone.style.left = `${cardRect.left}px`;
    clone.style.top = `${cardRect.top}px`;
    clone.style.width = `${cardRect.width}px`;
    clone.style.height = `${cardRect.height}px`;
    clone.style.position = 'fixed';
    
    // Hide original card
    card.style.visibility = 'hidden';

    // set animation object to add event listener
    let animObject;
    
    if (player === username) {
        animObject = clone.animate(moveCard(deltaX, deltaY, 'up', 'up'), ANIMATION_TIMING);
    }
    // Flip up for other
    else {
        animObject = clone.animate(moveCard(deltaX, deltaY, 'down', 'up'), ANIMATION_TIMING);
    }

    // Add event listener to `finish`
    animObject.addEventListener('finish', () => {
        // Replace old discard with new discard
        document.querySelector('#discard-container').replaceChildren(newDiscard);
        
        // Remove clone card
        clone.remove();
        
        // Remove original card container (and card) from hand
        cardContainer.remove();
        
        // Update hand score if given
        if (player === username) {
            document.querySelector('#' + player + '-hand-score').innerText = ' Hand Score: ' + handScore + ' ';
        }
    });
}

// Animating card from discard to hand
function animatePickup(cardStr, player, replaceDiscard, handScore) {
    console.log(`animate pickup called; card = ${cardStr}`);
    
    // Create card object and card container
    let pickupCard;
    let cardContainer;

    // Unknown card for non-self player
    if (cardStr === 'unknown') {
        pickupCard = createPlaceholderCard('unknown');
        // Set rotate to ensure card is face-down
        pickupCard.style.transform = `rotateY(0deg)`;
        
        // Create dummy card container
        cardContainer = document.createElement('div');
        cardContainer.className = 'card-container dummy-container';
    }

    // Known card for self player
    else {
        pickupCard = createCardObject(cardStr);
        
        // Set rotate to ensure card is face-up
        pickupCard.style.transform = `rotateY(180deg)`;
    
        // Create new card container
        cardContainer = document.createElement('div');
        cardContainer.className = 'card-container';
        // pickupCard.id === 'card-AS'
        cardContainer.id = pickupCard.id + '-container'
    }
    
    // Start hidden and become visible at end of animation
    pickupCard.style.visibility = 'hidden';

    // Add handler for card in hand
    pickupCard.addEventListener('click', handHandlerThirtyOne);

    // Add card to card container
    cardContainer.appendChild(pickupCard);

    // Add card container to hand container
    document.querySelector('#' + player + '-hand-container').appendChild(cardContainer);

    // Get animation start and end points by comparing discard and new card container

    const oldDiscard = document.querySelector('#discard-button');
    
    // Card will start at discard and move to hand
    // Starting position
    const discardRect = oldDiscard.getBoundingClientRect();
    const cardRect = pickupCard.getBoundingClientRect()
    
    // Calc movement distances - compare left and top
    let deltaX = discardRect.left - cardRect.left
    let deltaY = cardRect.top - discardRect.top
    
    // Use value of old discard to clone so it is visible even if picking up player
    // is not self
    const clone = oldDiscard.cloneNode(true);
    clone.classList.add('clone');
    // Change id of clone and any child nodes that have ids so no duplicate ids
    if (pickupCard.id) {
        clone.id = 'clone-' + pickupCard.id;
    }

    // clone.style.transform = `rotateY(180deg)`;
    // Card starts face-up by default; flip over to start face-down
    
    // Start face-up
    clone.style.transform = `rotateY(0deg)`;
    // Flip deltaX because - not sure why this is needed, I guess because rotate 180 was reversed
    deltaX = -deltaX

    clone.style.visibility = 'visible';
    
    // Add clone to DOM
    document.body.appendChild(clone);
    
    // Start clone at deck location
    clone.style.left = `${discardRect.left}px`;
    clone.style.top = `${discardRect.top}px`;
    clone.style.width = `${discardRect.width}px`;
    clone.style.height = `${discardRect.height}px`;
    clone.style.position = 'fixed';
    
    // Use '+=' to not overwrite existing transform properties
    // clone.style.transition += `transform ${ANIMATION_DURATION}s ${EASING_FUNCTION}`;

    // Change discard button to new discard
    // Create new card object to put in discard; get attributes from old card
    const newDiscard = setNewDiscard(replaceDiscard);
    
    document.querySelector('#discard-container').replaceChildren(newDiscard);

    // Set animation object to add `finish` event listener
    let animObject;

    // Keep face up for self
    if (player === username) {
        animObject = clone.animate(moveCard(deltaX, deltaY, 'up', 'up'), ANIMATION_TIMING);
    }
    // Flip down for other
    else {
        animObject = clone.animate(moveCard(deltaX, deltaY, 'up', 'down'), ANIMATION_TIMING);
    }

    animObject.addEventListener('finish', () => {
        // Reveal real card
        pickupCard.style.visibility = 'visible';
    
        // Remove clone card
        clone.remove();

        // Update hand score if self
        if (player === username) {
            document.querySelector('#' + player + '-hand-score').innerText = ' Hand Score: ' + handScore + ' ';
        }
    })
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
        document.querySelector('#' + playerName + '-hand-container').replaceChildren()

        // Loop hand size to add placeholders that display backs of cards
        for (let i = 0; i < response.hand_sizes[playerIndex]; i++) {

            const dummyCard = createPlaceholderCard('unknown');
            
            // Add dummy card to container
            const dummyContainer = document.createElement('div');
            dummyContainer.className = 'card-container dummy-container';

            dummyContainer.appendChild(dummyCard);

            document.querySelector('#' + playerName + '-hand-container').appendChild(dummyContainer);
        }
        // Remove hand score
        document.querySelector('#' + playerName + '-hand-score').innerText = '';
    }
}

// Setting discard card for 31
function updateDiscardNoAnimation(discardCard) {
    // Update discard - no animation
    
    // If no discard card, put in placeholder
    if ((!discardCard) || (discardCard.length === 0)) {
        // Replace existing discard with new one
        document.querySelector('#discard-container').replaceChildren(createPlaceholderCard('discard'))
    }

    else {
        // If discard exists, create new card object
        const discard = createCardObject(discardCard);
        
        // Set id to discard button
        discard.id = 'discard-button';
        
        // Set discard to send `pickup` action to server
        discard.addEventListener('click', discardHandler)
        
        // Replace existing discard with new one
        document.querySelector('#discard-container').replaceChildren(discard)
    }
}

// Set draw action for deck
var deckHandler = function deckOnClick(event) {

    if (mode === 'end_round' || mode === 'end_game'){
        console.log('Draw request not sent; Game not in progress.');
    }
    
    socket.emit('move', {'action': 'draw', 'room': currentRoom, 'username': username});
}

// Set discard action for card in hand
var handHandlerThirtyOne = function handOnClickThirtyOne(event) {
    
    // Disable input for card if end of round or non-self player
    if (mode === 'end_round' || mode === 'end_game') { // ||  username !== playerName) {
        return;
    }
    
    // card === `this` - send rank and suit to server
    console.log(`Requesting discard ${this.dataset.rank}${this.dataset.suit}`);
    socket.emit('move', {'action': 'discard', 'room': currentRoom, 'username': username, 'card': `${this.dataset.rank}${this.dataset.suit}`});
}

// Set pickup action for discard card
var discardHandler = function discardOnClick(event) {

    if (mode === 'end_round' || mode === 'end_game'){
        console.log('Discard request not sent; Game not in progress.');
    }

    socket.emit('move', {'action': 'pickup', 'room': currentRoom, 'username': username});
}

function updateThirtyOne(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
    }
    
    // Update board based on server response:

    // # Generic data
    // "game": "thirty_one",  # specifies game
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
    // "hand": [card.portable for card in self.players[player_name].hand],  # hand for self only
    // "hand_score": self.calc_hand_score(self.players[player_name]),  # hand score for self
    
    // "action_log": list of action log dicts for animation - 
    // lets client know the move made (discard, draw, etc.)
    // keys: ["action", "player", "card"]
    
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
        // the right order. Would run fillPlayerGrid to determine if player container
        // needs to be created or not
        if (playerOrder.length !== document.querySelectorAll('.player-container').length) {
            console.log('Calling fillPlayerGrid to create player containers');
            fillPlayerGrid(playerOrder, response.game);
        }

        // ?? Undetermined what is else is needed here; will wait
            // until further along in development
        // Iterate through player order to see if there are any missing players
        // for (let p = 0; p < playerOrder.length; p++) {
        //     if (playerOrder[p]) {

        //     }
        // }
    }


    // UPDATE CARDS before the rest of game state so animations can happen first
    // Run animation depending on response.action
    // The rest of the update will not wait until end of animation - must include all updates to cards 

    // Iterate through action log
    for (actionObject of response.action_log) {

        // May need to make multiple actions async so they don't happen simultaneously
        console.log(`Action = ${actionObject.action}, player = ${actionObject.player}, card = ${actionObject.card}`);
        
        
        // Start - empty client hand, deal the required cards
        // No action
        // client hand has cards from previous round,
        // Animate deal if action === 'start' (combination of `draw` animations)
        if (actionObject.action === 'deal') {
            
            // Iterate through player order to update all players' hands
            for (let playerIndex = 0; playerIndex < playerOrder.length; playerIndex++) {
                console.log(`Dealing for: ${playerOrder[playerIndex]}`);
                
                // Empty old hand to get ready for new hand - replaceChildren with no args
                document.querySelector('#' + playerOrder[playerIndex] + '-hand-container').replaceChildren();
            
                // Keep drawing until hand reaches hand size
                for (let cardIndex = 0; cardIndex < response.hand_sizes[playerIndex]; cardIndex++) {
                    
                    // For self player, use response.hand
                    if (playerOrder[playerIndex] === username) {
                        animateDraw(response.hand[cardIndex], playerOrder[playerIndex], response.hand_score);
                    }
                    // For non-self player, use unknown card
                    else {
                        animateDraw('unknown', playerOrder[playerIndex], response.hand_score);
                    }
                }
            }
            // Need to populate discard - eventually animate this by flipping from deck to discard
            const newDiscard = setNewDiscard(response.discard);
            document.querySelector('#discard-container').replaceChildren(newDiscard);
        }

        else if (actionObject.action === 'draw') {
            animateDraw(actionObject.card, actionObject.player, response.hand_score);
        }

        else if (actionObject.action === 'discard') {
            animateToDiscard(actionObject.player, response.discard, response.hand_score);
        }

        else if (actionObject.action === 'pickup') {
            animatePickup(actionObject.card, actionObject.player, response.discard, response.hand_score);
        }

        // TODO - Many options for animating end
        else if (actionObject.action === 'end') {
            // Server to send various actions: flipping cards, blitz, winner, KO
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

        // update discard outside of player loop
        updateDiscardNoAnimation(response.discard);
    }
    

    
    // Unpack general state
    // Must put current player update here since turn may increment on server side
    // Potentially animate changing current player
    currentPlayer = response.current_player;

    // Fill log
    for (const msg of response.log) {
        addToLog(msg, 'system');
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

    
    // Check for knocked out players
    // Display should only be reset when next round round starts. Server can wait to knock them out
    // Until beginning of next round
    for (const player of playersConnected) {
        if (!response.player_order.includes(player)) {
            // Replace lives with 'knocked out'
            document.querySelector('#' + player + '-lives').innerText = 'Knocked out';
            // Remove all cards
            document.querySelector('#' + player + '-hand-container').replaceChildren();
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

    // Loop player order to fill containers apart from cards
    for (let i = 0; i < playerOrder.length; i++) {
        
        console.log(`filling in player info: ${playerOrder[i]}`)

        // Once player array is populated, add to player panel display or dataset
        const playerContainer = document.querySelector('#' + playerOrder[i] + '-container');

        // Update order --- commenting out as this should be set when container is created in createPlayerContainerThirtyOne
        // playerContainer.dataset.order = i;
        
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
