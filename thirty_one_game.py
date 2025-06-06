import random

from cards_shared import *
from games_shared import *

# TODO - what happens when deck runs out of cards?

# Set ace value
RANK_TO_VALUE["A"] = 11


class Player:
    def __init__(self, name: str) -> None:
        self.name = name
        self.order = 0
        self.hand = []
        self.lives = 3  # debug = score starts at 1  # Score starts at 3
        self.log = []  # Individual logs per player

    
    def __repr__(self) -> str:
        return f"{Player(self.name)}"


class State:
    def __init__(self, room_name: str) -> None:
        
        # modes : start, main_phase, discard
            # end_round - requires user input
            # end_game - do not require user input

        # Room
        self.room_name = room_name
        
        # Room constants
        self.MAX_PLAYERS = 7
        self.MIN_PLAYERS = 2

        # Game pieces
        self.deck = Deck()
        self.shuffled_cards = []
        self.hand_size = 3
        self.players = {}  # Static; {player name: player object}
        self.player_order = []  # Dynamic; adjusted when player gets knocked out

        # Gameplay
        self.mode = "start"
        self.in_progress = False

        # Rounds
        self.round_num = 0
        self.turn_num = 0
        self.first_player = ""  # player name
        self.current_player = ""  # player name
        self.dealer = ""  # player name
        self.knocked = ""  # player name
        self.blitzed_players = []  # player names; technically possible for more than 1 blitz
        self.discard = []
        self.free_ride_alts = ["getting a free ride", "on the bike", "on the dole", "riding the bus", "barely hanging on", "having a tummy ache", "having a long day"]
        

    def hand_to_discard(self, card_to_discard: Card) -> None:
        """Find selected card in hand and move from hand to discard."""

        # Find in card in hand by comparing suit and rank
        for card in self.players[self.current_player].hand:
            if card.suit == card_to_discard.suit and card.rank == card_to_discard.rank:
                # Remove from hand
                self.players[self.current_player].hand.remove(card)
                break
        
        # Add to discard
        self.discard.append(card_to_discard)

        # 'debug' log the actual card discarded; don't send to players
        print(f"{self.current_player} discarded: {card_to_discard}")


    def find_discard_on_blitz(self) -> Card:
        """Find card to automatically discard on a blitz."""
        
        # Either one card out of suit, or lowest card of a hand that only has one suit
        discard_card = None
        
        suits = {}
        for card in self.players[self.current_player].hand:
            if card.suit in suits.keys():
                suits[card.suit].append(card)
            else:
                suits[card.suit] = [card]
        
        # Len 1 means only suit; find lowest card
        if len(suits.keys()) == 1:
            discard_card = min(self.players[self.current_player].hand, key = lambda x: x.value)
        
        # Len 2 means find the odd suit with only one card
        else:
            for card_list in suits.values():
                if len(card_list) == 1:
                    discard_card = card_list[0]
        
        return discard_card


    def calc_hand_score(self, player_object:Player) -> int:
        """Calculate the highest score of a player's hand."""

        # Return if hand is empty
        if len(player_object.hand) == 0:
            print("Cannot calc hand score; Hand empty.")
            return 0
        
        # List of score dict for each group of three
        hand_scores = []
        
        combos_of_three = []

        # Get all combinations of 3 cards
        for i in range(len(player_object.hand)):
            for j in range(i + 1, len(player_object.hand)):
                for k in range(j + 1, len(player_object.hand)):
                    
                    combos_of_three.append([
                        player_object.hand[i], 
                        player_object.hand[j], 
                        player_object.hand[k]])
        
        for combo in combos_of_three:
            # Count score by suit for each combo
            combo_score = {}

            for card in combo:
                if card.suit not in combo_score.keys():
                    combo_score[card.suit] = 0
                combo_score[card.suit] += card.value

            # Add combo to list of all combos
            hand_scores.append(combo_score)
        
        # DOUBLE MAX - take max of each combo and then max of that list
        return max(max(combo.values()) for combo in hand_scores)
        

    # This is currently only called from app.py
    def add_player(self, name) -> None:
        """Initializes a player and adds to players dict."""

        self.players[name] = Player(name)


    def start_game(self) -> None:

        # Validations
        if self.in_progress:
            print("Cannot start game while a game is in progress.")
            return
        
        # Check number of players
        if not (self.MIN_PLAYERS <= len(self.players.keys()) <= self.MAX_PLAYERS):
            print(f"Need between {self.MIN_PLAYERS} and {self.MAX_PLAYERS} players to begin.")
            return
        
        # Reset game vars
        self.player_order = []
        self.round_num = 0
        for p_object in self.players.values():
            p_object.log = []  # Start log as empty list for each player

        # Set player order - eventually should be random
        self.player_order = [p_name for p_name in self.players.keys()]

        self.in_progress = True

        self.new_round()


    def new_round(self) -> None:

        # Moved removal of players here so they stay in the client up until start of next round
        for p_name in self.player_order:

            # Use try/except clause because some players will have negative lives for more than 1 round
            if 0 > self.players[p_name].lives:
                try:
                    # Adjust player order only; Keep players dict static
                    self.player_order.remove(p_name)
                except ValueError:
                    pass

        assert len(self.player_order) != 0, "Player order must not be 0 on round start."
        
        self.round_num += 1
        self.turn_num = 0
            
        # Calculate new first player index based on round number
        first_player_index = ((self.round_num)-1) % len(self.player_order)
        
        # Set dealer, first player, current player, blitzed players
        self.first_player = self.player_order[first_player_index]
        self.current_player = self.player_order[first_player_index]
        self.dealer = self.player_order[first_player_index-1]
        self.blitzed_players = []
        
        print_and_log(f"\n--- ROUND {self.round_num} ---\n", self.players)
        print_and_log("\n--- DEALING ---", self.players)
        
        # Shuffle cards
        self.shuffled_cards = shuffle_deck(self.deck)
        
        # Reset each player's hand and deal new hand
        for p_name, p_object in self.players.items():
            # Reset hand for every player to make sure player who is out doesn't have a hand
            p_object.hand = []

            if p_name in self.player_order:
                # Deal for players who are still in the game
                deal(p_object, self.shuffled_cards, num_cards=3)
                
                # Check for blitz
                # It's possible for more than one player to be dealt a blitz; blitzed players must be list
                if self.calc_hand_score(p_object) == 31:
                    self.blitzed_players.append(p_name)

        # Set a discard card; reset knocked
        self.discard = [draw_card(self.shuffled_cards)]
        self.knocked = ""

        # Move on to turn
        self.start_turn()


    def end_round(self):
        # scenarios - win doesn't actually matter, just display who knocked and loser
            # BLITZ or blitz tie - everyone except highest loses a life
            # ALL tie for loser - display knocked; no one loses
            # tie for loser and other higher player - all tied for lowest lose a life
            # 1 loser - display one who knocked and one who lost
            # 1 loser AND loser knocked - loser loses 2 points

        # Use player_order for all calculations here (since it only includes players who are NOT knocked out)

        # Mode = end round; requires input from user to start next round
        self.mode = "end_round"

        if len(self.blitzed_players) > 0:
            for p_name in self.blitzed_players:
                print_and_log(f"{p_name} BLITZED!!!", self.players)

        print_and_log(f"--- END OF ROUND {self.round_num} ---\n", self.players)
        print_and_log("---     SCORES     ---\n", self.players)
        
        # Calc all hand scores for display and round end calculations
        hand_scores = {}  # {score: player name}

        # Group using SCORES as keys instead of player
        for p_name in self.player_order:
            score = self.calc_hand_score(self.players[p_name])
            
            if score in hand_scores.keys():
                # Adds to list of players if there is a tie
                hand_scores[score].append(p_name)
            else:
                # Starts new list for that score if no tie
                hand_scores[score] = [p_name]

        # Order scores from highest -> lowest for display
        scores_ordered = sorted(hand_scores.keys(), reverse=True)
        
        # Loop through all entries to log all scores
        for ordered_score in scores_ordered:
            # Multiple players can have same score - need to use 2nd loop below
            for p_name in hand_scores[ordered_score]:
                print_and_log(f"{p_name}'s hand was worth {ordered_score}.", self.players)

        # List contains all names of players who blitzed
        if len(self.blitzed_players) > 0:
            for p_name in self.player_order:
                # If multiple blitzed players, everyone except blitzed players lose a life
                if p_name not in self.blitzed_players:
                    print_and_log(f"{p_name} loses 1 life.", self.players)
                    self.players[p_name].lives -= 1
        
        # Else, no blitz. Find lowest scorer and subtract lives, or handle tie scenario
        else:
            # House rule - everyone who tied for last place loses a life unless *everyone* tied
            
            # All players tied when hand scores length = 1
            if len(hand_scores) == 1:
                print_and_log("Tie for last place, no change in score.", self.players)

            # Players tied for last but some scored higher; All tying for last lose one life
            elif len(hand_scores[scores_ordered[-1]]) > 1:
        
                # Lowest hand = hand_scores[scores_ordered[-1]]
                for p_name in hand_scores[scores_ordered[-1]]:
                    print_and_log(f"{p_name} loses 1 life.", self.players)
                    self.players[p_name].lives -= 1

            # Only one player scored the lowest; Subtract one life, or 2 lives if they knocked
            else:
                
                # Get first (and only) element of scores ordered list
                lowest_player = hand_scores[scores_ordered[-1]][0]
                
                # If didn't knock, lose 1 life
                if lowest_player != self.knocked:
                    print_and_log(f"{lowest_player} loses 1 life.", self.players)
                    self.players[lowest_player].lives -= 1

                # If knocked, lose 2 lives
                else:
                    print_and_log(f"{lowest_player} knocked but had the lowest score.", self.players)
                    print_and_log(f"{lowest_player} loses 2 lives.", self.players)
                    self.players[lowest_player].lives -= 2
        
        # List of any players that were brought down to negative lives
        knocked_out = [p_name for p_name in self.player_order if 0 > self.players[p_name].lives]
        
        # Announce knock outs here; wait until start of next round to remove player for
        # game real-ness; i.e. so players can view their hand and hand score at end of round
        for p_name in knocked_out:
            print_and_log(f"{p_name} has been knocked out.", self.players)
            
            # `-1` can represent a knockout to client
            self.players[p_name].lives = -1

        players_remaining = len(self.player_order) - len(knocked_out)

        if players_remaining == 1:
            print_and_log(f"\n{players_remaining[0]} wins!", self.players)
            self.mode = "end_game"
            self.in_progress = False
            # mode `end_game` gives clients time to view the scores, leave/join rooms

        else:
            # More than 1 player remaining; continuing game
            print_and_log("\nRemaining Players' Extra Lives:", self.players)
            for p_name in self.player_order:
                
                # Skip knocked out player
                if p_name in knocked_out:
                    continue
                
                msg = ""
                
                # Send different msgs based on number of lives
                if self.players[p_name].lives == 1:
                    # Corrected grammar
                    msg = f"{p_name} - {self.players[p_name].lives} life"
                elif self.players[p_name].lives == 0:
                    # On the bike, etc
                    msg = f"{p_name} is {self.free_ride_alts[random.randint(0, len(self.free_ride_alts)-1)]}"
                else:
                    msg = f"{p_name} - {self.players[p_name].lives} lives"
                
                print_and_log(msg, self.players)


    def start_turn(self):
        # Increment turn number
        self.turn_num += 1

        # Set mode to main phase
        self.mode = "main_phase"

        # Check if any player(s) were dealt a blitz; skip to round end
        if len(self.blitzed_players) > 0:
            self.end_round()


    def end_turn(self):
        # Calculate new current player
        self.current_player = self.player_order[((self.turn_num + ((self.round_num-1) % len(self.player_order))) % len(self.player_order))]
        
        # If new current player has knocked, round should end
        if self.current_player == self.knocked:
            self.end_round()
        
        # If not, start next turn
        else:
            self.start_turn()


    def update(self, packet: dict):
        # actions: start, add_player, draw, pickup, knock, discard, quit
        # Assuming packet is coming from current player; validate before this is called

        if not self.in_progress:
            if packet["action"] == "start":
                self.start_game()
                return "accept"
            
        # Pause game before next round starts
        if self.mode == "end_round":
            if packet["action"] == "continue":
                # Start a new round
                self.new_round()
            else:
                return "reject"

        elif self.mode == "main_phase":
            taken_card = None
            if packet["action"] == "knock":
                if len(self.knocked) > 0:
                    print_and_log(f"{self.knocked} has already knocked. You must pick a different move.", self.players, player=self.current_player)
                    return "accept"
                self.knocked = self.current_player
                print_and_log(f"{self.current_player} knocked.", self.players)
                self.end_turn()
                return "accept"

            elif packet["action"] == "pickup":
                # convert to str here for type consistency
                taken_card = self.discard.pop()

            elif packet["action"] == "draw":
                taken_card = draw_card(self.shuffled_cards)
            
            elif packet["action"] == "discard":
                print_and_log("Must have 4 cards to discard.", self.players, player=self.current_player)
                return "reject"
            
            # Catch all other moves with `else`; Hitting continue on main phase was breaking game
            else:
                print_and_log(f"Move {packet['action']} is not allowed during the main phase.", self.players, player=self.current_player)
                return "reject"
            
            # If taken card has not been set at this point, will raise exception
            if not taken_card:
                print("taken_card not set in server update() function")
                return "reject"
            
            # Add card to hand
            self.players[self.current_player].hand.append(taken_card)
            
            # Check for blitz; can skip discard phase if blitz
            if self.calc_hand_score(self.players[self.current_player]) == 31:
                self.blitzed_players.append(self.current_player)
                
                # Auto-discard lowest card or odd suit out
                # looks better than ending with 4 cards in hand
                self.hand_to_discard(card_to_discard=self.find_discard_on_blitz())

                # End round after card discarded
                self.end_round()
            
            # Only set to discard if round has not ended Check for >3 cards in hand before setting mode to discard
            # Removing check for end_round because discard should happen before the round ends - better for display and real game-feel
            if len(self.players[self.current_player].hand) > 3:
                self.mode = "discard"
            
        elif self.mode == "discard" and packet["action"] == "discard":
            
            # Unzip card from client
            self.hand_to_discard(card_to_discard=unzip_card(packet["card"]))
            self.end_turn()
        
        # If not returned early, move was accepted
        return "accept"
        

    # Packages state for each player individually. Includes sid for socketio
    def package_state(self, player_name) -> dict:
        
        # assert self.mode == "end_game" or self.in_progress, "Only call once game has started or between games"

        # Get discard card
        discard_card = None
        if len(self.discard) > 0:
            discard_card = self.discard[-1].zip_card()

        # Build lists in order of player_order to make sure they're unpacked correctly
        hand_sizes = []
        lives = []
        final_hands = []
        final_scores = []
        
        for p_name in self.player_order:
            hand_sizes.append(len(self.players[p_name].hand))
            lives.append(self.players[p_name].lives)

            if self.mode == "end_round" or self.mode == "end_game":
                final_hands.append(zip_hand(self.players[p_name].hand))
                final_scores.append(self.calc_hand_score(self.players[p_name]))

        # All data the client needs from server
        return {
            # Generic data
            "game": "thirty_one",  # specifies game
            "action": "update_board",  # for client to know what type of update this is
            "room": self.room_name,  # name of room
            "mode": self.mode,  # current game mode - might help restrict inputs on client side
            "in_progress": self.in_progress,  # whether game is in progress
            "player_order": self.player_order,  # list of player names in order
            "current_player": self.current_player,  # current player's name
            "lives": lives,  # remaining lives of all players
            "discard": discard_card,  # top card of discard pile
            "hand_sizes": hand_sizes,  # number of cards in each players' hands
            "dealer": self.dealer,  # dealer of round
            "knocked": self.knocked,  # player who knocked (empty string until a knock)
            "final_hands": final_hands,  # reveal all hands to all players
            "final_scores": final_scores,  # reveal all scores to all players

            # Specific to player
            "recipient": player_name,
            "hand": zip_hand(self.players[player_name].hand),  # hand for self only
            "hand_score": self.calc_hand_score(self.players[player_name]),  # hand score for self
            "log": self.players[player_name].log,  # new log msgs - split up for each player
        }
    
