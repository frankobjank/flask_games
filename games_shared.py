### Functions shared by all games

def print_and_log(msg, players_dict, player="all") -> None:
    print(msg)

    # Send to all clients
    if player == "all":
        # Use all players so players receive msg even after knockout
        for p_object in players_dict.values():
            p_object.log.append(msg)

    # Send to one specific client
    else:
        players_dict[player].log.append(msg)
