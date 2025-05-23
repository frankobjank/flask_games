// Associate unicode suit character with the letter S, H, D, or C
const SUIT_TO_DISPLAY = {'S': '\u2660', 'H': '\u2665', 'D': '\u2666', 'C': '\u2663'}
/*
    '\u2660': ♠, black
    '\u2665': ♥, red
    '\u2666': ♦, blue
    '\u2663': ♣, green
*/

// Create outer rotating div and card-front + card-back divs
function createCardObject(cardStr) {
    // cardStr = 'KS', 'QH', 'TD', '9C', ...

    const rotateContainer = document.createElement('div');
    rotateContainer.className = 'rotate-card-container';
    
    // Assign id to outermost container
    // Preface with -card so id doesn't start with number
    rotateContainer.id = 'card-' + cardStr;

    const cardFront = document.createElement('div');
    cardFront.className = 'playing-card card-front';
    
    // Get rank with first char of cardStr
    const rank = cardStr[0]
    // Get suit with last char of cardStr
    const suit = cardStr[cardStr.length - 1];
    // Add to card's dataset
    rotateContainer.dataset.rank = rank;
    rotateContainer.dataset.suit = suit;

    // For display - check if rank is T; set to 10
    let displayRank = rank;
    if (displayRank === 'T') {
        displayRank = '10';
    }

    // Set display for card
    cardFront.innerText = `${displayRank}${SUIT_TO_DISPLAY[suit]}`;
    
    rotateContainer.appendChild(cardFront);
    
    const cardBack = document.createElement('div');
    cardBack.className = 'playing-card card-back';
    
    rotateContainer.appendChild(cardBack);

    return rotateContainer;
}

// Create outer rotating div and card-front + card-back divs
function createPlaceholderCard(kind) {
    
    /* 
        Structure of a placeholder card
        
        <div class="rotate-card-container" id="discard-button">
            <div class="playing-card card-front" ></div>
            <div class="playing-card card-back"></div>
        </div>
    */
    const rotateContainer = document.createElement('div');
    rotateContainer.className = 'rotate-card-container placeholder-card';
    
    // Set identifying features depending on `kind`: discard, deck, etc.
    if (kind === 'discard') {
        rotateContainer.id = 'discard-button';
    }
    else if (kind === 'deck') {
        rotateContainer.id = 'deck-button';
    }
    else if (kind === 'unknown') {
        // Set card to be face-down
        rotateContainer.style.transform += `rotateY(0deg)`;
    }

    const cardFront = document.createElement('div');
    cardFront.className = 'playing-card card-front';
    
    // Set display to a single space to make sure div fills up
    cardFront.innerText = ' ';
    
    rotateContainer.appendChild(cardFront);
    
    const cardBack = document.createElement('div');
    cardBack.className = 'playing-card card-back';
    
    rotateContainer.appendChild(cardBack);

    return rotateContainer;
}

// Defining keyframes in js for moving card
function moveCard(deltaX, deltaY, faceStart, faceEnd) {
    // Degrees based on whether card is face up or face down
    let degStart;
    let degEnd;

    // Choose rotate state based on whether card starts face up or face down
    switch (faceStart) {
        // Start at 0 deg for face-up card
        case 'up':
            degStart = '0';
            break;
        // Start at 180 deg for face-down
        case 'down':
            degStart = '180'
            break;
    }

    // Same options as faceStart, could put in array but only 2 cases
    switch (faceEnd) {
        case 'up':
            degEnd = '0';
            break;
        case 'down':
            degEnd = '180'
            break;
    }

    return [
        // Starting keyframe
        { transform: `translate(0, 0) rotateY(${degStart}deg)` },
        // Ending keyframe
        { transform: `translate(${deltaX}px, ${deltaY}px) rotateY(${degEnd}deg)` }
    ];
};