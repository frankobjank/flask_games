from operator import attrgetter
import random

class Player:
    def __init__(self, name="") -> None:
        self.name = name
        self.order = 0
        self.hand = []
        self.score = 0
    
    
    def __repr__(self) -> str:
        return f"{Player(self.name)}"

    
    def sort_hand(self) -> None:
        """Sort hand in order of suit."""

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


    def __str__(self) -> str:
        return f"Deck({self.shuffled_cards})"


class State:
    def __init__(self, ace_value=11, hand_size=3, max_players=7) -> None:
        
        # modes : start, add_players, main_phase, discard 
            # HANDLE THESE MODES internally instead: end_turn, end_round, end_game
        
        # Game pieces
        self.deck = Deck(ace_value)
        self.hand_size = hand_size
        self.max_players = max_players
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

        # Websocket id
        self.sid = ""

        

    def shuffle_deck(self) -> list:
        shuffled_cards = []
        cards_to_add = self.deck.unshuffled_cards.copy()

        while len(cards_to_add) > 0:
            randindex = random.randint(0, len(cards_to_add)-1)
            shuffled_cards.append(cards_to_add.pop(randindex))
        
        assert len(self.deck.unshuffled_cards) == 52, "This list should remain unchanged."

        return shuffled_cards


    def draw_card(self) -> Card:
        return self.deck.shuffled_cards.pop()


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


    def reset_game(self) -> None:
        # Players will not need to be reset every game
        self.player_order = []
        self.round_num = 0
        self.dead_players = {}


    def start_game(self) -> None:
        # Initial setup
        assert self.round_num == 0, "Round number must be 0."

        # Check number of players
        if not (2 <= len(self.players) <= 7):
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
            
        # Set dealer, first player of round
        first_player_index = ((self.round_num)-1) % len(self.player_order)
        self.first_player = self.player_order[first_player_index]
        self.current_player = self.player_order[first_player_index]
        self.dealer = self.player_order[first_player_index-1]

        # Shuffle cards
        self.deck.shuffled_cards = self.shuffle_deck()
        
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
                if player != self.round.current_player:
                    print(f"{player} loses 1 extra life.")
                    self.players[player].score -= 1
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
                    self.players[lowest_hand_score_player].score -= 1
                else:
                    print(f"{lowest_hand_score_player} knocked but had the lowest score.\n{lowest_hand_score_player} loses 2 extra lives.")
                    self.log.append(f"{lowest_hand_score_player} knocked but had the lowest score.\n{lowest_hand_score_player} loses 2 extra lives.")
                    self.players[lowest_hand_score_player].score -= 2
        
        knocked_out = [p_name for p_name, p_object in self.players.items() if 0 > p_object.score]
        
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
                print(f"{p_name} - {p_object.score} extra lives")
                self.log.append(f"{p_name} - {p_object.score} extra lives")
                if p_object.score == 0:
                    self.log.append(f"{p_name} is {self.free_ride_alts[random.randint(0, len(self.free_ride_alts)-1)]}")
                    print(f"{p_name} is {self.free_ride_alts[random.randint(0, len(self.free_ride_alts)-1)]}")


    def start_turn(self):
        # Increment turn number
        self.turn_num += 1

        # Set mode to main phase
        self.mode = "main_phase"

        # Add to log to print in client
        self.log.append(f"It is {self.round.current_player}'s turn.")


    def end_turn(self):
        # Calculate new current player
        self.current_player = self.player_order[((self.turn_num + ((self.round_num-1) % len(self.player_order))) % len(self.player_order))]
        
        # If new current player has knocked, round should end
        if self.current_player == self.knocked:
            self.end_round()


    def check_for_blitz(self):
        return self.calc_hand_score(self.players[self.round.current_player]) == 31


    def update(self, packet: dict):
        # actions: start, add_player, draw, pickup, knock, discard, new_game, quit
        
        if self.mode == "start":
            self.add_players(num_players=int(packet["msg"]))
            for p_object in self.players.values():
                
                # Score starts at 3
                p_object.score += 3

            self.mode = "add_player"

        elif self.mode == "add_player" and packet["action"] == "add_player":


            if all(isinstance(p_name, str) for p_name in self.players.keys()):
                # set_player_order only needs to happen once per game
                self.set_player_order()
                self.start_round()

        elif self.mode == "main_phase":
            taken_card = None
            if packet["action"] == "knock":
                if len(self.knocked) > 0:
                    print(f"{self.knocked} has already knocked. You must pick a different move.")
                    return
                self.knocked = self.round.current_player
                print(f"{self.round.current_player} has knocked.")
                self.log.append(f"{self.round.current_player} knocked.")
                self.end_turn()
                return

            elif packet["action"] == "pickup":
                # convert to str here for type consistency
                taken_card = self.discard.pop()
                print(f"\nYou pick up a {taken_card} from discard.")
                self.log.append(f"{self.round.current_player} picked up a {taken_card} from discard.")

            elif packet["action"] == "draw":
                taken_card = self.draw_card()
                print(f"\nYou draw: {taken_card}.")
                self.log.append(f"{self.round.current_player} drew a card from the deck.")
            
            self.players[self.round.current_player].hand.append(taken_card)
            self.mode = "discard"

            if self.check_for_blitz():
                print(f"{self.round.current_player} BLITZED!!!")
                self.end_round()

        elif self.mode == "discard" and packet["action"] == "discard":
            discarded_card = self.players[self.round.current_player].hand.pop(int(packet["msg"])-1)
            self.discard.append(discarded_card)
            self.log.append(f"{self.round.current_player} discarded: {discarded_card}")
            self.end_turn()
        
    
    def package_state(self, player_name) -> dict:

        # Get discard card
        discard_card = None
        if len(self.discard) > 0:
            discard_card = self.discard[-1].zip_self()

        # All data the client needs from server
        return {
            "username": player_name,  # self player
            "all_players": self.player_order,  # list of player names in order
            "current_player": self.round.current_player,  # current player's name
            "hand": self.players[player_name].zip_hand(),  # hand for self only
            "score": self.calc_hand_score(self.players[player_name]),  # self score only
            "discard": discard_card,  # top card of discard pile
            "mode": self.mode  # current game mode - might help restrict inputs on client side
        }    
