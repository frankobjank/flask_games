from operator import attrgetter
import random

# Constants

# Ranks and ranks to value
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]

# Suits and unicode for suits
SUITS = ["spade", "heart", "diamond", "club"]

SUIT_TO_DISPLAY = {"spade": "\u2660", "heart": "\u2665", "diamond": "\u2666", "club": "\u2663"}

# Classes
class Card:
    def __init__(self, rank: str, suit: str, rank_to_value: dict[str, int]):
        self.rank: str = rank
        self.value: int = rank_to_value[self.rank]
        self.suit: str = suit
        self.suit_display: str = SUIT_TO_DISPLAY[self.suit]
        # Easier to store this value in the card rather than calc on-the-fly
        self.portable: str = self.zip_card()
    
    
    def __repr__(self) -> str:
        return f"Card({self.rank}, {self.suit})"
    
    
    def __str__(self) -> str:
        return f"{self.rank}{self.suit_display}"
    

    def zip_card(self):
        """Create portable string to send to client."""
        
        # Convert 10 to T to make all cards 2 chars long
        rank = self.rank
        if rank == "10":
            rank = "T"

        # returns 2S, 3C, AH, etc.
        return f"{rank}{self.suit[0].capitalize()}"
    

class Deck:
    def __init__(self, rank_to_value: dict[str, int]) -> None:
        self.unshuffled_cards = [Card(rank, suit, rank_to_value) for suit in SUITS for rank in RANKS]


    def __repr__(self) -> str:
        return f"Deck({self.unshuffled_cards})"


# Functions
def unzip_card(card_str: str) -> Card:
    """Decode portable string from client."""

    # Convert 10 to T to make all cards 2 chars long
    rank = card_str[0]
    if rank == "T":
        rank = "10"
    
    suit_letter = card_str[1].lower()
    suit = ""

    for s in SUITS:
        if suit_letter in s[0]:
            suit = s

    # returns 2S, 3C, AH, etc.
    return Card(rank, suit)


# Previously part of player class methods
def sort_hand(hand: list[Card]) -> list[Card]:
    """Sort hand in order of suit."""

    return sorted(sorted(hand, key=attrgetter("suit"), reverse=True), key=attrgetter("value"), reverse=True)


# Previously part of State class methods
def shuffle_deck(deck: Deck) -> list[Card]:
    cards_to_add = deck.unshuffled_cards.copy()

    shuffled_cards = []
    while len(cards_to_add) > 0:
        randindex = random.randint(0, len(cards_to_add)-1)
        shuffled_cards.append(cards_to_add.pop(randindex))
    
    return shuffled_cards


def draw_card(shuffled_cards: list[Card]) -> Card:
    return shuffled_cards.pop()


def deal(player_object, shuffled_cards, num_cards: int) -> None:
    """Deal starting hands."""

    for i in range(num_cards):
        player_object.hand.append(draw_card(shuffled_cards))
    player_object.hand = sort_hand(player_object.hand)


# Unicode suit reference
# ♠ \u2660 - black
# ♡ \u2661 
# ♢ \u2662
# ♣ \u2663 - green

# ♤ \u2664
# ♥ \u2665 - red
# ♦ \u2666 - blue
# ♧ \u2667

# Use all `filled in` emojis
# ♠ "\u2660" - black
# ♥ "\u2665" - red
# ♦ "\u2666" - blue
# ♣ "\u2663" - green

# Potentially for back of cards
# ★ \u2605 - solid star
# ☆ \u2606 - outlined star
