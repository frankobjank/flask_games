let allPlayers = ['self', 'other'];
let currentPlayer = '';
let turnNum = 0;

var testHandler = function eventTest(event) {
    console.log(`current target = ${event.currentTarget}`)
    console.log(`this = ${this}`)
    console.log(`this class = ${this.className}`)
};

function getCurrentPlayer(allPlayers, turnNum) {
    current = allPlayers[turnNum % allPlayers.length];
    
    // Turn current player's hand container green
    document.querySelectorAll('.hand-container').forEach((handContainer) => {
        if (handContainer.dataset.player === current) {
            handContainer.dataset.current = '1';
        }
        else {
            handContainer.dataset.current = '0';
        }
    })
    
    return current;
}

function endTurn() {
    turnNum += 1;
    currentPlayer = getCurrentPlayer(allPlayers, turnNum);
}

const SUITS = ['S', 'H', 'D', 'C'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUIT_TO_DISPLAY = {'S': '\u2660', 'H': '\u2665', 'D': '\u2666', 'C': '\u2663'}

// For animating draw/ discard
const EASING_FUNCTION = 'cubic-bezier(0.25, 1, 0.5, 1)';
const ANIMATION_DURATION = 2;

let allCards = []
let discardStack = []

// Fill deck
for (let i = 0; i < SUITS.length; i++) {
    for (let j = 0; j < RANKS.length; j++) {
        allCards.push(RANKS[j] + SUITS[i]);
    }
}

// Get random number for picking new card
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) + Math.ceil(min);
}

// Get new card from deck array
function getRandomCard() {
    // for demo all cards will have a value
    // for actual build, values of face-down cards will be unknown
    
    if (allCards.length === 0) {
        console.log('No cards');
        return;
    }

    // Structure of card object
    // Card container 
        // rotate container
            // card front
            // card back
    
    const randomIndex = getRandomInt(0, allCards.length - 1);
    const randomCard = allCards[randomIndex];
    // Remove card from possibles of allCards
    allCards.splice(randomIndex, 1);
    
    return buildCardObject(randomCard);
}

// Create outer rotating div and card-front + card-back divs
function buildCardObject(cardStr) {
    const rotateContainer = document.createElement('div');
    rotateContainer.className = 'rotate-card-container';
    // Assign id to outermost container
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
    cardBack.innerText = 'back';
    
    rotateContainer.appendChild(cardBack);

    return rotateContainer;
}

