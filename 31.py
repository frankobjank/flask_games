import shared_cards as shared
import random
import sys

class CustomState(shared.State):
    def __init__(self, ace_value=11, hand_size=3, max_players=7, random_names_flag=True) -> None:
        super().__init__(ace_value, hand_size, max_players, random_names_flag)
        
        # modes : start, add_players, main_phase, discard, end_turn, end_round, end_game
        # end_turn is specific to hotseat - otherwise, next turn can begin automatically
        self.mode = "start"
        
        self.dead_players = {} # could get rid of this by making a Round class that only includes players that aren't dead yet
        self.knocked = ""
        self.discard = []
        self.free_ride_alts = ["free ride", "on the bike", "on the dole", "riding the bus", "barely hanging on", "has a tummy ache", "has had a long day"]


    def calc_hand_score(self, player_object):
        hand_scores = {}
        for card in player_object.hand:
            if card.suit not in hand_scores.keys():
                hand_scores[card.suit] = 0
            hand_scores[card.suit] += card.value
        return max(hand_scores.values())


    def new_round_custom(self):
        self.new_round()
        self.discard = [self.draw_card()]
        self.knocked = ""
        for i in range(12):
            print("\n")
        print(f"--- ROUND {self.round.num} ---\n")
        print("\n--- DEALING ---")


    def new_game_custom(self):
        self.new_game()
        self.dead_players = {}


    def start_round(self):
        self.new_round_custom()
        self.start_turn()


    def end_round(self):
        # scenarios - win doesn't actually matter, just display who knocked and loser
            # BLITZ - everyone except highest loses a life
            # tie for loser - display knocked; no one loses
            # 1 loser - display one who knocked and one who lost
            # 1 loser AND loser knocked - loser loses 2 points
        print(f"--- END OF ROUND {self.round.num} ---\n")
        print("---     SCORES     ---\n")
        for player in self.player_order:
            hand_score = f"{player} - {self.calc_hand_score(self.players[player])}"
            if player == self.knocked:
                hand_score += " - k"
            print(f"{hand_score}")
        
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
                    self.players[lowest_hand_score_player].score -= 1
                else:
                    print(f"{lowest_hand_score_player} knocked but had the lowest score.\n{lowest_hand_score_player} loses 2 extra lives.")
                    self.players[lowest_hand_score_player].score -= 2
        
        knocked_out = [p_name for p_name, p_object in self.players.items() if 0 > p_object.score]
        
        for p_name in knocked_out:
            print(f"{p_name} has been knocked out.")
            self.dead_players[p_name] = self.players.pop(p_name)
            # the only time player_order must be changed
            self.player_order.remove(p_name)

        if len(self.players) == 1:
            winner = [p for p in self.players.keys()][0]
            print(f"\n{winner} wins!")
            self.mode = "end_game"
        else:
            self.mode = "end_round"
            print("\nRemaining Players' Extra Lives:")
            for p_name, p_object in self.players.items():
                msg = f"{p_name} - {p_object.score} extra lives"
                if p_object.score == 0:
                    msg += f" - ({self.free_ride_alts[random.randint(0, len(self.free_ride_alts)-1)]})"
                print(msg)
            print("\n")


    def start_turn(self):
        # 2 msgs per turn, so num to display is 2*num_players-1
        log_to_display =  self.round.round_log[-2*(len(self.player_order)-1):]
        for msg in log_to_display:
            print(msg)
        self.round.turn_num += 1
        print_players = ""
        for p_name in self.player_order:
            if p_name == self.round.current_player:
                print_players += "*"
            print_players += f"{p_name} "
        print(f"\nPlayer order: {print_players}")
        print(f"It is {self.round.current_player}'s turn.\n")

        self.mode = "main_phase"


    def end_turn(self):
        self.round.current_player = self.player_order[((self.round.turn_num + ((self.round.num-1) % len(self.player_order))) % len(self.player_order))]
        if self.round.current_player != self.knocked:
            self.mode = "end_turn"
        else:
            self.end_round()


    def check_for_blitz(self):
        return self.calc_hand_score(self.players[self.round.current_player]) == 31


    #  MOVE TO CLIENT
    def get_user_input(self) -> dict:
        user_input = ""
        packet = {}
        if self.mode == "start":
            accepted_inputs = [str(i) for i in range(2, self.max_players+1)]
            while user_input not in accepted_inputs:
                user_input = input(f"How many players? Enter a number from 2-{self.max_players}.\n")
            packet = self.user_input_to_packet(action="start", msg=user_input)
        
        elif self.mode == "add_player":
            if self.random_names_flag:
                # using while loop here removes the need to .pop and reset list every game
                while user_input not in self.random_names_list:
                    user_input = self.random_names_list[random.randint(0, len(self.random_names_list)-1)]
            else:
                while len(user_input) == 0:
                    user_input = input("Please enter a name:\n")
                    if len(user_input) > 12:
                        user_input = user_input[:12]
            packet = self.user_input_to_packet(action="add_player", msg=user_input)
        
        elif self.mode == "main_phase":
            abbr_to_word = {"p": "pickup", "d": "draw", "k": "knock"}
            while user_input not in abbr_to_word.values():
                self.print_state()
                user_input = input("Choose one: [p]ickup, [d]raw or [k]nock\n")
                if user_input in abbr_to_word.keys():
                    user_input = abbr_to_word[user_input]
            packet = self.user_input_to_packet(action=user_input, msg="")
        
        elif self.mode == "discard":
            accepted_inputs = [str(i+1) for i in range(len(self.players[self.round.current_player].hand))]
            while user_input not in accepted_inputs:
                self.print_state()
                for i, card in enumerate(self.players[self.round.current_player].hand):
                    print(f"[{i+1}]:{card}")
                user_input = input(f"Enter the index of the card you want to discard:\n")
            packet = self.user_input_to_packet(action="discard", msg=user_input)

        elif self.mode == "end_turn" or self.mode == "end_round":
            if self.mode == "end_turn":
                for i in range(14):
                    print("\n")
            while len(user_input) == 0:
                input("Enter any key to continue.\n")
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

    #  MOVE TO CLIENT
    def user_input_to_packet(self, action, msg) -> dict:
        # actions: start, add_player, draw, pickup, knock, discard, continue, new_game, quit
        return {"action": action, "msg": msg}


    def update(self, packet: dict):
        # {"name": "", "action": "", "msg": ""}
        # actions: start, add_player, draw, pickup, knock, discard, continue, new_game, quit
        if self.mode == "start":
            self.add_players(num_players=int(packet["msg"]))
            for p_object in self.players.values():
                # set extra lives (score) to +3
                p_object.score += 3
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

        elif self.mode == "main_phase":
            taken_card = None
            if packet["action"] == "knock":
                if len(self.knocked) > 0:
                    print(f"{self.knocked} has already knocked. You must pick a different move.")
                    return
                self.knocked = self.round.current_player
                print(f"{self.round.current_player} has knocked.")
                self.round.round_log.append(f"{self.round.current_player} knocked.")
                self.end_turn()
                return

            elif packet["action"] == "pickup":
                # convert to str here for type consistency
                taken_card = self.discard.pop()
                print(f"\nYou pick up a {taken_card} from discard.")
                self.round.round_log.append(f"{self.round.current_player} picked up a {taken_card} from discard.")

            elif packet["action"] == "draw":
                taken_card = self.draw_card()
                print(f"\nYou draw: {taken_card}.")
                self.round.round_log.append(f"{self.round.current_player} drew a card from the deck.")
            
            self.players[self.round.current_player].hand.append(taken_card)
            self.mode = "discard"

            if self.check_for_blitz():
                print(f"{self.round.current_player} BLITZED!!!")
                self.end_round()

        elif self.mode == "discard" and packet["action"] == "discard":
            discarded_card = self.players[self.round.current_player].hand.pop(int(packet["msg"])-1)
            self.discard.append(discarded_card)
            self.round.round_log.append(f"{self.round.current_player} discarded: {discarded_card}")
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
        if len(self.discard) > 0:
            discard_card = self.discard[-1]
        else:
            discard_card = None
        print(f"Current Hand: {self.players[self.round.current_player].hand}. Score: {self.calc_hand_score(self.players[self.round.current_player])}")
        print(f"Discard: {discard_card}")
        

# main loop
def hotseat(random_names_flag=True):
    state = CustomState(random_names_flag)
    
    while True:
        packet = state.get_user_input()
        state.update(packet)

hotseat(random_names_flag=True)
