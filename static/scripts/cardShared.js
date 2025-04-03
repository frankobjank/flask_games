// Associate unicode suit character with the letter S, H, D, or C
const SUIT_TO_DISPLAY = {'S': '\u2660', 'H': '\u2665', 'D': '\u2666', 'C': '\u2663'}
/*
    '\u2660': ♠, black
    '\u2665': ♥, red
    '\u2666': ♦, blue
    '\u2663': ♣, green
*/

// Create outer rotating div and card-front + card-back divs
function buildCardObject(cardStr) {
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
function buildPlaceholderCard(kind) {
    
    /* 
        Structure of a placeholder card
        
        <div class="rotate-card-container discard-card">
            <div class="playing-card card-front" ></div>
            <div class="playing-card card-back"></div>
        </div>
    */
    const rotateContainer = document.createElement('div');
    rotateContainer.className = 'rotate-card-container';
    if (kind === 'discard') {
        rotateContainer.classList.add('discard-card');
    }

    const cardFront = document.createElement('div');
    cardFront.className = 'playing-card card-front';
    
    // Set display to a single space
    cardFront.innerText = ' ';
    
    rotateContainer.appendChild(cardFront);
    
    const cardBack = document.createElement('div');
    cardBack.className = 'playing-card card-back';
    
    rotateContainer.appendChild(cardBack);

    return rotateContainer;
}
