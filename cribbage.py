from collections import namedtuple
from itertools import combinations

from cards_shared import *
from games_shared import *

# Custom namedtuple for cribbage
Play = namedtuple("Play", ["player", "card"])

# Idea for front-end - when scoring, highlight cards used in the score to show which cards are being used

class Player:
    def __init__(self, name="") -> None:
        self.name = name
        self.order = 0
        self.hand = []
        self.score = 0
        self.unplayed_cards = []  # For the play
        self.played_cards = []  # For the play
        self.log = []
        self.action_log = []
    

    def __repr__(self) -> str:
        return f"Player({self.name})"


class State:
    def __init__(self, room_name: str) -> None:

        # Room
        self.room_name = room_name
        
        # Room constants
        self.MAX_PLAYERS = 3
        self.MIN_PLAYERS = 2

        # Game pieces
        self.deck = Deck()
        self.shuffled_cards = []
        self.players = {}  # Static; {player name: player object}
        self.player_order = []  # Dynamic; adjusted during the play

        self.mode = "start"
        self.in_progress = False
        
        # Rounds
        self.round_num = 0
        self.turn_num = 0
        self.first_player = ""
        self.current_player = ""
        self.dealer = ""
        self.crib = []
        self.starter = None
        self.go = []  # names of players; list for > 2 players
        self.go_scored = False
        self.current_plays = []  # list of Plays for a single play
        self.all_plays = []  # list of Plays for all plays of round
        self.has_played_show = set() # names of players
        self.action_log = []  # list of dicts - {"action": ... , "player": ..., "cards": ...}
    

    def new_play(self):
        """Reset play variables between rounds of the play."""

        # Set current player to first person who said go last round
        if len(self.go) > 0:
            self.current_player = self.go[0]
        self.go = []
        self.go_scored = False
        self.current_plays = []


    # This is currently only called from app.py
    def add_player(self, name) -> None:
        """Initializes a player and adds to players dict."""

        self.players[name] = Player(name)


    def set_player_order(self):
        """Sets player order to a random order."""
        
        # Empty player order list
        self.player_order = []
        # For reordered players dict
        new_player_dict = {}

        # Names to pick randomly
        player_names = [name for name in self.players.keys()]

        # Pick random player change order from 0 -> num players
        for i in range(len(player_names)):
            rand_player = player_names[random.randint(0, len(player_names)-1)]
            self.players[rand_player].order = i
            self.player_order.append(rand_player)
            player_names.remove(rand_player)

        # # Modify player order in place to match new order attribute of players
        # self.player_order.sort(key=lambda player_name: self.players[player_name].order)
        
        # Reorder the players dict (dicts are ordered now?) for parity with player order
        for player in self.player_order:
            new_player_dict[player] = self.players[player]

        # Assign old dict to new dict
        self.players = new_player_dict


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
            
        # Broadcast starting message
        print_and_log("Starting new game", self.players)

        # Set player order
        self.set_player_order()
        
        # Broadcast player order
        print_and_log("Player order:", self.players)
        for i, player in enumerate(self.player_order):
            print_and_log(f"{i+1}. {player}", self.players)

        self.in_progress = True
        
        self.new_round()


    def new_round(self) -> None:
        
        # Make sure player order has been set
        assert len(self.player_order) > 0, "Player order must be set before new_round is called."

        self.round_num += 1
        self.turn_num = 0
        self.mode = "discard"

        # Use 'cards' in the action log - array of cards involved in action
        self.action_log.append({"action": "deal", "player": "all", "cards": []})        

        # Increment first player and set dealer, current player
        first_player_index = ((self.round_num) - 1) % len(self.player_order)

        self.first_player = self.player_order[first_player_index]
        self.current_player = self.player_order[first_player_index]
        self.dealer = self.player_order[first_player_index - 1]
        
        print_and_log(f"--- ROUND {self.round_num} ---\n", self.players)

        # Shuffle cards
        self.shuffled_cards = shuffle_deck(self.deck)
        
        print_and_log("\n--- DEALING ---", self.players)
        # Deal and reset player vars
        for p_name, p_object in self.players.items():
            # Empty hand
            p_object.hand = []

            # Keep track of num to discard to make grammatically correct message
            discard_str = ""

            # Deal
            # 2P game: each gets 6
            if len(self.players.keys()) == 2:
                deal(p_object, self.shuffled_cards, num_cards=6)
                discard_str = "2 cards"
            
            # 3P game: dealer gets 6, others get 5
            else:
                if p_name == self.dealer:
                    deal(p_object, self.shuffled_cards, num_cards=6)
                    discard_str = "2 cards"
                else:
                    deal(p_object, self.shuffled_cards, num_cards=5)
                    discard_str = "1 card"

            # Add discard message to log
            print_and_log(f"Please pick {discard_str} to add to the crib. The dealer is {self.dealer}.", self.players, p_name)
            
            # Reset variables for the play
            p_object.played_cards = []
            p_object.unplayed_cards = []
        
        # Reset all plays for round
        self.all_plays = []
        
        # Reset other play vars that get reset between plays within a round
        self.new_play()
        
        self.start_turn()


    def end_round(self):

        print_and_log(f"\n--- END OF ROUND {self.round_num} ---\n", self.players)

        # Start string that will capture total hand scores
        print_and_log("---     SCORES     ---\n", self.players)

        for player in self.player_order:
            print_and_log(f"{player}: {self.players[player].score}", self.players)
    
        # Check if any player has scored enough to win
        if any(p_object.score == 121 for p_object in self.players.values()):
            self.mode = "end_game"
        
        # No win, continue game. Wait for user input to continue so players have time to view scores.
        else:
            self.mode = "end_round"


    def start_turn(self):
        # Set vars and complete actions for certain modes
        self.mode_maintenance()

        # turn_num must increment AFTER set_current_player for current algorithm
        self.turn_num += 1


    def end_turn(self) -> None:
        # Set current player (must happen BEFORE turn num incrementing for current algorithm)
        self.current_player = self.get_next_player()

        self.start_turn()


    def mode_maintenance(self) -> None:
        """Trigger actions and variable resets depending on mode."""

        if self.mode == "play":
            # set starter (one-time action when play starts)
            if self.starter is None:
                self.starter = draw_card(self.shuffled_cards)
                # Replace text log msg with action log
                self.action_log.append({"action": "starter", "player": "all", "cards": [self.starter.portable]})
                # print_and_log(f"The starter is {self.starter}.", self.players)

                if self.starter.rank == "J":
                    # This is redundant
                    # print_and_log(f"The dealer ({self.dealer}) scores 2 points because the starter is a {self.starter}.", self.players)
                    self.add_score_log(self.dealer, 2, "his heels (starter is a J)", cards=[self.starter.portable])



            ### Taken from get_user_input - put this in start turn?
            current_count = sum([play.card.value for play in self.current_plays])

            # If player cannot play a card without exceeding 31, force them to say go
            if all(current_count + card.value > 31 for card in self.players[self.current_player].unplayed_cards):

                # Everyone else has said go; round should end
                if len(self.player_order) - len(self.go) == 1:
                    # I think this message is covered within score_go
                    # print_and_log(f"All other players have said 'Go'. You cannot play any more cards and must say go.", self.players)
                    self.score_go()

                    ### Copied from update() -- how to get this in without creating control flow issues?
                    # Check if anyone has cards left to play
                    if 4 * len(self.players.keys()) == len(self.all_plays):
                        
                        # Move on to show if no cards left for play
                        self.mode = "show"

                    self.end_turn()
                    ### Copied from update()

                # Say go but proceed as there are still other players to check for go
                else:
                    print_and_log(f"{self.current_player} cannot play any more cards and must say 'Go'.", self.players)
            ### Taken from get_user_input



            # Set unplayed_cards
            for player in self.players.values():
                player.unplayed_cards = [card for card in player.hand if card not in player.played_cards]

            # Reset play vars:
                # for 31 count after end of play is checked
                # if all players in round have said go and go has been scored
            if sum([play.card.value for play in self.current_plays]) == 31 or (len(self.player_order) == len(self.go) and self.go_scored):
                self.new_play()
                print_and_log(f"Round ending, {self.current_player} will start the next round.", self.players)
            # 3 total players, 1 is out of cards starting the round - they will actually need to say go and be counted in self.go so this will have the same result

        elif self.mode == "show":
            # Reset turn_num to 0 at beginning of show 
            if len(self.has_played_show) == 0:
                self.turn_num = 0


    def get_next_player(self) -> str:
        """Get the next player."""

        # Next player rules varies between play and show, and all can play during discard.
        
        # Make copy of player order since order will be constantly changing during the play.
        player_order = self.player_order.copy()
        
        if self.mode == "play" and len(self.go) > 0:
            for player in self.go:
                player_order.remove(player)
        
        # Player order must not be empty or there will be modulo by 0 error
        assert len(player_order) > 0, "Player order should be greater than 0, might have to catch end of play sooner."

        next_player = ""

        # At the end of a round, next player would be first player, but second player is new first player
        if self.mode == "end_round":
            first_player_index = self.player_order.index(self.first_player)
            next_player = player_order[(first_player_index + 1) % len(player_order)]

        # Beginning of show only - make sure show starts with original first player of round
        elif self.mode == "show" and len(self.has_played_show) == 0:
            next_player = self.first_player
        
        # Otherwise get next player normally using turn number
        else:
            next_player = player_order[((self.turn_num + ((self.round_num - 1) % len(player_order))) % len(player_order))]
        
        return next_player


    def score_go(self) -> None:
        """Determines if player is last to say go and should score a point."""

        self.go.append(self.current_player)
        print_and_log(f"{self.current_player} has said 'Go'.", self.players)

        # Check if there is only 1 player left after the go
        if len(set(self.player_order) - set(self.go)) == 1:
            # Score a go for remaining player
            player_left = next(iter(set(self.player_order) - set(self.go)))
            self.add_score_log(player_left, 1, "go", cards=[])
            # Set go_scored to True so round can be reset
            self.go_scored = True


    def score_play(self, played_card: Card) -> None:
        """Determine if any points should be scored depending on the card just played."""

        # Placeholder for `Play` object to be assigned in loop
        play = None

        # Find played card in hand - compare rank and suit to card given
        for card in self.players[self.current_player].unplayed_cards:
            if card.suit == played_card.suit and card.rank == played_card.rank:
                
                # Get played card by removing from player's unplayed list; add to played list
                self.players[self.current_player].unplayed_cards.remove(card)
                self.players[self.current_player].played_cards.append(card)
        
                # Assign `Play` object
                play = Play(self.current_player, card)
                
                # Break loop on finding card
                break
        
        assert play is not None, "Play must not be None at this point."

        # Add to lists: all plays, current plays 
        self.all_plays.append(play)
        self.current_plays.append(play)

        # Notify users about play
        print_and_log(f"{play.player} played: {play.card}.", self.players)

        # Check count for 15, 31
        if sum([play.card.value for play in self.current_plays]) == 15:
            self.add_score_log(self.current_player, 2, "15", cards=[])
        
        # On 31, check if go has been scored already
        elif sum([play.card.value for play in self.current_plays]) == 31:
            # Only score for 31 if go has been scored
            if self.go_scored:
                self.add_score_log(self.current_player, 1, "31", cards=[])
            
            # Score 2 points if go has not been scored
            else:
                self.add_score_log(self.current_player, 1, "31", cards=[])
                self.add_score_log(self.current_player, 1, "go", cards=[])

        # Check for pairs
        play_ranks = [play.card.rank for play in self.current_plays]
        
        pairs = [play_ranks[-1]]
        for rank in reversed(play_ranks[:-1]):
            if rank in pairs:
                pairs.append(rank)
            else:
                break

        if len(pairs) == 2:
            # Pass in last two cards
            self.add_score_log(self.current_player, 2, "pair", cards=[play.card.portable for play in self.current_plays[-2:]])
        
        elif len(pairs) == 3:
            # Pass in last three cards
            self.add_score_log(self.current_player, 6, "three of a kind", cards=[play.card.portable for play in self.current_plays[-3:]])
        
        elif len(pairs) == 4:
            # Pass in last four cards
            self.add_score_log(self.current_player, 12, "four of a kind", cards=[play.card.portable for play in self.current_plays[-4:]])
        
        # Check for runs (min 3)
        for i in range(len(play_ranks)-2):
            if is_run(play_ranks[i:]):
                # Pass in `i` to end of current plays in cards
                self.add_score_log(self.current_player, len(play_ranks[i:]), "run", cards=[play.card.portable for play in self.current_plays[i:]])

                # Print and log and print the run in order
                print_and_log(f"Run: {sorted(play_ranks[i:])}", self.players)
                
                # Can break at first run found because starting search from outside-in
                break
        
        # Check for end of round
        if all(len(player.unplayed_cards) == 0 for player in self.players.values()):
            self.add_score_log(self.current_player, 1, "playing the last card", cards=[self.current_plays[-1].card.portable])
        

    def score_show(self, four_card_hand: list[Card], crib: bool):
        # There are a lot of loops in this function, could probably condense if it became a performance issue

        # Action log to reveal show cards to all players
        self.action_log.append({"action": "start_show", "player": self.current_player, "cards": [card.portable for card in four_card_hand]})

        # Hand plus starter used for scoring the show
        show_hand = four_card_hand + [self.starter]
        
        # Keep running tally of score; use this value to report overall score at the end
        score = 0

        if not crib:
            print(f"Hand = {four_card_hand}")
        elif crib:
            print(f"Crib = {four_card_hand}")

        print(f"Starter = {self.starter}\n")

        # Count 15s
        # Looks at every combination of cards starting with the first 2 cards
        for i in range(2, len(show_hand) + 1):
            for combo_15 in combinations(show_hand, i):

                # Check for sum of 15
                if sum(card.value for card in combo_15) == 15:

                    # 15 found; report the cards involved
                    self.add_score_log(self.current_player, 2, "15", cards=[card.portable for card in combo_15])
                    # Add to tally
                    score += 2

        # Count pairs - processes 3 or 4 of a kind as multiples of pairs
        for combo_pair in combinations(show_hand, 2):
            # Compare `rank` -- not value because face cards all have value 10
            if combo_pair[0].rank == combo_pair[1].rank:
                self.add_score_log(self.current_player, 2, "pair", cards=[card.portable for card in combo_pair])
                score += 2
        
        # Jack matching suits with starter
        for card in four_card_hand:
            if card.rank == "J" and card.suit == self.starter.suit:
                # If sending as reason `knobs` will have to explain in log on client side
                # match_jack is more descriptive
                self.add_score_log(self.current_player, 1, "match_jack", cards=[card.portable])
                # self.add_score_log(self.current_player, 1, "knobs", cards=[card])
                # print_and_log(f"1 point for his knobs ({card} matches the suit of the starter).", self.players)
                score += 1
        
        # Find runs
        runs = []
        # Look for run in combinations of 3 cards
        for i in range(3, len(show_hand) + 1):
            for pot_run in combinations(show_hand, i):
                if is_run(card.rank for card in pot_run):
                    runs.append(pot_run)

        # If run(s) was found, find the longest
        if len(runs) > 0:
            # Find the longest run out of all runs found
            max_len = max(len(run) for run in runs)
            longest_runs = [run for run in runs if len(run) == max_len]
            
            # Score each run
            for run in longest_runs:
                self.add_score_log(self.current_player, len(run), "run", cards=[card.portable for card in run])
                # The below log is a little redundant but does show the sorted run so may be useful
                print_and_log(f"{len(run)} points for a run: {sorted(run, key=lambda x: x.value)}.", self.players)
                score += len(run)

        # Find flush; process end of show

        # Flush - 4 cards for non-crib; 5 cards only for crib
        if not crib:
            # Check 5 card flush first
            if len(set(card.suit for card in show_hand)) == 1:
                self.add_score_log(self.current_player, 5, "flush", cards=[card.portable for card in show_hand])
                score += 5

            # Check 4 card flush - elif implies no 5 card flush
            elif len(set(card.suit for card in four_card_hand)) == 1:
                self.add_score_log(self.current_player, 4, "flush", cards=[card.portable for card in four_card_hand])
                print_and_log("4 points for a flush.", self.players)
                score += 4

            # END OF SHOW FOR NON-CRIB

            # Print total score for show
            # Split for correct grammar
            if score == 1:
                print_and_log(f"{self.current_player} scored a total of {score} point for the show.")
            else:
                print_and_log(f"{self.current_player} scored a total of {score} points for the show.")
                
            # If player is not dealer, add them to the played show set
            # If dealer, handled below under crib
            if self.current_player != self.dealer:
                self.has_played_show.add(self.current_player)

        if crib:
            if len(set(card.suit for card in show_hand)) == 1:
                self.add_score_log(self.current_player, 5, "flush", cards=[card.portable for card in show_hand])
                print_and_log(f"5 points for a flush.", self.players)
                score += 5

            # END OF SHOW FOR CRIB

            # Print total score for crib
            # Split for correct grammar
            if score == 1:
                print_and_log(f"{self.current_player} scored a total of {score} point for the crib.")
            else:
                print_and_log(f"{self.current_player} scored a total of {score} points for the crib.")
        
            # Player must be dealer; mark as finished with the show
            self.has_played_show.add(self.current_player)


    def update(self, packet: dict):
        # {"name": "", "action": "", "card": "", "cards": ["", ""], "go": bool}
        # actions: start, discard, play, continue, new_game

        # Packet must include player name because must accept input from all players during discard
        
        assert len(packet) > 0, "empty packet"
        
        # I think this covers when self.mode == "end_game"
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
        
        # Turn modes: "discard", "play", "show"
        elif self.mode == "discard" and packet["action"] == "discard":
            # Cards to discard can be sent as packet["cards"]
            
            # Validate number of cards
            if len(packet["cards"]) != len(self.players[packet["name"]].hand) - 4:

                print_and_log(f"You must choose {len(self.players[packet["name"]].hand) - 4} card(s) to add to the crib.", self.players, packet["name"])
                return "reject"
            
            # Discard move accepted; add to action log and adjust player hand / crib
            # Pass in actual cards and hide if sending to non-self player -- hidden during package_state()
            # Don't nede to unzip packet["cards"] because it is already in portable format
            self.action_log.append({"action": "discard", "player": packet["name"], "cards": [card for card in packet["cards"]], "num_to_discard": len(packet["cards"])})
            
            # Iterate through cards to remove from hand and add to crib
            for discard_card in packet["cards"]:
                unzipped_card = unzip_card(discard_card)
                
                # Iterate through cards in hand
                for card in self.players[packet["name"]].hand:
                    
                    # Check for match in hand
                    if card.suit == unzipped_card.suit and card.rank == unzipped_card.rank:
                        
                        # Remove from hand and add to crib on match
                        self.crib.append(card)
                        self.players[self.current_player].hand.remove(card)
                        
                        # Break inner loop once card is found
                        break
            
            # Check for end of discard
            if len(self.crib) == 4:
                self.mode = "play"
            
        elif self.mode == "play" and packet["action"] == "play":

            if packet["name"] != self.current_player:
                print(f"Rejecting play move from {packet['name']}; not their turn.")
                return "reject"

            played_card = unzip_card(packet["card"])

            current_count = sum([play.card.value for play in self.current_plays])
            
            # Validate input
            if current_count + played_card.value > 31:
                print_and_log("You cannot exceed 31. Please choose another card.", self.players, packet["name"])
                return "reject"
            
            # Action log to play a card
            self.action_log.append({"action": "play_card", "player": packet["name"], "cards": [played_card]})

            # Go will never be scored here - they will be determined automatically in mode_maintenance
            self.score_play(played_card)

            # Check if anyone has cards left to play
            if 4 * len(self.players.keys()) == len(self.all_plays):
                
                # Move on to show if no cards left for play
                self.mode = "show"

            self.end_turn()
        
        elif self.mode == "show":
            # Reveal can be timed and animated on client-side - server can send at once
            
            # Score regular hand
            self.score_show(four_card_hand=self.players[self.current_player].hand, crib=False)
            
            # If dealer, score crib as well
            if self.current_player == self.dealer:
                self.score_show(four_card_hand=self.crib, crib=True)
            
            # Check for end of show; end round if over
            if len(self.has_played_show) == len(self.player_order):
                self.end_round()
            
            # Not everyone has played show, end turn and increment current player
            else:
                self.end_turn()

        # If not returned early, move was accepted
        return "accept"


    def add_score_log(self, player: str, points: int, reason: str, cards: list[str]):
        """Adds scores to player, prints scores to log, and adds to action log for client."""

        # Add score to player object
        self.players[player].score += points
        
        # Check if `a` needs to be added in the log for grammar
        add_a = ["15", "31", "go", "run", "flush", "pair"]
        score_text = reason
        if reason in add_a:
            score_text = f"a {reason}"

        # Add to text log - this may be redundant with action log
        print_and_log(f"{player} scored {points} for {score_text}.", self.players)

        # Add to action log with cards so client can animate each score
        # Maybe replace adding to log with action log so message can go in log at the same time as animation takes place
        # Could recreate the log message on client-side with `player`, `points`, and `reason`
        # Should specify mode since pairs, 15s, and runs can be scored in both show and play
            # mode can be taken from self.mode
        self.action_log.append({"action": "score", "player": player, "points": points, "reason": reason, "cards": cards, "mode": self.mode})


    # Packages state for each player individually. Includes sid for socketio
    def package_state(self, player_name) -> dict:
        
        # Build lists in order of player_order to make sure they're unpacked correctly
        hand_sizes = []
        num_to_discard = 0  # number of cards self needs to discard
        total_scores = []  # Overall score of game (0-121)
        played_cards = []  # For the play - list of dicts {"player": ..., "card": ...}
        final_hands = []  # For the show
        final_scores = []  # Currently unused - may be useful for animating show score
        play_count = 0  # count for each play

        # Display hands differently per mode:
            # Discard: normal, show self hand, show opponents' hand sizes
            # Play: self hand is unplayed cards, opponents' hand is opponents' len(unplayed cards)
                # AND played cards (face up) will be 
        for p_name in self.player_order:
            
            # Get total score from player dict
            total_scores.append(self.players[p_name].score)

            # Hand sizes must be calculated differently if during play vs not
            if self.mode != "play":
                # Hand size outside of play can be calculated with hand
                hand_sizes.append(len(self.players[p_name].hand))

            elif self.mode == "play":
                # Hand size in play can be taken from unplayed_cards
                hand_sizes.append(len(self.players[p_name]).unplayed_cards)

            # Send all hands if show
            if self.mode == "show":
                # Scoring should appear in log - can also make graphic for scoring on front end
                final_hands.append([card.portable for card in self.players[p_name].hand])
        
        # Get num to discard outside of loop since only has to be for self
        if self.mode == "discard":
            num_to_discard = len(self.players[player_name].hand) - 4

        # Played cards can be retrieved outside of loop since it's independent of player order
        elif self.mode == "play":
            for play in self.current_plays:
                # Build played_cards - list of cards played during the play
                played_cards.append({"player": play.player, "card": play.card.portable})

                # Count play
                play_count += play.card.value

        custom_action_log = []

        # Hide card (set to "unknown") in action log if player should not see them
        for action_dict in self.action_log:
            new_dict = action_dict
            
            # If recipient is not the action target and the action is discard, hide the cards
            if action_dict["action"] == "discard" and player_name != action_dict["player"]:
                new_dict["cards"] = "unknown"
            
            # Add to new list
            custom_action_log.append(new_dict)


        # All data the client needs from server
        return {
            # Generic data
            "game": "cribbage",  # specifies game
            "room": self.room_name,  # name of room
            "mode": self.mode,  # current game mode - might help restrict inputs on client side
            "in_progress": self.in_progress,  # whether game is in progress
            "player_order": self.player_order,  # list of player names in order
            "current_player": self.current_player,  # current player's name
            "hand_sizes": hand_sizes,  # number of cards in each players' hands
            "total_scores": total_scores,  # overall score of game (0-121)
            "crib_size": len(self.crib),  # show size of crib as players discard
            "dealer": self.dealer,  # dealer of round
            "played_cards": played_cards,  # list of dicts {"player": ..., "card": ...}
            "play_count": play_count,  # current count of the play
            "final_hands": final_hands,  # reveal all hands to all players
            # "final_scores": final_scores,  # reveal all scores to all players

            # Specific to player
            "recipient": player_name,
            "hand": [card.portable for card in self.players[player_name].hand],  # hand for self only
            "num_to_discard": num_to_discard,  # if discard phase, number of cards to discard
            "log": self.players[player_name].log,  # new log msgs - split up for each player
            "action_log": custom_action_log,
        }
    


