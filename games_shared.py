### Functions shared by all games

def print_and_log(msg, players_dict, player="all") -> None:
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
