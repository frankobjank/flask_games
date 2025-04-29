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

function createMoveButtonsThirtyOne() {
    // Only need `discard` or `confirm discard` button
        // + Continue Round and New Game buttons
    
    // Discard can be considered temp button since it can be hidden on non-discard modes

    const moveButtonsContainer = document.createElement('div');
    moveButtonsContainer.id = 'move-button-container';

    // Removed intermediate container (from 31)
    // const drawPickupKnockContainer = document.createElement('div');
    // drawPickupKnockContainer.className = 'button-container';
    // drawPickupKnockContainer.id = 'draw-pickup-knock-container';
    
    // Add discard confirm button
    const discardConfirm = document.createElement('button');
    discardConfirm.className = 'move-button';
    discardConfirm.id = 'discard-confirm-button';
    discardConfirm.innerText = 'Confirm discard';
    
    discardConfirm.onclick = () => {
        // Get all cards staged for discard
        const chosenCards = document.querySelectorAll('staged-for-discard');
        
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
