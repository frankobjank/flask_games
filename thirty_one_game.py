from operator import attrgetter
import random


# Global constants
ACE_VALUE = 11

# Ranks and ranks to value
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
RANK_TO_VALUE = {"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10, "A": ACE_VALUE}

# Suits and unicode for suits
SUITS = ["spade", "heart", "diamond", "club"]
SUIT_TO_DISPLAY = {"spade": "\u2664", "heart": "\u2665", "diamond": "\u2666", "club": "\u2667"}


class Player:
    def __init__(self, name="") -> None:
        self.name = name
        self.order = 0
        self.hand = []
        
        # Score starts at 3
        self.lives = 3
    
    
    def __repr__(self) -> str:
        return f"{Player(self.name)}"

    
    def sort_hand(self) -> None:
        """Sort hand in order of suit."""

        self.hand = sorted(sorted(self.hand, key=attrgetter("suit"), reverse=True), key=attrgetter("value"), reverse=True)
    

    def zip_hand(self):
        """Convert hand to portable strings to send to client."""
        
        cards = []
        for c in self.hand:
            cards.append(c.zip_card())
        
        return cards
    

class Card:
    def __init__(self, rank: str, suit: str):
        self.rank = rank
        self.value = RANK_TO_VALUE[self.rank]
        self.suit = suit
        self.suit_display = SUIT_TO_DISPLAY[self.suit]
    
    
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
    def __init__(self) -> None:
        self.unshuffled_cards = [Card(rank, suit) for suit in SUITS for rank in RANKS]


    def __repr__(self) -> str:
        return f"Deck({self.unshuffled_cards})"


class State:
    def __init__(self, room_name) -> None:
        
        # modes : start, add_players, main_phase, discard 
            # HANDLE THESE MODES internally instead: end_turn, end_round, end_game

        # Room
        self.room_name = room_name
        
        # Room constants
        self.MAX_PLAYERS = 7
        self.MIN_PLAYERS = 2

        # Game pieces
        self.deck = Deck()
        self.shuffled_cards = []
        self.hand_size = 3
        self.players = {}
        self.player_order = []  # static
        self.dead_players = {}  # I think this can be removed without any consequences

        # Gameplay
        self.mode = "start"
        self.in_progress = False
        self.log = []

        # Rounds
        self.round_num = 0
        self.turn_num = 0
        self.first_player = ""  # player name
        self.current_player = ""  # player name
        self.dealer = ""  # player name
        self.knocked = ""  # player name
        self.discard = []
        self.free_ride_alts = ["getting a free ride", "on the bike", "on the dole", "riding the bus", "barely hanging on", "having a tummy ache", "having a long day"]
        

    def shuffle_deck(self) -> list:
        cards_to_add = self.deck.unshuffled_cards.copy()

        while len(cards_to_add) > 0:
            randindex = random.randint(0, len(cards_to_add)-1)
            self.shuffled_cards.append(cards_to_add.pop(randindex))


    def draw_card(self) -> Card:
        return self.shuffled_cards.pop()


    def deal(self, player_object: Player) -> None:
        """Deal starting hands."""

        for i in range(self.hand_size):
            player_object.hand.append(self.draw_card())
        player_object.sort_hand()


    def calc_hand_score(self, player_object:Player) -> int:
        hand_scores = {}
        for card in player_object.hand:
            if card.suit not in hand_scores.keys():
                hand_scores[card.suit] = 0
            hand_scores[card.suit] += card.value
        return max(hand_scores.values())


    def add_player(self, name) -> None:
        self.players[name] = Player(name)


    def start_game(self) -> None:
        # Initial setup
        assert self.round_num == 0, "Round number must be 0."

        # Check number of players
        if not (self.MIN_PLAYERS <= len(self.players) <= self.MAX_PLAYERS):
            return "Need between 2 and 7 players to begin."
        
        # Set player order - eventually should be random
        self.player_order = [p_name for p_name in self.players.keys()]

        # Set in progress to True
        self.in_progress = True

        self.new_round()


    def new_round(self) -> None:

        assert len(self.player_order) != 0, "Player order must be set before round begins"
        
        self.round_num += 1
        self.turn_num = 0
            
        # Calculate new first player index based on round number
        first_player_index = ((self.round_num)-1) % len(self.player_order)
        
        # Set dealer, first player, current player
        self.first_player = self.player_order[first_player_index]
        self.current_player = self.player_order[first_player_index]
        self.dealer = self.player_order[first_player_index-1]

        # Shuffle cards
        self.shuffle_deck()
        
        # Reset each player's hand and deal new hand
        for p_object in self.players.values():
            p_object.hand = []
            self.deal(p_object)

        # Set a discard card; reset knocked
        self.discard = [self.draw_card()]
        self.knocked = ""
        
        print(f"\n--- ROUND {self.round_num} ---\n")
        self.log.append(f"\n--- ROUND {self.round_num} ---\n")
        print("\n--- DEALING ---")
        self.log.append("\n--- DEALING ---")

        # Move on to turn
        self.start_turn()


    def end_round(self):
        # scenarios - win doesn't actually matter, just display who knocked and loser
            # BLITZ - everyone except highest loses a life
            # tie for loser - display knocked; no one loses
            # 1 loser - display one who knocked and one who lost
            # 1 loser AND loser knocked - loser loses 2 points
        
        print(f"--- END OF ROUND {self.round_num} ---\n")
        print("---     SCORES     ---\n")
        
        if self.check_for_blitz():
            for player in self.player_order:
                if player != self.current_player:
                    print(f"{player} loses 1 extra life.")
                    self.players[player].lives -= 1
        else:
            hand_scores = [self.calc_hand_score(p_object) for p_object in self.players.values()]
            lowest_hand_score = min(hand_scores)

            if hand_scores.count(lowest_hand_score) > 1:
                print("Tie for last place, no change in score.")
            else:
                lowest_hand_score_player = ""
                for p_object in self.players.values():
                    if self.calc_hand_score(p_object) == lowest_hand_score:
                        lowest_hand_score_player = p_object.name
                        
                if lowest_hand_score_player != self.knocked:
                    print(f"{lowest_hand_score_player} loses 1 extra life.")
                    self.log.append(f"{lowest_hand_score_player} loses 1 extra life.")
                    self.players[lowest_hand_score_player].lives -= 1
                else:
                    print(f"{lowest_hand_score_player} knocked but had the lowest score.\n{lowest_hand_score_player} loses 2 extra lives.")
                    self.log.append(f"{lowest_hand_score_player} knocked but had the lowest score.\n{lowest_hand_score_player} loses 2 extra lives.")
                    self.players[lowest_hand_score_player].lives -= 2
        
        knocked_out = [p_name for p_name, p_object in self.players.items() if 0 > p_object.lives]
        
        for p_name in knocked_out:
            self.log.append(f"{p_name} has been knocked out.")
            self.dead_players[p_name] = self.players.pop(p_name)
            
            # The only time player_order must be changed
            self.player_order.remove(p_name)

        if len(self.players) == 1:
            winner = [p for p in self.players.keys()][0]
            print(f"\n{winner} wins!")
            self.log.append(f"\n{winner} wins!")
            self.in_progress = False

        else:
            print("\nRemaining Players' Extra Lives:")
            self.log.append("\nRemaining Players' Extra Lives:")
            for p_name, p_object in self.players.items():
                print(f"{p_name} - {p_object.lives} extra lives")
                self.log.append(f"{p_name} - {p_object.lives} extra lives")
                if p_object.lives == 0:
                    self.log.append(f"{p_name} is {self.free_ride_alts[random.randint(0, len(self.free_ride_alts)-1)]}")
                    print(f"{p_name} is {self.free_ride_alts[random.randint(0, len(self.free_ride_alts)-1)]}")


    def start_turn(self):
        # Increment turn number
        self.turn_num += 1

        # Set mode to main phase
        self.mode = "main_phase"

        # Add to log to print in client
        self.log.append(f"It is {self.current_player}'s turn.")


    def end_turn(self):
        # Calculate new current player
        self.current_player = self.player_order[((self.turn_num + ((self.round_num-1) % len(self.player_order))) % len(self.player_order))]
        
        # If new current player has knocked, round should end
        if self.current_player == self.knocked:
            self.end_round()


    def reset_game(self) -> None:
        # Players will not need to be reset every game
        self.player_order = []
        self.round_num = 0
        self.dead_players = {}


    def check_for_blitz(self):
        return self.calc_hand_score(self.players[self.current_player]) == 31


    def update(self, packet: dict):
        # actions: start, add_player, draw, pickup, knock, discard, new_game, quit
        # Assuming packet is coming from current player; validate before this is called

        if not self.in_progress:
            if packet["action"] == "start":
                self.start_game()


        elif self.mode == "main_phase":
            taken_card = None
            if packet["action"] == "knock":
                if len(self.knocked) > 0:
                    print(f"{self.knocked} has already knocked. You must pick a different move.")
                    return
                self.knocked = self.current_player
                print(f"{self.current_player} has knocked.")
                self.log.append(f"{self.current_player} knocked.")
                self.end_turn()
                return

            elif packet["action"] == "pickup":
                # convert to str here for type consistency
                taken_card = self.discard.pop()
                print(f"\nYou pick up a {taken_card} from discard.")
                self.log.append(f"{self.current_player} picked up a {taken_card} from discard.")

            elif packet["action"] == "draw":
                taken_card = self.draw_card()
                print(f"\nYou draw: {taken_card}.")
                self.log.append(f"{self.current_player} drew a card from the deck.")
            
            self.players[self.current_player].hand.append(taken_card)
            self.mode = "discard"

            if self.check_for_blitz():
                print(f"{self.current_player} BLITZED!!!")
                self.end_round()


        elif self.mode == "discard" and packet["action"] == "discard":
            # Unzip from client
            chosen_card = unzip_card(packet["card"])
            
            # Remove from hand
            self.players[self.current_player].hand.remove(chosen_card)
            
            # Add to discard
            self.discard.append(chosen_card)
            self.log.append(f"{self.current_player} discarded: {chosen_card}")
            
            self.end_turn()  


    # Have two package state functions - one for general and one for specific player info
    def package_state(self, player_name) -> dict:
        
        assert self.in_progress, "Only call once game has started"

        # Get discard card
        discard_card = None
        if len(self.discard) > 0:
            discard_card = self.discard[-1].zip_card()

        # Build lists in order of player_order to make sure they're unpacked correctly
        hand_sizes = []
        lives = []

        for p_name in self.player_order:
            hand_sizes.append(len(self.players[p_name].hand))
            lives.append(self.players[p_name].lives)
            
        # All data the client needs from server
        return {
            # Generic data
            "action": "update_board",  # for client to know what type of update this is
            "room": self.room_name,  # name of room
            "player_order": self.player_order,  # list of player names in order
            "current_player": self.current_player,  # current player's name
            "discard": discard_card,  # top card of discard pile
            "mode": self.mode,  # current game mode - might help restrict inputs on client side
            "hand_sizes": hand_sizes,  # number of cards in each players' hands
            "lives": lives,  # remaining lives of all players
            
            # Specific to player
            "hand": self.players[player_name].zip_hand(),  # hand for self only
            "hand_score": self.calc_hand_score(self.players[player_name]),  # hand score for self
        }
    

def unzip_card(self, card_str: str) -> Card:
    """Decode portable string from client."""
    assert len(card_str) == 2, f"Incorrect card data `{card_str}`"
    
    # Convert 10 to T to make all cards 2 chars long
    rank = card_str[0]
    if rank == "T":
        rank = "10"
    
    suit_letter = card_str[1].lower()
    suit = ""

    for s in SUITS:
        if suit_letter in s:
            suit = s


    # returns 2S, 3C, AH, etc.
    return Card(rank, suit)