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


def set_player_order(players:dict[str,Player], player_order:list[str]) -> None:
    """Sets player order to a random order and alters players dict and player_order list."""
    
    # Empty player order list
    player_order = []

    # Names to pick randomly
    player_names = [name for name in players.keys()]

    # Pick random player change order from 0 -> num players
    for i in range(len(player_names)):
        rand_player = player_names[random.randint(0, len(player_names)-1)]
        players[rand_player].order = i
        player_order.append(rand_player)
        player_names.remove(rand_player)

    # Reorder players dict
    new_player_dict = {}
    # Reorder the players dict (dicts are ordered now?) for parity with player order
    for player in player_order:
        new_player_dict[player] = players[player]

    # Assign old dict to new dict
    players = new_player_dict


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