// Create outer rotating div and card-front + card-back divs
function buildPlaceholderCard(discard) {
    
    /* 
        <div class="rotate-card-container discard-card">
            <div class="playing-card card-front" ></div>
            <div class="playing-card card-back"></div>
        </div>
    */
    const rotateContainer = document.createElement('div');
    rotateContainer.className = 'rotate-card-container';
    if (discard) {
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


// 'Draw' 3 cards for each player
function deal() {
    // Deals a card and iterates through a turn
    for (let i = 0; i < 6; i++) {
        animateDraw(getRandomCard());
        endTurn();
    }
}


var discardHandler = function animateDiscard(event) {
    // `this` refers to `card`
    // Will have to find player by looking at grandparent node?
    console.log(`current target = ${event.currentTarget}`)
    console.log(`this = ${this}`)
    console.log(`this class = ${this.className}`)

    // Prevent deck and discard from having the effect placed on them
    if (this.id === 'deck' || this.classList.contains('discard-card')) {
        return;
    }
    
    const discard = document.querySelector('.discard-card');

    // Get starting position of card
    const cardRect = this.getBoundingClientRect();

    // Get discard position
    const discardRect = discard.getBoundingClientRect();

    // Calc movement distances - compare left and top
    const deltaX = discardRect.left - cardRect.left
    const deltaY = discardRect.top - cardRect.top

    // Create a clone to animate 
    // this prevents having to actually move the original card
    // function `cloneNode()` creates a copy of an object.
    // arg `true` means copy is a deep copy, i.e. it includes all node's descendants as well
    const clone = this.cloneNode(true);
    clone.classList.add('clone');
    // change id of clone so no duplicate ids
    clone.id = 'clone-' + clone.id;
    clone.querySelector('.card-back').innerText = 'clone';
    
    // Card starts face-up by default; flip over to start face-down
    // Start face-up for self players
    if (currentPlayer === 'self') {
        clone.style.transform = `rotateY(0deg)`;
    }
    // Start face-down for non-self players
    else {
        clone.style.transform = `rotateY(180deg)`;
    }

    document.body.appendChild(clone);
    
    // Start clone at card's dimensions - cloneNode doesn't copy these values
    clone.style.left = `${cardRect.left}px`;
    clone.style.top = `${cardRect.top}px`;
    clone.style.width = `${cardRect.width}px`;
    clone.style.height = `${cardRect.height}px`;
    clone.style.position = 'fixed';

    clone.style.transition = `transform ${ANIMATION_DURATION}s ${EASING_FUNCTION}`;

    // Hide original card
    this.style.visibility = 'hidden';

    // Built-in function for animation
    requestAnimationFrame(() => {
        clone.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    })

    // Waits until after animation (number of setTimeout must match number in transform)
    setTimeout(() => {
        // Remove clone card
        clone.remove();

        const discardContainer = document.querySelector('#discard-container');
        
        // If discard not is empty, remove card and push to stack
        if (discardContainer.querySelector('.discard-card').hasAttribute('data-suit')) {
            discardStack.push(discardContainer.removeChild(discardContainer.querySelector('.discard-card')));
        }
        else {
            // If discard is empty, remove placeholder card from discard container
            discardContainer.replaceChildren();
        }

        // Pop card from container in hand
        const cardRemoved = document.querySelector('#' + this.id + '-container').removeChild(this);
        
        // Remove old card container from DOM
        document.querySelector('#' + cardRemoved.id + '-container').remove();
        
        // Add card to discard container
        document.querySelector('#discard-container').appendChild(cardRemoved);
        cardRemoved.style.visibility = 'visible';
        
        // Add discard-card to classList
        cardRemoved.classList.add('discard-card');

        // Make sure card is face up
        cardRemoved.style.transform = 'rotateY(180deg)';

        // Remove discard handler from event listeners
        cardRemoved.removeEventListener('click', discardHandler);

        // Add onclick to animate pickup. Like draw, can go to current player
        cardRemoved.addEventListener('click', pickupHandler)

        // End turn at end of discard
        endTurn();

    // Multiply duration by 1000 for s -> ms conversion
    }, ANIMATION_DURATION * 1000);
}


var pickupHandler = function animatePickup(event) {
    console.log(`animate pickup called; card = ${this.id}`);
    
    const discardContainer = document.querySelector('#discard-container');
    // Pop card from discard
    const cardRemoved = discardContainer.removeChild(this);
    // Remove 'discard-card' from class list
    cardRemoved.classList.remove('discard-card');
    // Remove pickup event listener; new event is added later
    cardRemoved.removeEventListener('click', pickupHandler);
    
    // If stack is empty, add a placeholder to discard container
    if (discardStack.length === 0) {
        discardContainer.appendChild(buildPlaceholderCard(discard=true));
    }
    // If stack is not empty, pop last card and add to discard container
    else {
        discardContainer.appendChild(discardStack.pop());
    }
    
    // Start hidden and become visible at end of animation
    cardRemoved.style.visibility = 'hidden';
    
    // Create new card container in hand for new card
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    // Card.id = 'card-AS'
    cardContainer.id = cardRemoved.id + '-container'
    // Add card to card container
    cardContainer.appendChild(cardRemoved);

    // Add card container to hand container
    document.querySelector('#' + currentPlayer + '-hand-container').appendChild(cardContainer);

    // Add discard handler
    cardRemoved.addEventListener('click', discardHandler);

    // Get end positions by comparing deck and new card container

    // Card will start at deck and move to hand
    // Starting position
    const discardRect = document.querySelector('.discard-card').getBoundingClientRect();

    const cardRect = cardRemoved.getBoundingClientRect()

    // Calc movement distances - compare left and top
    let deltaX = discardRect.left - cardRect.left
    let deltaY = cardRect.top - discardRect.top

    // Create a clone to animate
    // this prevents having to actually move the original card
    // arg `true` means copy is a deep copy, i.e. it includes all node's descendants as well
    const clone = cardRemoved.cloneNode(true);
    clone.classList.add('clone');
    // Change id of clone and any child nodes that have ids so no duplicate ids
    clone.id = 'clone-' + cardRemoved.id;
    clone.querySelector('.card-back').innerText = 'clone';
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
    clone.style.transition += `transform ${ANIMATION_DURATION}s ${EASING_FUNCTION}`;
    
    // Clean up rotation states while card is invisible so that animation ends correctly
    if (currentPlayer === 'self') {
        cardRemoved.style.transform = `rotateY(180deg)`;
    }
    else if (currentPlayer === 'other') {
        cardRemoved.style.transform = `rotateY(0deg)`;
    }
    
    // Built-in function for animating
    requestAnimationFrame(() => {
        clone.style.transform += `translate(${deltaX}px, ${deltaY}px)`;
        // Card starts face-down by default; flip over to start face-up
        
        // Add flip to be face-up for self
        if (currentPlayer === 'self') {
            clone.style.transform += `rotateY(0deg)`;
        }
        else {
            clone.style.transform += `rotateY(180deg)`;
        }
    })

    // Waits until after animation (number of setTimeout must match number in transform)
    setTimeout(() => {
        // Reveal real card
        cardRemoved.style.visibility = 'visible';

        // Remove clone card
        clone.remove();

        
    // Multiply duration by 1000 for s -> ms conversion
    }, ANIMATION_DURATION * 1000);
}

// Wait until content is loaded to deal and add onclicks
document.addEventListener('DOMContentLoaded', () => {
    currentPlayer = getCurrentPlayer(allPlayers, turnNum);
    deal();

    // Add onclick for deck
    document.querySelector('#deck').onclick = () => animateDraw();
})

// Animation of deck to self (end face up) or other (end face down)
function animateDraw() {

    // use currentPlayer for player
    const card = getRandomCard();

    // Start hidden and become visible at end of animation
    card.style.visibility = 'hidden';
    
    // Create new card container in hand for new card
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    // Card.id = 'card-AS'
    cardContainer.id = card.id + '-container'
    // Add card to card container
    cardContainer.appendChild(card);

    // Add card container to hand container
    document.querySelector('#' + currentPlayer + '-hand-container').appendChild(cardContainer);

    // Add discard handler as click listener event
    card.addEventListener('click', discardHandler);

    // If other, make sure card is face down by keeping card in original face-down orientation
    if (currentPlayer === 'other') {
        card.style.transform += `rotateY(0deg)`;
    }
    
    // Get end positions by comparing deck and new card container

    // Card will start at deck and move to hand
    // Starting position
    const deckRect = document.querySelector('#deck-container').getBoundingClientRect();

    const cardRect = card.getBoundingClientRect()

    // Calc movement distances - compare left and top
    const deltaX = deckRect.left - cardRect.left
    const deltaY = cardRect.top - deckRect.top

    // Create a clone to animate
    // this prevents having to actually move the original card
    // arg `true` means copy is a deep copy, i.e. it includes all node's descendants as well
    const clone = card.cloneNode(true);
    clone.classList.add('clone');
    // Change id of clone and any child nodes that have ids so no duplicate ids
    clone.id = 'clone-' + card.id;
    clone.querySelector('.card-back').innerText = 'clone';
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

    // Use '+=' to not overwrite existing transform properties
    clone.style.transition += `transform ${ANIMATION_DURATION}s ${EASING_FUNCTION}`;

    // Built-in function for animating
    requestAnimationFrame(() => {
        clone.style.transform += `translate(${deltaX}px, ${deltaY}px)`;
        
        // Add flip to be face-up for self
        if (currentPlayer === 'self') {
            clone.style.transform += `rotateY(180deg)`;
        }
    })

    // Waits until after animation (number of setTimeout must match number in transform)
    setTimeout(() => {
        // Reveal real card
        card.style.visibility = 'visible';

        // Remove clone card
        clone.remove();

    // Multiply duration by 1000 for s -> ms conversion
    }, ANIMATION_DURATION * 1000);
}