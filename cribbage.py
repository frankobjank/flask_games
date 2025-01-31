import random
from operator import attrgetter
from time import sleep
from collections import namedtuple
from itertools import combinations

# Global constants
ACE_VALUE = 1

# Ranks and ranks to value
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
RANK_TO_VALUE = {"2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 10, "Q": 10, "K": 10, "A": ACE_VALUE}

# Suits and unicode for suits
SUITS = ["spade", "heart", "diamond", "club"]

# Uses all `filled in` emojis
# ♠ "\u2660" - black
# ♥ "\u2665" - red
# ♦ "\u2666" - blue
# ♣ "\u2663" - green
SUIT_TO_DISPLAY = {"spade": "\u2660", "heart": "\u2665", "diamond": "\u2666", "club": "\u2663"}

Play = namedtuple("Play", ["player", "card"])


class Player:
    def __init__(self, name="") -> None:
        self.name = name
        self.order = 0
        self.hand = []
        self.score = 0
        self.unplayed_cards = []  # For the play
        self.played_cards = []  # For the play
        self.log = []
    

    def __repr__(self) -> str:
        return self.name


    def sort_hand(self) -> None:
        """Sort hand in order of suit."""

        self.hand = sorted(sorted(self.hand, key=attrgetter("suit"), reverse=True), key=attrgetter("value"), reverse=True)


class Card:
    def __init__(self, rank: str, value: int, suit: str, suit_display: str):
        self.rank = rank
        self.value = value
        self.suit = suit
        self.suit_display = suit_display
    
    def __repr__(self) -> str:
        return f"{self.rank}{self.suit_display}"


class Deck:
    def __init__(self) -> None:
        self.unshuffled_cards = [Card(rank, suit) for suit in SUITS for rank in RANKS]


    def __repr__(self) -> str:
        return f"Deck({self.unshuffled_cards})"


# counted as one "hand" (i.e. one cycle of turns before needing to shuffling again)
class Round:
    def __init__(self, player_order, num=0) -> None:
        
        ### From shared round
        
        self.num = num
        # current player and turn_num could be considered turn attributes but doesn't merit another class
        self.turn_num = 0
        self.round_log = []
        
        if len(player_order) > 0:
            # increment first player and set dealer
            first_player_index = ((num)-1) % len(player_order)
            self.first_player = player_order[first_player_index]
            self.current_player = player_order[first_player_index]
            self.dealer = player_order[first_player_index-1]
        
        ### End shared round

        self.crib = []
        self.starter = None
        self.go = [] # names of players; list for > 2 players
        self.go_scored = False
        self.current_plays = [] # list of Plays
        self.all_plays = []
        self.has_played_show = set() # names of players
    
    def new_play(self):
        if len(self.go) > 0:
            self.current_player = self.go[0]
        self.go = []
        self.go_scored = False
        self.current_plays = []
        self.round_log.append(f"Round ending, {self.current_player} will start the next round.")


class State:
    def __init__(self, room_name: str) -> None:

        # modes : TBD

        # Room
        self.room_name = room_name
        
        # Room constants
        self.MAX_PLAYERS = 3
        self.MIN_PLAYERS = 2

        # Game pieces
        self.deck = Deck()
        self.shuffled_cards = []
        # self.hand_size = varies
        self.players = {}  # Static; {player name: player object}
        self.player_order = []  # Dynamic; adjusted when player gets knocked out

        # self.turn_num = 0 # global - putting into Round
        self.log = [] # global - putting into Round
        # self.log_to_display = []
        # round.num defaults to 0 and increments on subsequent rounds
        self.round = Round(self.player_order)

        self.mode = "start"
        self.in_progress = False



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


    # all possible scores:
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

    
    def add_player(self, name: str) -> None:
        self.players[name] = Player(name)


    def print_and_log(self, msg, player="all") -> None:
        print(msg)

        # Send to all clients
        if player == "all":
            # Use all players so players receive msg even after knockout
            for p_object in self.players.values():
                p_object.log.append(msg)

        # Send to one specific client
        else:
            self.players[player].log.append(msg)


    def new_round(self) -> None:
        self.deck.shuffled_cards = self.shuffle_deck()
        for p_object in self.players.values():
            p_object.hand = []
            self.deal(p_object)

        self.round = Round(self.player_order, self.round.num+1)

        for p_object in self.players.values():
            p_object.played_cards = []
            p_object.unplayed_cards = []

        # default to 5 cards per hand; additional card for all except non-dealer players in P3 game
        if len(self.players.keys()) == 3:
            self.add_card_to_hand(self.players[self.round.dealer])
        else:
            for p_object in self.players.values():
                self.add_card_to_hand(p_object)

        for i in range(12):
            print("\n")
        print(f"--- ROUND {self.round.num} ---\n")
        print("\n--- DEALING ---")


    def new_game(self) -> None:
        self.players = {}
        self.player_order = []
        self.round = Round(self.player_order)

    def start_round(self):
        self.new_round()
        self.start_turn()

    def end_round(self):
        print(f"\n--- END OF ROUND {self.round.num} ---\n")
        hand_scores = "---     SCORES     ---\n\n"
        for player in self.player_order:
            hand_scores += f"{player}: {self.players[player].score}\n"
        
        print(hand_scores)
    
        if any(p_object.score == 121 for p_object in self.players.values()):
            self.mode = "end_game"
        else:
            self.mode = "end_round"
            

    def print_log(self):
        if len(self.round.round_log) == 0:
            return
        print_log = "-----LOG-----\n"
        for msg in self.round.round_log[-2*len(self.player_order):]:
            print_log += f"{msg}\n"
        print_log += "-------------"
        print(print_log)


    def print_players(self):
        print_players = ""
        for p_name in self.player_order:
            if p_name == self.round.current_player:
                print_players += "*"
            if p_name == self.round.dealer:
                print_players += "D-"

            print_players += f"{p_name}: {self.players[p_name].score}"

            if p_name in self.round.go:
                print_players += " - Go"
            
            print_players += "\n"
        print(f"\n{print_players}")
        print(f"It is {self.round.current_player}'s turn.\n")


    def set_mode(self):
        if 4 > len(self.round.crib):
            self.mode = "discard"
        elif len(self.round.crib) == 4:
            if 4*len(self.players.keys()) > len(self.round.all_plays):
                self.mode = "play"                
            
            elif 4*len(self.players.keys()) == len(self.round.all_plays):
                self.mode = "show"
                

    def mode_maintenance(self):
        if self.mode == "play":
            # set starter (one-time action when play starts)
            if self.round.starter.value == 0:
                self.round.starter = self.draw_card()
                # print(f"The starter is {self.round.starter}.\n")
                self.round.round_log.append(f"The starter is {self.round.starter}.")
                if self.round.starter.rank == "J":
                    print(f"The dealer ({self.round.dealer}) scores 2 points because the starter is a {self.round.starter}.\n")
                    self.add_score_log(self.round.dealer, 2, "his heels (starter is a J)")

            # set unplayed_cards
            for player in self.players.values():
                player.unplayed_cards = [card for card in player.hand if card not in player.played_cards]

            # reset play vars:
                # for 31 count after end of play is checked
                # if all players in round have said go and go has been scored
            if sum([play.card.value for play in self.round.current_plays]) == 31 or len(self.player_order) == len(self.round.go) and self.round.go_scored:
                self.round.new_play()
            # 3 total players, 1 is out of cards starting the round - they will actually need to say go and be counted in self.round.go so this will have the same result

        elif self.mode == "show":
            # reset turn_num to 0 at beginning of show 
            if len(self.round.has_played_show) == 0:
                self.round.turn_num = 0

    def get_next_player(self):
        player_order = self.player_order.copy()
        if self.mode == "play" and len(self.round.go) > 0:
            for player in self.round.go:
                player_order.remove(player)
        
        # if len == 0, have modulo by 0 error
        assert len(player_order) > 0, "Player order should be greater than 0, might have to catch end of play sooner."

        # at the end of a round, next player would be first player, but second player is new first player
        if self.mode == "end_round":
            first_player_index = self.player_order.index(self.round.first_player)
            return player_order[(first_player_index + 1) % len(player_order)]

        # make sure show starts with original first player of round
        elif self.mode == "show" and len(self.round.has_played_show) == 0:
            return self.round.first_player
        else:
            return player_order[((self.round.turn_num + ((self.round.num-1) % len(player_order))) % len(player_order))]


    def start_turn(self):
        self.set_mode()
        self.mode_maintenance()
        self.round.current_player = self.get_next_player()

        # KEEP turn_num increment AFTER set_current_player as current player is determined by turn_num
        self.round.turn_num += 1
        
        self.print_log()
        self.print_players()


    def end_turn(self):
        self.mode = "end_turn"
        # end round if all players have played show
        if len(self.round.has_played_show) == len(self.player_order):
            self.end_round()


    def format_play_msgs(self) -> dict:
        msgs_per_player = {player: "" for player in self.player_order}
        for p_name in self.player_order:
            for i in range(12 - len(p_name)):
                msgs_per_player[p_name] += " "
            # msgs_per_player[p_name] += "|"
        for play in self.round.current_plays:
            for p_name in self.player_order:
                if play.player == p_name:
                    # have to account for 10 (double digits)
                    if play.card.rank == "10":
                        msgs_per_player[p_name] += f"{play.card}|"
                    else:
                        msgs_per_player[p_name] += f"{play.card} |"
                else:
                    msgs_per_player[p_name] += "   |"
        return msgs_per_player


    def score_play(self, packet_msg: str) -> None:
        if packet_msg == "go":
            self.round.go.append(self.round.current_player)
            self.round.round_log.append(f"{self.round.current_player} has said 'Go'.")
            # score a go
            if len(set(self.player_order) - set(self.round.go)) == 1:
                player_left = next(iter(set(self.player_order) - set(self.round.go)))
                self.add_score_log(player_left, 1, "a go")
                self.round.go_scored = True
            
        else:
            played_card = self.players[self.round.current_player].unplayed_cards.pop(int(packet_msg)-1)
            play = Play(self.round.current_player, played_card)
            self.round.all_plays.append(play)
            self.round.current_plays.append(play)
            self.round.round_log.append(f"{play.player} played: {play.card}.")
            self.players[self.round.current_player].played_cards.append(played_card)

            # current_count = sum([play.card.value for play in self.round.current_plays])
            if sum([play.card.value for play in self.round.current_plays]) == 15:
                print("You get 2 points for a 15.")
                self.add_score_log(self.round.current_player, 2, "a 15")
            elif sum([play.card.value for play in self.round.current_plays]) == 31:
                if self.round.go_scored:
                    print("You get 1 point for a 31.")
                    self.add_score_log(self.round.current_player, 1, "a 31")
                else:
                    print("You get 2 points for a 31 and a go.")
                    self.add_score_log(self.round.current_player, 2, "a 31 and a go")

            # check for runs
            play_ranks = [play.card.rank for play in self.round.current_plays]
            
            pairs = [play_ranks[-1]]
            for rank in reversed(play_ranks[:-1]):
                if rank in pairs:
                    pairs.append(rank)
                else:
                    break

            if len(pairs) == 2:
                print("You get 2 points for a pair.")
                self.add_score_log(self.round.current_player, 2, "a pair")
            elif len(pairs) == 3:
                print("You get 6 points for three of a kind.")
                self.add_score_log(self.round.current_player, 6, "three of a kind")
            elif len(pairs) == 4:
                print("You get 12 points for four of a kind.")
                self.add_score_log(self.round.current_player, 12, "four of a kind")
            
            # check for runs (min 3)
            for i in range(len(play_ranks)-2):
                if self.is_run(play_ranks[i:]):
                    print(f"You played a run: {sorted(play_ranks[i:])}. You get {len(play_ranks[i:])} points.")
                    self.add_score_log(self.round.current_player, len(play_ranks[i:]), "a run")
                    break
            
            if all(len(player.unplayed_cards) == 0 for player in self.players.values()):
                print("You get one point for playing the last card")
                self.add_score_log(self.round.current_player, 1, "playing the last card")
        

    def score_show(self, four_card_hand: list, crib: bool):
        # check for pairs and runs. 6, 7, 7, 8 -> catch double (or triple) 7, calculate 15s and runs with each of the sevens. can use suit to differentiate
        show_hand = four_card_hand + [self.round.starter]
        score = 0
        if not crib:
            print(f"Hand = {four_card_hand}")
        elif crib:
            print(f"Crib = {four_card_hand}")

        print(f"Starter = {self.round.starter}\n")

        # count 15s
        for i in range(2, len(show_hand)+1):
            for j in combinations(show_hand, i):
                if sum(card.value for card in j) == 15:
                    self.sleep_print(f"2 points for a 15: {j}.")
                    # self.add_score_log(self.round.current_player, 2, "a 15")
                    score += 2

        # count pairs
        for cards in combinations(show_hand, 2):
            if cards[0].rank == cards[1].rank:
                self.sleep_print(f"2 points for a pair: {cards}.")
                # self.add_score_log(self.round.current_player, 2, "a pair")
                score += 2
        
        # jack matching suits with starter
        for card in four_card_hand:
            if card.rank == "J" and card.suit == self.round.starter.suit:
                self.sleep_print(f"1 point for his knobs ({card} matches the suit of the starter).")
                # self.add_score_log(self.round.current_player, 1, "J suit matching starter")
                score += 1
        
        # count runs
        runs = []
        for i in range(3, len(show_hand)+1):
            for pot_run in combinations(show_hand, i):
                if self.is_run(card.rank for card in pot_run):
                    runs.append(pot_run)
        if len(runs) > 0:
            max_len = max(len(run) for run in runs)
            runs = [run for run in runs if len(run) == max_len]
            for run in runs:
                self.sleep_print(f"{len(run)} points for a run: {sorted(run, key=lambda x: x.value)}.")
                # self.add_score_log(self.round.current_player, len(run), "a run")
                score += len(run)

        # flush
        if len(set(card.suit for card in show_hand)) == 1:
            self.sleep_print(f"{len(show_hand)} points for a flush.")
            # self.add_score_log(self.round.current_player, len(show_hand), "a flush")
            score += len(show_hand)
        
        if not crib:
            if len(set(card.suit for card in four_card_hand)) == 1:
                self.sleep_print(f"{len(four_card_hand)} points for a flush.")

        # if not crib: # redundant if statement
            # report overall show score
            # self.round.round_log.append(f"{self.round.current_player} scored {score}.")
            self.sleep_print(f"You scored {score}.")

        elif crib:
            self.sleep_print(f"You scored {score} from the crib.")
            # self.round.round_log.append(f"{self.round.current_player} scored {score} from the crib.")

        self.add_score_log(self.round.current_player, score, "the show")
        
        self.round.has_played_show.add(self.round.current_player)


    def is_run(self, potential_run):
        indices = sorted([["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"].index(card) for card in potential_run])
        if all(indices[i+1] - indices[i] == 1 for i in range(len(indices)-1)):
            return True
        return False


    def get_user_input(self) -> dict:
        # if self.debug:
            # print(f"MODE={self.mode}")
        user_input = ""
        packet = {}
        if self.mode == "start":
            accepted_inputs = [str(i) for i in range(2, self.max_players+1)]
            while True:
                user_input = input(f"How many players? Enter a number from 2-{self.max_players}.\n")
                if user_input not in accepted_inputs:
                    print("Invalid input. Please enter 2 or 3.")
                else:
                    break

            packet = self.user_input_to_packet(action="start", msg=user_input)
        
        elif self.mode == "add_player":
            if self.random_names_flag:
                user_input = self.random_names_list.pop(random.randint(0, len(self.random_names_list)-1))
            else:
                while len(user_input) == 0:
                    user_input = input("Please enter a name:\n")
                    if len(user_input) > 12:
                        user_input = user_input[:12]
            packet = self.user_input_to_packet(action="add_player", msg=user_input)
                
        elif self.mode == "discard":
            accepted_inputs = [str(i+1) for i in range(len(self.players[self.round.current_player].hand))]
            # not in accepted_inputs doesn't work here since user_input is multiple numbers (list/tuple) rather than a single string - can use subset
            # num_to_discard = len(self.players[self.round.current_player].hand) - 4
            # can either do while True and subsequent if/else statements or put them in while statement
            while len(user_input) == 0 or not set(user_input).issubset(accepted_inputs) or len(user_input) != len(self.players[self.round.current_player].hand) - 4:
                print(f"Please pick {len(self.players[self.round.current_player].hand) - 4} card(s) to add to the crib. The dealer is {self.round.dealer}.")
                self.print_state()
                for i, card in enumerate(self.players[self.round.current_player].hand):
                    print(f"[{i+1}]:{card}")
                user_input = input(f"Enter the indices of the card(s) you want to add to the crib, e.g. 35 or 3 5:\n")
                if " " in user_input:
                    user_input = user_input.split()
                elif len(user_input) == 2:
                    user_input = [user_input[0], user_input[1]]
            packet = self.user_input_to_packet(action="discard", msg=user_input)

        elif self.mode == "play":
            
            current_count = sum([play.card.value for play in self.round.current_plays])

            if all(current_count + card.value > 31 for card in self.players[self.round.current_player].unplayed_cards):
                self.print_state()
                print("\n")
                if len(self.player_order) - len(self.round.go) == 1:
                    go_players = ""
                    for player in self.round.go:
                        if len(go_players) == 1:
                            go_players += " and "
                        go_players += player
                    input(f"{go_players} said 'Go'. You cannot play any more cards.\nEnter any key to end the round.")
                else:
                    input("You cannot play any more cards.\nEnter any key to say 'Go'.\n")
                return self.user_input_to_packet(action="play", msg="go")

            accepted_inputs = [str(i+1) for i in range(len(self.players[self.round.current_player].unplayed_cards))]

            while True:                
                self.print_state()
                
                print(f"\nCurrent count: {current_count}")

                for i, card in enumerate(self.players[self.round.current_player].unplayed_cards):
                    print(f"[{i+1}]:{card}")
                    
                user_input = input("Enter the index of the card you want to play.\n")

                if user_input not in accepted_inputs:
                    print("Invalid input, please pick another one.")
                else:
                    if len(user_input) > 0 and current_count + self.players[self.round.current_player].unplayed_cards[int(user_input)-1].value > 31:
                        print("You cannot exceed 31. Please choose another card")
                    else:
                        # valid input, break
                        break
                    
            packet = self.user_input_to_packet(action="play", msg=user_input)

        elif self.mode == "show":
            while len(user_input) == 0:
                input("Enter any key to score the show.\n")
                user_input = "continue"
            packet = self.user_input_to_packet(action=user_input, msg="")

        elif self.mode == "end_turn" or self.mode == "end_round":
            if self.mode == "end_turn" and not self.debug and len(self.round.has_played_show) == 0:
                for i in range(14):
                    print("\n")
            while len(user_input) == 0:
                input(f"Please pass the computer to {self.get_next_player()}. Enter any key to continue.\n")
                user_input = "continue"
            packet = self.user_input_to_packet(action=user_input, msg="")

        elif self.mode == "end_game":
            abbr_to_word = {"n": "new_game", "q": "quit"}
            while user_input not in abbr_to_word.values():
                user_input = input("\nChoose one: [n]ew game or [q]uit\n")
                if user_input in abbr_to_word.keys():
                    user_input = abbr_to_word[user_input]
            packet = self.user_input_to_packet(action=user_input, msg="")

        return packet


    def user_input_to_packet(self, action, msg) -> dict:
        # actions: start, add_player, discard, play, continue, new_game, quit
        return {"action": action, "msg": msg}


    def update(self, packet: dict):
        # {"name": "", "action": "", "msg": ""}
        # actions: start, add_player, discard, play, continue, new_game, quit
        assert len(packet) > 0, "empty packet"
        if self.mode == "start":
            self.custom_add_players(num_players=int(packet["msg"]))
            self.mode = "add_player"

        elif self.mode == "add_player" and packet["action"] == "add_player":
            for p_name, p_object in self.players.items():
                # player name starts as order: int. continue through str player names
                if isinstance(p_name, str):
                    continue
                self.set_player_name(p_name, p_object, name_input=packet["msg"])
                break

            if all(isinstance(p_name, str) for p_name in self.players.keys()):
                # set_player_order only needs to happen once per game
                self.set_player_order()
                self.start_round()
                self.mode = "discard"
        
        elif self.mode == "discard" and packet["action"] == "discard":
            # discarded_card = self.players[self.round.current_player].hand.pop(int(packet["msg"])-1)
            cards_to_remove = []
            for i in packet["msg"]:
                cards_to_remove.append(self.players[self.round.current_player].hand[int(i)-1])
            for card in cards_to_remove:
                self.round.crib.append(card)
                self.players[self.round.current_player].hand.remove(card)
            self.end_turn()
        
        elif self.mode == "play" and packet["action"] == "play":
            self.score_play(packet["msg"])

            self.end_turn()
        
        elif self.mode == "show":
            self.score_show(four_card_hand=self.players[self.round.current_player].hand, crib=False)
            
            if self.round.current_player == self.round.dealer:
                input("\nEnter any key to score the crib.\n")
                self.score_show(four_card_hand=self.round.crib, crib=True)

            self.end_turn()
        
        elif self.mode == "end_turn":
            if packet["action"] == "continue":
                self.start_turn()
        elif self.mode == "end_round":
            if packet["action"] == "continue":
                self.start_round()
        elif self.mode == "end_game":
            if packet["action"] == "new_game":
                self.new_game_custom()
                self.mode = "start"
            elif packet["action"] == "quit":
                raise SystemExit(0)


    def print_state(self):
        if self.mode == "play":
            msgs_per_player = self.format_play_msgs()
            for p, msg in msgs_per_player.items():
                print(f"{p}: {msg}")
        else:
            self.sleep_print(f"Hand: {self.players[self.round.current_player].hand}")


    def add_score_log(self, player: str, points: int, reason: str):
        self.round.round_log.append(f"{player} scored {points} for {reason}.")
        self.players[player].score += points
        if self.mode == "play":
            input("Enter any key to continue.")
