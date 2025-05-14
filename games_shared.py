### Functions shared by all games

def print_and_log(msg:str, players_dict:dict, player:str="all") -> None:
    """Print to terminal and add to players' logs"""

    print(msg)

    # Send to all clients
    if player == "all":
        # Use all players so players receive msg even after knockout
        for p_object in players_dict.values():
            p_object.log.append(msg)

    # Send to one specific client
    else:
        players_dict[player].log.append(msg)


def broadcast_start_message(player_order:list[str], players_dict:dict):
    """Broadcast starting message - standardized between games."""

    # Start message
    print_and_log("\n--- Starting new game ---\n", players_dict)

    # Player order
    print_and_log("\nPlayer order:", players_dict)
    for i, player in enumerate(player_order):
        print_and_log(f"{i+1}: {player}", players_dict)


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
