from operator import attrgetter
import random

# Constants

# Ranks - 10 is `T` here so it can be represented by a single character
# Values determined by rank_to_value lookup specific to each game.
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]

# Suits and unicode for suits
SUITS = ["spade", "heart", "diamond", "club"]
SUIT_TO_DISPLAY = {"spade": "\u2660", "heart": "\u2665", "diamond": "\u2666", "club": "\u2663"}


# Classes
class Card:
    def __init__(self, rank: str, suit: str, value: int):
        self.rank: str = rank
        self.value: int = value
        self.suit: str = suit
        self.suit_display: str = SUIT_TO_DISPLAY[self.suit]
        # Value used when passed between server and client. Examples: AH, 3S, TC ...
        self.portable: str = f"{rank}{self.suit[0].capitalize()}"
    
    
    def __repr__(self) -> str:
        return f"Card({self.rank}, {self.suit}, {self.value})"
    
    
    def __str__(self) -> str:
        return f"{self.rank}{self.suit_display}"
    

class Deck:
    def __init__(self, rank_to_value: dict[str, int]) -> None:
        self.unshuffled_cards = [Card(rank, suit, rank_to_value[rank]) for suit in SUITS for rank in RANKS]


    def __repr__(self) -> str:
        return f"Deck({self.unshuffled_cards})"


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
