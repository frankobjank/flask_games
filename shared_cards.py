import random
from operator import attrgetter
from enum import Enum

# Try using decorators for inheriting functions


class Player:
    def __init__(self, name="") -> None:
        self.name = name
        self.order = 0
        self.hand = []
        self.score = 0
    
    
    def __repr__(self) -> str:
        return self.name

    
    def sort_hand(self) -> None:
        # self.hand = sorted(sorted(self.hand, key=attrgetter("value"), reverse=True), key=attrgetter("suit"), reverse=True)
        self.hand = sorted(sorted(self.hand, key=attrgetter("suit"), reverse=True), key=attrgetter("value"), reverse=True)
    

    def zip_hand(self):
        """Convert hand to portable strings to send to client."""
        
        cards = []
        for c in self.hand:
            cards.append(c.zip_self())
        
        return cards


class Card:
    def __init__(self, rank: str, value: int, suit: str, suit_display: str):
        self.rank = rank
        self.value = value
        self.suit = suit
        self.suit_display = suit_display
    
    
    def __str__(self) -> str:
        return f"{self.rank}{self.suit_display}"
    

    def zip_self(self):
        """Create portable string to send to client."""
        
        # Convert 10 to T to make all cards 2 chars long
        rank = self.rank
        if rank == "10":
            rank = "T"

        # returns 2S, 3C, AH, etc.
        return f"{rank}{self.suit[0].capitalize()}"


class Deck:
    def __init__(self, ace_value) -> None:
        self.unshuffled_cards = []
        self.shuffled_cards = []
        self.ace_value = ace_value

        ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
        cardtype_to_value = {"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10, "A": self.ace_value}
        suits = ["spade", "heart", "diamond", "club"]
        suit_to_display = {"spade": "\u2664", "heart": "\u2665", "diamond": "\u2666", "club": "\u2667"}

        self.unshuffled_cards = [Card(rank, cardtype_to_value[rank], suit, suit_to_display[suit]) for suit in suits for rank in ranks]
        # print("\u2660") ♠
        # print("\u2661") ♡
        # print("\u2662") ♢
        # print("\u2663") ♣
        # print("\u2664") ♤
        # print("\u2665") ♥
        # print("\u2666") ♦
        # print("\u2667") ♧

    def __str__(self) -> str:
        return f"Deck({self.shuffled_cards})"

# counted as one "hand" (i.e. one cycle of turns before needing to shuffle again)
class Round:
    def __init__(self, player_order, num=0) -> None:
        self.round_num = num
        # current player and turn_num could be considered turn attributes but doesn't merit another class
        self.turn_num = 0
        
        if len(player_order) > 0:
            # increment first player and set dealer
            first_player_index = ((num)-1) % len(player_order)
            self.first_player = player_order[first_player_index]
            self.current_player = player_order[first_player_index]
            self.dealer = player_order[first_player_index-1]

    def set_dealer(self, player_order):
        if len(player_order) == 0:
            return
        # increment first player and set dealer
        first_player_index = ((num)-1) % len(player_order)
        self.first_player = player_order[first_player_index]
        self.current_player = player_order[first_player_index]
        self.dealer = player_order[first_player_index-1]


class State:
    def __init__(self, ace_value: int, hand_size: int, max_players: int) -> None:
        # Game pieces
        self.deck = Deck(ace_value)
        self.hand_size = hand_size
        self.max_players = max_players
        self.players = {}
        self.player_order = []  # static

        # Gameplay
        self.in_progress = False
        self.log = []
        
        # round.num defaults to 0 and increments on subsequent rounds
        self.round = Round(self.player_order)


    def shuffle_deck(self) -> list:
        shuffled_cards = []
        cards_to_add = self.deck.unshuffled_cards.copy()

        while len(cards_to_add) > 0:
            randindex = random.randint(0, len(cards_to_add)-1)
            shuffled_cards.append(cards_to_add.pop(randindex))
        
        assert len(self.deck.unshuffled_cards) == 52, "This list,j should remain unchanged."

        return shuffled_cards

    def draw_card(self) -> Card:
        return self.deck.shuffled_cards.pop()

    def add_card_to_hand(self, player_object: Player) -> None:
        player_object.hand.append(self.draw_card())
        player_object.sort_hand()

    def deal(self, player_object: Player) -> None:
        for i in range(self.hand_size):
            self.add_card_to_hand(player_object)

    def set_player_order(self, override=[]) -> None:
        if len(override) == 0:
            self.player_order = [p_name for p_name in self.players.keys()]
        else:
            self.player_order = override

    def add_players(self, num_players: int) -> None:
        # name is stored as integer (order added)
        for i in range(num_players):
            self.players[i] = Player()

    def set_player_name(self, p_name, p_object, name_input):
        p_object.order = p_name
        # change name from integer to chosen name
        p_object.name = name_input
        self.players[name_input] = self.players.pop(p_name)
        print(f"Welcome {name_input}")


    def new_game(self) -> None:
        self.players = {}
        self.player_order = []
        self.round = Round(self.player_order)

    def new_round(self, custom_round=False) -> None:
        if not custom_round:
            self.round = Round(self.player_order, self.round.num+1)
            
        self.deck.shuffled_cards = self.shuffle_deck()
        for p_object in self.players.values():
            p_object.hand = []
            self.deal(p_object)

