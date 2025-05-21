# native library
import random

# helper files
from cards_shared import *

### Functions and classes shared by all games
class Player:
    def __init__(self, name: str) -> None:
        self.name = name
        self.order = 0
        self.hand = []
        self.log = []  # Individual log messages per player
        self.action_log = []  # List of dicts TODO implement this

    
    def __repr__(self) -> str:
        return f"Player({self.name})"


# Parent state class that the games are built upon
class BaseState:
    def __init__(self, room_name: str) -> None:

        # Room
        self.room_name = room_name
        
        self.players = {}  # Static; {player name: player object}
        self.player_order = []  # Dynamic; adjusted when player gets knocked out

        # Gameplay
        self.mode = "start"
        self.in_progress = False
        
        # Should move action log to player object for parity with text log
        self.action_log = []  # A list of action dicts for each action {"action": "", "player": "", "card": ""}


    def print_and_log(self, msg:str, player:str="all") -> None:
        """Print to terminal and add to players' logs"""

        print(msg)

        # Send to all clients
        if player == "all":
            # Use all players so players receive msg even after knockout
            for p_object in self.players.values():
                p_object.log.append(msg)

        # Send to one specific client
        else:
            self.players[player].log.append(msg)


    def broadcast_start_message(self):
        """Broadcast starting message - standardized between games."""

        # Start message
        self.print_and_log("\n--- Starting new game ---\n")

        # Player order
        self.print_and_log("\nPlayer order:")
        for i, player in enumerate(self.player_order):
            self.print_and_log(f"{i+1}: {player}")


    # Separated this and reorder_players for typing reasons. Needed one to return
    # a list and one to return a dict so I made two functions. Also reorder_players
    # must be in specific State rather than general because it specifies specific
    # player types, i.e. PlayerThirtyOne or PlayerCribbage
    def set_player_order(self) -> list[str]:
        """Sets the player order list to a random order. Returns the updated list."""
        
        # Empty player order list
        new_player_order = []

        # Pick random player change order from 0 -> num players
        for i in range(len(self.player_order)):
            rand_player = self.player_order[random.randint(0, len(self.player_order)-1)]
            new_player_order.append(rand_player)
            self.player_order.remove(rand_player)
        
        return new_player_order


    # TODO - low priority - may not be necessary; maybe can send on non-board updates
    # fill in this function so action log works similarly to text log
    # def add_to_action_log(action, target_object, players_dict, recipient="all") -> None:
        
    #      {"action": "", "player": "", "card": ""}

    #     # Send to all clients
    #     if recipient == "all":
    #         # Use all players so players receive msg even after knockout
    #         for p_object in players_dict.values():
    #             p_object.log.append(msg)

    #     # Send to one specific client
    #     else:
    #         players_dict[player].log.append(msg)
