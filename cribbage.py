from collections import namedtuple
from itertools import combinations

from games_shared import *
from short_logger import short_logger

# Custom namedtuple for cribbage
Play = namedtuple("Play", ["player", "card"])

# Idea for front-end - when scoring, highlight cards used in the score to show which cards are being used

class PlayerCribbage(Player):
    def __init__(self, name: str) -> None:
        super().__init__(name)

        # Add cribbage specific attributes to Player object
        self.score: int = 0
        self.unplayed_cards: list[Card] = []  # For the play
        self.played_cards: list[Card] = []  # For the play


class StateCribbage(BaseState):
    def __init__(self, room_name: str) -> None:
        super().__init__(room_name)
        # Imported from games_shared
        # self.room_name = room_name
        # self.players = {}  # dict of player name to object
        # self.player_order = []  # list of player names
        # self.mode = "start"
        # self.in_progress = False

        # Room constants
        self.MAX_PLAYERS = 3
        self.MIN_PLAYERS = 2

        # Game pieces
        self.deck = Deck()
        self.shuffled_cards = []

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
    

    # This is currently only called from app.py
    def add_player(self, name) -> None:
        """Initializes a player and adds to players dict."""

        self.players[name] = PlayerCribbage(name)
        self.player_order.append(name)


    # This will be used by every game but must be in specific game files because
    # it returns a specific Player class, i.e. PlayerCribbage, PlayerThirtyOne
    def reorder_players(self) -> dict[str,PlayerCribbage]:
        """Updates order attribute of player objects. Returns updated players dict with proper typing."""
        new_players = {}

        # Pick random player change order from 0 -> num players
        for i, player in enumerate(self.player_order):
            # Add player object to new dict
            new_players[player] = self.players[player]
            # Set new order on player object
            new_players[player].order = i

        return new_players


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
        self.round_num = 0
        for p_object in self.players.values():
            p_object.log = []  # Start log as empty list for each player

        # Set player order
        self.player_order = self.set_player_order()
        self.players = self.reorder_players()
        
        self.broadcast_start_message()

        self.in_progress = True
        
        self.new_round()


    def new_round(self) -> None:
        
        # Make sure player order has been set
        assert len(self.player_order) > 0, "Player order must be set before new_round is called."

        self.round_num += 1
        self.turn_num = 0
        self.mode = "discard"

        # Use 'cards' in the action log - array of cards involved in action
        self.add_to_action_log({"action": "deal", "player": "all", "cards": []})

        # Increment first player and set dealer, current player
        first_player_index = ((self.round_num) - 1) % len(self.player_order)

        self.first_player = self.player_order[first_player_index]
        self.current_player = self.player_order[first_player_index]
        self.dealer = self.player_order[first_player_index - 1]
        
        self.print_and_log(f"\n--- ROUND {self.round_num} ---\n")

        # Shuffle cards
        self.shuffled_cards = shuffle_deck(self.deck)
        
        self.print_and_log("\n--- DEALING ---\n")
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
            self.print_and_log(f"\n{self.dealer} is the dealer.\nPlease pick {discard_str} to add to the crib.", p_name)

            # Reset variables for the play
            p_object.played_cards = []
            p_object.unplayed_cards = []
        
        # Reset all plays for round
        self.all_plays = []
        
        self.start_turn()


    def end_round(self):
        """Prints scores at the end of the round. If this is called the game is not over."""
        self.print_and_log(f"\n--- END OF ROUND {self.round_num} ---\n")

        # Start string that will capture total hand scores
        self.print_and_log("---     SCORES     ---\n")

        for player in self.player_order:
            self.print_and_log(f"{player}: {self.players[player].score}")
    
        # No win, continue game. Wait for user input to continue so players have time to view scores.
        self.mode = "end_round"


    def start_turn(self) -> None:
        # If mode is set to end_game, exit early to prevent game from moving on to next round.
        if self.mode == "end_game":
            return None

        # turn_num must increment AFTER get_next_player (called in end_turn) for current algorithm
        self.turn_num += 1
        
        # Check if current player can play; say go and end turn if not
        if self.mode == "play":

            current_count = sum([play.card.value for play in self.current_plays])

            # If player cannot play a card without exceeding 31, force them to say go
            if all(current_count + card.value > 31 for card in self.players[self.current_player].unplayed_cards):
                
                # Say go for current player and check if they are the last one to say go
                self.score_go()
                # End turn to set new current player
                self.end_turn()
        
        # Show does not require user input so logic for show can just be here.
        # Will cycle through end_turn/start_turn until end of show and start a new round.
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


    def end_turn(self) -> None:
        # end_play_round flag is needed for get_next_player to get the correct player on a new play round
        # get_next_player must be called before new_play because new_play resets self.go  
        end_play_round = False

        # Check for end of play
        if self.mode == "play":

            # Set mode to "show" if everyone is out of cards
            if 4 * len(self.player_order) == len(self.all_plays):
                # Move on to show if no cards left for play
                self.mode = "show"
                # Reset turn_num to 0 at beginning of show 
                self.turn_num = 0
            
            # Check whether new play round should be started
            # if (count is 31) OR if (all players in round have said go and go has been scored)
            elif sum([play.card.value for play in self.current_plays]) == 31 or (len(self.player_order) == len(self.go) and self.go_scored):
                end_play_round = True
        
        # get_next_player must happen BEFORE turn num incrementing for current algorithm
        self.current_player = self.get_next_player(end_play_round=end_play_round)
        
        if end_play_round:
            self.new_play()
            self.print_and_log(f"Round ending, {self.current_player} will start the next round.")
            
        self.start_turn()


    def get_next_player(self, end_play_round) -> str:
        """Get the next player. Uses go and to adjust player order during the play. Normal player order for the show. 
        This is not used during discard because all can play."""
        
        # Make copy of player order since order will be constantly changing during the play.
        player_order = self.player_order.copy()
        
        # If during play, adjust player order to account for those who have said go
        if self.mode == "play" and len(self.go) > 0:

            # If end of play round, exit early
            if end_play_round:
                # Set current player to first person who said go last round
                return self.go[0]
            
            # Not end of play round. Prevent players in self.go from being selected to go next
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
        """Adds go to log. Determines if player is last and should score a point."""

        self.go.append(self.current_player)
        self.print_and_log(f"{self.current_player} has said 'Go'.")

        # Check if there is only 1 player left after the go
        if len(set(self.player_order) - set(self.go)) == 1:
            # Score a go for remaining player
            player_left = next(iter(set(self.player_order) - set(self.go)))
            self.add_score_log(player_left, 1, "go", cards=[])
            # Set go_scored to True so round can be reset
            self.go_scored = True


    def new_play(self):
        """Reset play variables between rounds of the play."""
        
        self.go = []
        self.go_scored = False
        self.current_plays = []


    def score_play(self, played_card: Card, current_count: int) -> None:
        """Creates `play` namedtuple. Determine if any points should be scored depending on the card just played. Add scores to log."""

        # Assign `Play` object. Note: played_card is a copy of the card object, but it shouldn't matter here
        play = Play(self.current_player, played_card)

        # Add to lists: all plays, current plays 
        self.all_plays.append(play)
        self.current_plays.append(play)

        # Check count for 15, 31
        if current_count == 15:
            self.add_score_log(self.current_player, 2, "15", cards=[])
        
        # On 31, check if go has been scored already
        elif current_count == 31:
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
        for i in range(len(play_ranks) - 2):
            if is_run(play_ranks[i:]):
                # Pass in `i` to end of current plays in cards
                self.add_score_log(self.current_player, len(play_ranks[i:]), "run", cards=[play.card.portable for play in self.current_plays[i:]])

                # Print and log and print the run in order
                self.print_and_log(f"Run: {sorted(play_ranks[i:])}")
                
                # Can break at first run found because starting search from outside-in
                break
        
        # Check for end of round
        if all(len(player.unplayed_cards) == 0 for player in self.players.values()):
            self.add_score_log(self.current_player, 1, "playing the last card", cards=[self.current_plays[-1].card.portable])
        

    def score_show(self, four_card_hand: list[Card], crib: bool):
        # There are a lot of loops in this function, could probably condense if it became a performance issue

        # Action log to reveal show cards to all players
        self.add_to_action_log({"action": "start_show", "player": self.current_player, "cards": [card.portable for card in four_card_hand]})

        # Assertion so pylance knows starter is a Card
        assert self.starter is not None, "starter is None at score_show"

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
                # self.print_and_log(f"1 point for his knobs ({card} matches the suit of the starter).")
                score += 1
        
        # Find runs
        runs = []
        # Look for run in combinations of 3 cards
        for i in range(3, len(show_hand) + 1):
            for pot_run in combinations(show_hand, i):
                if is_run([card.rank for card in pot_run]):
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
                self.print_and_log(f"{len(run)} points for a run: {sorted(run, key=lambda x: x.value)}.")
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
                self.print_and_log("4 points for a flush.")
                score += 4

            # Print total score for show
            # Split for correct grammar
            if score == 1:
                self.print_and_log(f"{self.current_player} scored a total of {score} point for the show.")
            else:
                self.print_and_log(f"{self.current_player} scored a total of {score} points for the show.")
                
            # If player is not dealer, add them to the played show set
            # If dealer, handled below under crib
            if self.current_player != self.dealer:
                self.has_played_show.add(self.current_player)
            
            # END OF SHOW FOR NON-CRIB

        if crib:
            if len(set(card.suit for card in show_hand)) == 1:
                self.add_score_log(self.current_player, 5, "flush", cards=[card.portable for card in show_hand])
                self.print_and_log("5 points for a flush.")
                score += 5

            # Print total score for crib
            # Split for correct grammar
            if score == 1:
                self.print_and_log(f"{self.current_player} scored a total of {score} point for the crib.")
            else:
                self.print_and_log(f"{self.current_player} scored a total of {score} points for the crib.")
            
            # END OF SHOW FOR CRIB
        
            # Player must be dealer; mark as finished with the show
            self.has_played_show.add(self.current_player)


    def update(self, packet: dict[str, str | bool | list[str]]) -> dict[str, str | bool]:
        """Accept client's input and update game state or reject client's input."""

        # Packet received by client contains these keys/values:
        # {"username": "", "action": "", "card": "", "cards": ["", ""], "go": bool}
        # action requests: start, discard, play, continue, new_game

        # Change response to accept or reject
        # Use msg as response to specific player on a reject
        response = {"accepted": False, "msg": ""}
        print(type(packet["cards"]))
        assert len(packet) > 0, "empty packet"
        assert isinstance(packet["username"], str), "Username received not type str"
        assert isinstance(packet["cards"], list), "Cards received not type list"
        
        # I think this covers when self.mode == "end_game"
        if not self.in_progress:
            if packet["action"] == "start":
                self.start_game()
                response["accepted"] = True
                return response
            
        # Pause game before next round starts
        if self.mode == "end_round":
            if packet["action"] == "continue":
                # Start a new round
                self.new_round()
            else:
                response["accepted"] = False
                return response
        
        # Turn modes: "discard", "play", "show"
        elif self.mode == "discard" and packet["action"] == "discard":
            
            # Cards to discard can be sent as packet["cards"]
            target_num = len(self.players[packet["username"]].hand) - 4
            # Validate number of cards
            if len(packet["cards"]) != target_num:
                # Split for correct grammar
                if target_num == 1:
                    response["msg"] = f"You must choose {target_num} card to add to the crib."
                else:
                    response["msg"] = f"You must choose {target_num} cards to add to the crib."
                response["accepted"] = False
                return response
            
            # Discard move accepted; add to action log and adjust player hand / crib
            for p_name in self.player_order:
                # Remake list of cards tailored to each player
                cards = []

                # Do not hide cards for discarding player
                if p_name == packet["username"]:
                    # Don't need to unzip packet["cards"] because it is already in portable format
                    cards = [card for card in packet["cards"]]
                # Hide for everyone else
                else:
                    cards = []

                self.add_to_action_log({"action": "discard", "player": packet["username"], "cards": cards, "num_to_discard": len(packet["cards"])}, player=p_name)

                
            # Iterate through cards in hand to find the discard card - remove from hand and add to crib
            for discard_card in packet["cards"]:
                
                # Iterate through cards in hand
                for card in self.players[packet["username"]].hand:
                    
                    # Check for match in hand. Compare to portable string of existing card
                    if card.portable == discard_card:
                        # Remove from hand and add to crib on match
                        self.crib.append(card)
                        self.players[packet["username"]].hand.remove(card)
                        
                        # Break inner loop once card is found
                        break

            # Check for end of discard - cannot put in end_turn because there are technically no turns during discard
            if len(self.crib) == 4:
                self.mode = "play"
                
                # Reset play vars
                self.new_play()

                # Set unplayed cards for each player
                for p_object in self.players.values():
                    p_object.unplayed_cards = [card for card in p_object.hand if card not in p_object.played_cards]

                # Set starter (one-time action when play starts)
                if self.starter is None:
                    self.starter = draw_card(self.shuffled_cards)
                    # Replace text log msg with action log
                    self.add_to_action_log({"action": "starter", "player": "all", "cards": [self.starter.portable]})
                    self.print_and_log(f"The starter is a {self.starter}.")

                    if self.starter.rank == "J":
                        self.add_score_log(self.dealer, 2, "his heels (starter is a J)", cards=[self.starter.portable])

        elif self.mode == "play" and packet["action"] == "play":
            assert len(packet["cards"]) == 1, "Cards array should only contain 1 card."

            if packet["username"] != self.current_player:
                print(f"Not accepting move from non-current player ({packet['username']}) during the play.")
                print(f"Current player is {self.current_player}.")
                response["msg"] = "You can only play a card on your turn."
                response["accepted"] = False
                return response

            current_count = sum([play.card.value for play in self.current_plays])
            
            # Validation - check if count will exceed 31. Convert to Card to get value.
            # Only 1 card should be passed in cards array for play, so use index 0
            if current_count + unzip_card(packet["cards"][0]).value > 31:
                response["msg"] = "You cannot exceed 31. Please choose another card."
                response["accepted"] = False
                return response

            # Set played_card in loop below
            played_card = None

            # Find card in hand; move card from unplayed_cards to played_cards
            for card in self.players[self.current_player].unplayed_cards:
                if card.portable == packet["cards"][0]:
                    
                    # Get played card by removing from player's unplayed list; add to played list
                    played_card = card
                    self.players[self.current_player].played_cards.append(card)
                    self.players[self.current_player].unplayed_cards.remove(card)

                    # Break loop on finding card
                    break

            # Else clause for the for-loop in case card is not found in hand - move is invalid
            assert played_card is not None, "Played card could not be found in hand."
            
            # Move is accepted
            
            # Action log to play a card
            self.add_to_action_log({"action": "play_card", "player": packet["username"], "cards": [played_card.portable]})

            # For debug until I can animate the play - notify users about play
            self.print_and_log(f"{self.current_player} played: {played_card}.")
            current_count += played_card.value
            self.print_and_log(f"Play count: {current_count}")

            # Go will not be scored here; will be scored during start_turn
            self.score_play(played_card, current_count)

            self.end_turn()

        # If not returned early, move was accepted
        response["accepted"] = True
        return response


    def add_score_log(self, player: str, points: int, reason: str, cards: list[str]):
        """Adds scores to player, prints scores to log, and adds to action log for client. Checks if player has scored enough to win."""

        # Add score to player object
        self.players[player].score += points
        
        # Check if `a` needs to be added in the log for grammar
        add_a = ["15", "31", "go", "run", "flush", "pair"]
        score_text = reason
        if reason in add_a:
            score_text = f"a {reason}"

        # Add to text log - this may be redundant with action log
        self.print_and_log(f"{player} scored {points} for {score_text}.")

        # Add to action log with cards so client can animate each score
        # Maybe replace adding to log with action log so message can go in log at the same time as animation takes place
        # Could recreate the log message on client-side with `player`, `points`, and `reason`
        # Should specify mode since pairs, 15s, and runs can be scored in both show and play
            # mode can be taken from self.mode
        self.add_to_action_log({"action": "score", "player": player, "points": points, "reason": reason, "cards": cards, "mode": self.mode})

        # Check if player has won on each score
        if self.players[player].score >= 121:
            self.print_and_log(f"{player} has won the game!")
            self.mode = "end_game"


    # Packages state for each player individually. Includes sid for socketio
    def package_state(self, player_name) -> dict:
        
        # Build lists in order of player_order to make sure they're unpacked correctly
        hand = []  # Hand for self - get from unplayed cards during play
        hand_sizes = []
        num_to_discard = 0  # number of cards self needs to discard
        total_scores = []  # Overall score of game (0-121)
        plays = []  # For the play - list of dicts {"player": ..., "card": ...}
        final_hands = []  # For the show
        final_scores = []  # Currently unused - may be useful for animating show score
        play_count = 0  # count for each play
        crib = []  # Only send crib if show
        starter = self.starter

        # Get hand for self - use `unplayed_cards` if during the play
        if self.mode == "play":
            hand = [card.portable for card in self.players[player_name].unplayed_cards]
        else:
            # Otherwise use hand
            hand = [card.portable for card in self.players[player_name].hand]

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
                hand_sizes.append(len(self.players[p_name].unplayed_cards))

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
                # Build plays - dict of players and cards for each move during the play
                plays.append({"player": play.player, "card": play.card.portable})

                # Count play
                play_count += play.card.value
        
        elif self.mode == "show":
            crib = [card.portable for card in self.crib]

        if self.starter is not None:
            starter = self.starter.portable

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
            "starter": starter,  # None | card string of starter if it exists
            "crib": crib,  # only send on show
            "crib_size": len(self.crib),  # show size of crib as players discard
            "dealer": self.dealer,  # dealer of round
            "plays": plays,  # list of dicts {"player": ..., "card": ...}
            "play_count": play_count,  # current count of the play
            "final_hands": final_hands,  # reveal all hands to all players
            # "final_scores": final_scores,  # reveal all scores to all players

            # Specific to player
            "recipient": player_name,
            "hand": hand,  # hand for self only
            "num_to_discard": num_to_discard,  # if discard phase, number of cards to discard
            "log": self.players[player_name].log,  # new log msgs - split up for each player
            "action_log": self.players[player_name].action_log,
        }
    


# Other helper functions
def is_run(potential_run: list[str]):
    """Check if all ranks provided are within 1 rank of each other. Run may be out of order."""

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