# Other helper functions
def is_run(potential_run: list[str]):
    # Convert card ranks to sorted list of indices of this list of card ranks
    indices = sorted([["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"].index(rank) for rank in potential_run])

    # Check if all adjacent indices are within 1 of each other
    return all(indices[i + 1] - indices[i] == 1 for i in range(len(indices) - 1))


### Notes

# Scoring
# starter: if Jack, dealer gets 2 points

# PLAY
# 1 point for each card in run
# every time a card is played, re-count from the beginning to the end to check for an unbroken run (or dup card)
    # 3, 5, 6, 7 -> score three for the 5-6-7 run
    # 3, 5, 6, 7, + 4 -> scores five points, for the 3-4-5-6-7 run
    # 8, 7, 7, 6 !-> NOT a run
# 1 point for card in run
# 2 points for pair
    # 6 for three
    # 12 for four
# 1 point for Go or last card
# 2 points for 15
# 1 point for 31

# SHOW
# 1 point for each card in run
# 4 points for 4 card flush (excluding crib & starter) OR 5 points for 5 card flush
# 2 points per 15 (combinations)
# 2 points per pair (combinations)
    # 6 for three (2, 2, 2) - 3 combinations
    # 12 for four (2, 2, 2, 2, 2, 2) - 6 combinations
# 1 point for Jack matching starter