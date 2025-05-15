import random

### Functions and classes shared by all games
class Player:
    def __init__(self, name: str) -> None:
        self.name = name
        self.order = 0
        self.hand = []
        self.log = []  # Individual logs per player
        self.action_log = []  # List of dicts

    
    def __repr__(self) -> str:
        return f"Player({self.name})"


def print_and_log(msg:str, players:dict[str,Player], player:str="all") -> None:
    """Print to terminal and add to players' logs"""

    print(msg)

    # Send to all clients
    if player == "all":
        # Use all players so players receive msg even after knockout
        for p_object in players.values():
            p_object.log.append(msg)

    # Send to one specific client
    else:
        players[player].log.append(msg)


def broadcast_start_message(player_order:list[str], players_dict:dict):
    """Broadcast starting message - standardized between games."""

    # Start message
    print_and_log("\n--- Starting new game ---\n", players_dict)

    # Player order
    print_and_log("\nPlayer order:", players_dict)
    for i, player in enumerate(player_order):
        print_and_log(f"{i+1}: {player}", players_dict)


# Separated this and reorder_players for typing reasons. Needed one to return
# a list and one to return a dict so I made two functions
def set_player_order(player_order: list[str]) -> list[str]:
    """Sets player order to a random order. Returns the updated list."""
    
    # Empty player order list
    new_player_order = []

    # Pick random player change order from 0 -> num players
    for i in range(len(player_order)):
        rand_player = player_order[random.randint(0, len(player_order)-1)]
        new_player_order.append(rand_player)
        player_order.remove(rand_player)
    
    return new_player_order


def reorder_players(player_order: list[str], players: dict[str,Player]) -> dict[str,Player]:
    """Updates order attribute of player object."""
    new_players = {}

    # Pick random player change order from 0 -> num players
    for i, player in enumerate(player_order):
        # Add player object to new dict
        new_players[player] = players[player]
        # Set new order on player object
        new_players[player].order = i

    return new_players


# TODO fill in this function so action log works similarly to text log
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
