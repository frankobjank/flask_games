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
