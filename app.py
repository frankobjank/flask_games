# Python official modules
import os
import sqlite3
from time import time, localtime, strftime
import werkzeug.security as ws

# Flask modules
import flask as fl
from flask_session import Session
import flask_socketio as fio

# Local Python files
from helpers import *
import thirty_one_game

# link to access app for debug http://127.0.0.1:5000

##### TODO #####
# Having temporary usernames persist outside of game room will cause issues with duplicate usernames. 
# Should make usernames link on re-joining a room, but NOT re-joining lobby

# Configure application

def create_app():
    app = fl.Flask(__name__)
    app.config.from_mapping(
        SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev_key'
    )
    
    return app

app = create_app()
# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Sets flask logging to Error only
# log = logging.getLogger('werkzeug')
# log.setLevel(logging.ERROR)

# Configure socketio
# With logs
socketio = fio.SocketIO(app, logger=True, engineio_logger=True)

# Without logs
# socketio = fio.SocketIO(app) #, logger=True, engineio_logger=True)

users = {}

rooms = {}

GAMES_TO_CAPACITY = {"thirty_one": 7, "cribbage": 3, "natac": 4}

rooms["lobby"] = Room(
    # This limits the lobby to 10000 people. Instead can skip capacity validation 
    # on join for lobby
    name="lobby", roompw="", game_name="", capacity=10000, date_created=int(time()), 
    creator="Frankobjank"
)

rooms["Test_1"] = Room(
    name="Test_1", roompw="", game_name="thirty_one",
    capacity=GAMES_TO_CAPACITY["thirty_one"], date_created=int(time()), creator="Frankobjank"
)

rooms["Test_2"] = Room(
    name="Test_2", roompw=ws.generate_password_hash("llll"), 
    game_name="thirty_one", 
    capacity=GAMES_TO_CAPACITY["thirty_one"], date_created=int(time()), creator="Frankobjank"
)


# Uses session cookie
# If there's nothing in flask or socketio that tracks when users join
    # can add timestamp session was created to User class

# Users can set username without creating an account
# To test existence of account, check `user_id`

# Users for testing: [frankobjank, burnt, AAAA, newuser, richard]


@app.after_request
def after_request(response):
    """Ensure responses aren't cached"""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Expires"] = 0
    response.headers["Pragma"] = "no-cache"
    return response


@app.route("/")
def index():
    # Display game options and option to view All
    print(f"Session on index: {fl.session}")
    return fl.render_template("index.html")


@app.route("/game")
# Redirect to username if session username is not set
# @username_required
# Can't decide if redirecting to set_username on initial GET for game is a good idea
# I think people should be able to see the lobby before being asked to set a name.
# Maybe put up a modal popup whenever 'create room' or a room is clicked.
def game():
    fl.session["last_page"] = fl.url_for("game")
    
    # Load lobby on GET

    # For random name
    # username = fl.session.get("username", "")
    # if len(username) == 0:
    #     username = get_random_name()
    
    # Make sure session cookie is captured
    fl.session["session_cookie"] = fl.request.cookies.get("session")

    return fl.render_template("game.html")


# -- FlaskSocketIO -- #
@socketio.on("create_room")
def on_create_room(data):
    
    print(f"Received on create_room: {data}")
    # Data keys: 'new_room_name', 'game', 'username', 'room' (i.e. lobby);
    
    if data.get("room", "") != "lobby":
        msg = "Canceling Create Room request: request did not originate from lobby."
        print(msg)
        return {"msg": msg, "accepted": False}
    
    if data.get("game", "") not in GAMES_TO_CAPACITY.keys():
        msg = f"Canceling Create Room request: game {data.get('game')} is not in list of accepted inputs."
        print(msg)
        return {"msg": msg, "accepted": False}
    
    new_room_name = data.get("new_room_name", "")

    validation = validate_name_input(name=new_room_name, max_len=18)

    if not validation["accepted"]:
        print(validation["msg"])
        return {"msg": validation["msg"], "accepted": False}

    # Add a dupe check here - redundant to rooms db check but
    # this is better to use for now because db is currently not being used
    if new_room_name in rooms.keys():
        msg = f"Canceling Create Room request: room with same name already exists."
        print(msg)
        return {"msg": msg, "accepted": False}

    # TODO Add ability to set password via room creation
    
    # # Attempt to add room to database, checks for dupe
    # try:
    #     # If not dupe, add row to table
    #     with sqlite3.connect("database.db") as conn:
    #         conn.execute("""
    #                      INSERT INTO rooms (room, roompw, game, date_created, date_last_used, capacity, creator)
    #                      VALUES (?, ?, ?, ?, ?, ?, ?)
    #                      """,
    #                     (new_room_name,
    #                      ws.generate_password_hash(data.get("password", "")),
    #                      data["game"],
    #                      int(time()),
    #                      int(time()),
    #                      GAMES_TO_CAPACITY[data["game"]],
    #                      data["username"]))

    # # Dupe room name
    # except sqlite3.IntegrityError:
    #     msg = f"Canceling Create Room request: room with same name already exists."
    #     print(msg)
    #     return {"msg": msg, "accepted": False}
    
    # Add room to dict (and database)
    
    rooms[new_room_name] = Room(name=new_room_name,
                                roompw=ws.generate_password_hash(data.get("password", "")), 
                                game_name=data["game"],
                                capacity=GAMES_TO_CAPACITY[data["game"]],
                                date_created=int(time()),
                                creator=data["username"])
    
    # Push new room to all other users in lobby
    # `rooms` is the rooms to add; `room` is room USER IS CURRENTLY IN
    # Don't need to add all rooms, just new room
    fio.emit("update_lobby", {"action": "add_rooms", "room": data["room"], 
             "rooms": [rooms[new_room_name].package_self()]}, to="lobby")
    
    # Use pass / fail for status to denote success of request
    return {"accepted": True}


@socketio.on("set_username")
def on_set_username(data):
    username = data.get("username_request", "")

    if len(fl.session.get("username", "")) > 0:
        print("Canceling Set Username request: username already set.")
        # Sending callback received to `emitWithAck`
        return {"msg": "Canceling Set Username request: username already set.", "accepted": False}
    
    validation = validate_name_input(name=username, max_len=12)

    if not validation["accepted"]:
        print(validation["msg"])
        return {"msg": validation["msg"], "accepted": False}
    
    # TODO username validation - check db for duplicate, check existing rooms for duplicate

    # TODO If username is accepted, add to database ! As a temporary user. 
    # Temporary user can be anyone in db who doesn't have a password
    # On cleanup (every 3 hours?) users who are in DB without a password who were created over 24 hours ago can be deleted. First check if they are currently in any room.

    # Check for dupe name in all rooms
    # This double loop is inefficient -
        # Can optimize by storing all users not in db in a set to check against
        # This would eliminate duplicates between rooms
        # Maybe store all usernames in a db, with temporary flag for those who did not create an account? and temporary entry is deleted .. 24 hours after last disconnect?
        # When this cleanup is run, rooms not used for 24 hours should also be deleted
    for room in rooms.values():
        for user in room.users:
            # This doesn't allow anyone to re-join, adding check for cookie
            # if user.name == username:
            if user.name == username and user.session_cookie != fl.session["session_cookie"]:
                msg = "Canceling Set Username request: username already taken."
                print(msg)
                return {"msg": msg, "accepted": False}
    
    # Update name in session dict and in room's user list
    # I think session may not be able to updated on a websocket event
    # See below - name will be updated via room `users`
    fl.session["username"] = username
    
    # Use session id to see if user already exists in lobby (i.e. on reconnection)
    # If found, set user.name to name requested
    # Setting username should only happen in lobby, therefore only need to search lobby to find user
    # Can make users a dict to shorten lookup time?
    for user in rooms["lobby"].users:
        if fl.session["session_cookie"] == user.session_cookie and len(user.name) == 0:
            
            user.name = username
            # Break after first match
            break
    
    # Return accepted username and response True
    return {"username": username, "accepted": True}


@socketio.on("prejoin")
def on_prejoin(data):
    # Validate user join request and find if user has joined before - to recover username
    response = {
        "can_join": False,
        "username": "",
        "msg": "",
    }

    # If lobby, exit check early and allow join
    if data["room"] == "lobby":
        response["can_join"] = True
        return response
    
    # BELOW CODE APPLIES ONLY TO GAMEROOMS - NOT LOBBY

    # Check if room is full
    if rooms[data["room"]].is_full():
        response["can_join"] = False
        response["msg"] = "room_full"
        return response
        
    # Check if room is password-protected
    if len(rooms[data["room"]].roompw) > 0:
        # Check if user provided password
        if len(data.get("password", "")) == 0:
            response["can_join"] = False
            response["msg"] = "prompt_for_password"
            return response
        
        # Check if provided password is correct
        elif not ws.check_password_hash(rooms[data["room"]].roompw, data["password"]):
            response["can_join"] = False
            response["msg"] = "incorrect_password"
            return response
        
        # If password correct, implicitly proceed
        print("Password correct; proceeding to other checks.")

    # Check if user is rejoining; if rejoining will not need to set a username
    # TODO Can also use IP address for this, as browser crash or taking a break and
    # resuming later are still big issues
    print("Checking session cookie for rejoin")
    for user in rooms[data["room"]].users:
        
        # Check if session cookie matches 
        if user.session_cookie == fl.session["session_cookie"]:
            
            # User must NOT be connected in order to rejoin
            if not user.connected:

                response["can_join"] = True
                response["username"] = user.name    
                # Update sid in user object
                user.sid = fl.request.sid
                break

            # If user is still is connected, prevent from joining
            elif user.connected:
                response["can_join"] = False
                response["msg"] = "name_already_connected"
                return response
        
    # User was not found
    if len(response["username"]) == 0:

        # Check if game is in progress; don't allow new users to join mid-game
        if rooms[data["room"]].game and rooms[data["room"]].game.in_progress:
            response["can_join"] = False
            response["msg"] = "game_in_progress"
            return response
        
        # Game not in progress, but user must set username - i.e. via modal
        else:
            response["can_join"] = False
            response["msg"] = "prompt_for_username"
            return response
        
    # User was found; make sure name isn't taken
    elif len(response["username"]) > 0:
        if fl.session.get("username", "") in [user.name for user in rooms[data["room"]].users if user.connected]:
            response["can_join"] = False
            response["msg"] = "name_taken"
            return response
    
    # Did not hit any early exits;
    print(f"End of prejoin checks; returning = {response}")
    return response


@socketio.on("join")
def on_join(data):
    # Change to unique url room solution?
        # potentially with option of making public and being added to a lobby
    
    print(f"Users on join: {rooms[data['room']].users} before processing.")

    fio.emit("debug_msg", {"msg": "Server received join event."}, to=fl.request.sid)
    
    # Lobby should not have usernames associated with it because a user could have different names in different rooms.
    # This creates a question about how to deal with temporary usernames vs registered usernames
    # If a registered user goes to the lobby, the lobby will not 'know' who they are
        # One possible fix for this is to RESERVE fl.session["username"] for registered users and to only use rooms["room_name"].users for usernames

    # For lobby
    if data["room"] == "lobby":

        # Initial setup - room infrastructure
        fio.emit("update_lobby", {"action": "setup_room", "room": data["room"],
                 "username": fl.session.get("username", "")}, to=fl.request.sid)
        
        # Join the room
        fio.join_room(data["room"])
        
        print(f"{fl.session.get('username', '(Name not in flask session)')} joined {data['room']}.")
        
        # Add rooms to lobby (rows in table)
        fio.emit("update_lobby", {"action": "add_rooms", "room": data["room"], 
                 "username": fl.session.get("username", ""), 
                 "rooms": [room.package_self() for room in rooms.values()
                           if room.name != "lobby"]}, to=fl.request.sid)
        
        # Exit early
        return "Server callback: lobby join completed."

    # Game room only, not lobby
    # This can be pared down because it does not have to account for not knowing names and then adding them later. It can be assumed that all game rooms will be joined WITH names, and the only reconnecting event that will happen is matching up session cookies with names.
        # Problem: this means that even a registered user won't be able to reconnect if they have a new session cookie (i.e. on browser crash or something).
        # Possible solutions: let a user reconnect with the same name and different session cookie if they are a registered user (i.e. check the database, OR create some kind of distinction between registered users and temporary users in the flask session)
    if data["room"] != "lobby":
        
        # Moved password check and room full check to prejoin
        # # Check password if room has password
        # if len(rooms[data["room"]].roompw) > 0:
        #     if not ws.check_password_hash(rooms[data["room"]].roompw, data.get("password", "")):
        #         msg = "Incorrect password; Unable to join."
        #         print(msg)
        #         fio.emit("debug_msg", {"msg": msg}, to=fl.request.sid)
        #         return msg

        # Check if room full
        # if rooms[data["room"]].is_full():
        #     msg = f"{data['room']} is full; Unable to join."
        #     print(msg)
        #     fio.emit("debug_msg", {"msg": msg}, to=fl.request.sid)
            
        #     # Should already be in lobby, stay in lobby
        #     return msg

        # Allow to join with no username; check if user is RE-JOINING in below loop that creates `user` object
        # # Do not allow client to join non-lobby room with no username
        # if len(fl.session.get("username", "")) == 0:
        #     msg = f"Username is not set; cannot join {data['room']}."
        #     print(msg)
        #     fio.emit("debug_msg", {"msg": msg}, to=fl.request.sid)
        #     return msg
        
        # Ensure username does not conflict with anyone in room - should be a validation in set_username?
        if fl.session.get("username", "") in [user.name for user in rooms[data["room"]].users if user.connected]:
            msg = "Someone in the room has the same name as you; cannot join."
            print(msg)
            fio.emit("debug_msg", {"msg": msg}, to=fl.request.sid)
            return msg

    # Initiate user object for use below
    user = None

        # - a step that will happen right before calling join to know whether to prompt user for name
    
    # This loop may be redundant, but not sure user.connected should be set to true during prejoin
    # So 2 loops may be necessary

    for room_user in rooms[data["room"]].users:
        # Use session cookie to see if user exists in room already; update sid and connection status
        if room_user.session_cookie == fl.session["session_cookie"]:

            print(f"User {room_user.name} was found in room {data['room']}. Updating sid from {room_user.sid} TO {fl.request.sid}")
            
            # Copy new sid to room_user object
            room_user.sid = fl.request.sid

            # If user found, set connected to True
            room_user.connected = True

            # Assign to `user` for using below
            user = room_user

    # REDUNDANT WITH PREJOIN
    # Check if username is set (would not be set for a non-registered user)
    if not user:
        # Check username exists
        if len(fl.session.get("username", "")) == 0:
            # If client receives this in callback, should bring up username modal.
            return "prompt_for_username"

        # Moving this to prejoin
        # # Check if game is in progress; don't allow new users to join mid-game
        # if rooms[data["room"]].game and rooms[data["room"]].game.in_progress:
        #     msg = "Game is in progress; Unable to join."
        #     print(msg)
        #     fio.emit("debug_msg", {"msg": msg}, to=fl.request.sid)
        #     return msg
        
        # If username exists and no existing user matches, create new user object.
        # If a user connects to multiple rooms, a new user object will be created for each one.
        user = User(
            name = fl.session.get("username", ""), 
            session_cookie = fl.session.get("session_cookie", ""), 
            sid = fl.request.sid,
            connected = True
        )

        # Add new user to room clients
        rooms[data["room"]].users.append(user)

        print(f"Added user to room {data['room']}")
    
    # # Assign random name if session cookie not found
    # if len(user.name) == 0:
        
    #     # ALLOW USER TO CREATE THEIR OWN USERNAME - will have to implement on client side

    #     # Pass in current room names to avoid duplicates
    #     user.name = get_random_name(exclude = {connected_user.name for connected_user in rooms[data["room"]].users})
    #     print(f"Random name chosen = {user.name}")


    # Store username in session if username is not set yet
    if len(fl.session.get("username", "")) == 0:
        fl.session["username"] = user.name


    # For game room
    # Set up client's username on their end
    # THIS MUST HAPPEN BEFORE ADD_PLAYERS SO USERNAME IS SET
    fio.emit("update_gameroom", {"action": "setup_room", "room": data["room"],
                "username": user.name}, to=fl.request.sid)
    
    print(f"Users on join: {rooms[data['room']].users} after processing.")

    # Join the room
    fio.join_room(data["room"])
    
    print(f"{user.name} joined {data['room']}.")
        
    # Joining game room - NOT lobby

    # Log msg that player has joined
    fio.emit("chat_log", {"msg": f"{user.name} has joined {data['room']}.", "sender": "system",
             "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])

    
    # Send updated player count to anyone remaining in lobby
    fio.emit("update_lobby", {"action": "update_lobby_table", "row": data["room"], "col": "players",
             "new_value": f"{rooms[data['room']].get_num_connected()} / {rooms[data['room']].capacity}"}, 
             to="lobby")
    
    # Check if game exists; different rules for game vs not game
    game = rooms[data["room"]].game

    # If game doesn't exist or game is not in progress, add only players who are connected
    # TODO Check special cases, i.e. new games with different players in same room
    if not game or not game.in_progress:
        print(f"Sending update room to {data['room']} to add {list((user.name for user in rooms[data['room']].users if user.connected))}")

        # Send updated list of players to others in room
        fio.emit("update_gameroom", {"action": "add_players", "room": data["room"],
                 "players": list(user.name for user in rooms[data["room"]].users if user.connected)},
                 room=data["room"], broadcast=True)
    
    # If game does exist, add ALL players in game on reconnect
    # Use all players list to send updates to players who are knocked out
    elif game and game.in_progress and user.name in game.players.keys():

        print(f"Sending update room to {data['room']} to add {list(game.players.keys())}")

        # Send updated list of players to others in room
        fio.emit("update_gameroom", {"action": "add_players", "room": data["room"],
                 "players": list(game.players.keys())},
                 room=data["room"], broadcast=True)
        
        game_update = game.package_state(user.name)
                    
        # Send game data if game in progress
        print(f"Sending game state to {user.name} on join: \n{game_update}")    
        fio.emit("update_board", game_update, to=fl.request.sid, room=data["room"])
        fio.emit("debug_msg", {"msg": f"Server sent game state on join."}, to=fl.request.sid)
        
        # If player is rejoining, update connection status for all other clients in room
        fio.emit("update_gameroom", {"action": "conn_status", "room": data["room"], 
                 "players": [user.name], "connected": True}, room=data["room"], broadcast=True)

        # Empty log for player after update is sent
        game.players[user.name].log = []

    return "Server callback: game room join completed."
        

@socketio.on("leave")
def on_leave(data):
    # Disconnect handles leaving the page or disconnecting other ways;
    # Leave can handle leaving the current room to go to the lobby
    # For debug:
    print("ON LEAVE")
    
    print(f"{data['username']} has left the {data['room']} room.")
    
    fio.leave_room(data["room"])

    # In lieu of removing user from room users dict:
    # Set connected to False so that user persists
    for user in rooms[data["room"]].users:
        if fl.session["session_cookie"] == user.session_cookie and fl.session["username"] == user.name:
            user.connected = False
            

    # For leaving lobby
    if data["room"] == "lobby":
        fio.emit("update_lobby", {"action": "teardown_room", "room": data["room"]}, to=fl.request.sid)

        # Will update lobby player counts when leaving game room, but not lobby

        # Exit early
        return "Server callback: successful leave."
    

    # For leaving game room

    # Send updated player count to anyone remaining in lobby
    fio.emit("update_lobby", {"action": "update_lobby_table", "row": data["room"], "col": "players",
             "new_value": f"{rooms[data['room']].get_num_connected()} / {rooms[data['room']].capacity}"}, to="lobby")

    # Teardown game room for user leaving
    fio.emit("update_gameroom", {"action": "teardown_room", "room": data["room"]}, to=fl.request.sid)

    # Notify the rest of clients in the room that user has left
    fio.emit("chat_log", {"msg": f"{data['username']} has left.", "sender": "system",
                          "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, 
                          to=data["room"])
    
    # Update leaving player's connection status to False for all others in game room
    fio.emit("update_gameroom", {"action": "conn_status", "room": data["room"],
                                 "players": [data["username"]], "connected": False}, to=data["room"],
                                 broadcast=True)

    # Can leave freely if:
        # Not game OR if game AND game is not in progress:
    
    # Remove leaving player from list of players
    if not rooms[data["room"]].game or (rooms[data["room"]].game 
                                        and not rooms[data["room"]].game.in_progress):
        
        # Remove all non-connected players
        # Broadbast = True since notification should go to all other players in room
        fio.emit("update_gameroom", {"action": "remove_players", "room": data["room"],
                 "players": list(user.name for user in rooms[data["room"]].users 
                 if not user.connected)}, room=data["room"], broadcast=True)
    
    # Return statement serves as callback
    return "Server callback: successful leave."


# Custom event - "move"
@socketio.on("move")
def on_move(data):

    # For debug:
    print(f"Received move event `{data['action']}` from client `{fl.session.get('username')}`.")
    
    # If client requests start, check number of players in room
    if data["action"] == "start":
        
        # Reject if invalid number of players
        if not (2 <= rooms[data["room"]].get_num_connected() <= 7):
            fio.emit("debug_msg", {"msg": "Invalid number of players."}, to=fl.request.sid)
            print("Invalid number of players.")
            
            fio.emit("chat_log", {"msg": f"Must have between 2 and 7 people to start game.",
                     "sender": "system", "time_stamp": strftime("%b-%d %I:%M%p", localtime())},
                     to=fl.request.sid)
            return
        
        if not rooms[data["room"]].game:
            rooms[data["room"]].game = thirty_one_game.State(data["room"])
        
        # Reject if game has already started
        if rooms[data["room"]].game.in_progress:
            fio.emit("debug_msg", {"msg": "Game is already in progress; Cannot start game."}, 
                     to=fl.request.sid)
            print("Game is already in progress.")
        
        # Add all players to game state since there are the correct number
        for user in rooms[data["room"]].users:
            if user.connected:
                fio.emit("debug_msg", {"msg": f"Adding {user} to game."}, to=fl.request.sid)
                print(f"Adding {user} to game.")
                rooms[data["room"]].game.add_player(user.name, user.sid)

    game = rooms[data["room"]].game
    
    # Exit early if game does not yet exist
    if not game:
        msg = "The game has not started yet."
        fio.emit("debug_msg", {"msg": msg}, to=fl.request.sid)
        fio.emit("chat_log", {"msg": msg, "sender": "system", 
                 "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, to=fl.request.sid)
        return
    
    # Check that username is current player if game has started
    # Only allow input from all players to click continue during round ending
    if game.in_progress and game.mode != "end_round" and fl.session.get("username", "") != game.current_player:
        
        print("Not accepting move from non-current player while game is in progress.")
        fio.emit("debug_msg", {"msg":f"Server rejected move request; Client not current player."},
                 to=fl.request.sid)
        
        return

    # Update based on data.action, data.card
    if game.update(data) == "reject":
        
        # Send on server reject
        print(f"Rejecting `{data['action']}` from `{fl.session.get('username')}`")
        fio.emit("debug_msg", {"msg": f"Server rejected move event `{data['action']}`"}, 
                to=fl.request.sid)

    # Send on server accept; Tailored response to each player
    else:
        
        # Save in_progress var before game update
        in_progress_before_update = game.in_progress
        
        for username in game.players.keys():
            
            response = game.package_state(username)
            
            # have to specify the 'to' parameter of 'emit' to send to specific player
            # is sid needed for this? Not sure how to get all the sids of everyone in room
            print(f"Sending response: \n{response} \non {data['action']}")
            
            fio.emit("update_board", response, to=response["sid"], room=data["room"])
            
            fio.emit("debug_msg", {"msg": 
                    f"Server accepted move event `{data['action']}`. Server response: {response}."}, 
                    to=response["sid"])
    
            # Empty log for player after update is sent
            game.players[username].log = []

        # If in_progress var has changed, send update to lobby. 
        
        if in_progress_before_update != game.in_progress:
            # Send updated player count to anyone remaining in lobby
            fio.emit("update_lobby", {"action": "update_lobby_table", "row": data["room"], 
                     "col": "in_progress", "new_value": game.in_progress}, to="lobby")
    

@socketio.on("message")
def message(data):
    
    print(f"Received chat msg {data['msg']} from {data['username']}")
    
    fio.emit("chat_log", {"msg": data["msg"], "sender": data["username"],
             "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])


@socketio.on("connect")
def on_connect():
    fl.session["session_cookie"] = fl.request.cookies.get("session")


@socketio.on("debug_msg")
def on_debug_msg(data):
    print("debug msg\n\n")
    print(data)

@socketio.on("disconnect")
def on_disconnect():
    print(f"Session on disconnect: {fl.session}")

    # Getting username via flask session
    print("On disconnect; getting username via flask session.")
    username = fl.session.get("username", "")
    
    if len(username) == 0:
        print("Username not found, exiting on_disconnect")
        return

    # If username available, remove from rooms

    # Room id is unavailable;
    # Remove player from every room since disconnect implies leaving all rooms
    # DON'T REMOVE from room clients so client can reconnect
    for room_name, room_object in rooms.items():
        for user in room_object.users:

            # Added session cookie validation to avoid removing the wrong user
            if user.name == username and user.session_cookie == fl.session["session_cookie"]:
                user.connected = False
                
                # Remove player if no game
                if not room_object.game:

                    print(f"No game exists; Sending update to room {room_name} to remove `{user.name}`")
                    fio.emit("update_gameroom", {"action": "remove_players", "room": room_name, 
                             "players": [user.name]}, room=room_name, broadcast=True)

                # If game, check if game is in progress
                elif room_object.game:
                    
                    # If game is not running, remove player. 
                    # Otherwise keep player until game is officially reset.
                    if not room_object.game.in_progress:
                        print("Game exists but is not in progress; removing player.")

                        # Broadcast = True; i.e. player who is leaving does not need the remove players event
                        fio.emit("update_gameroom", {"action": "remove_players", "room": room_name,
                                 "players": [user.name]}, room=room_name, broadcast=True)

                        print(f"Sending update to room {room_name} to remove `{user.name}`")
                    
                    # If game is in progress, let other clients in room know that the player has disconnected 
                    # Can add visual indicator on client-side
                    else:
                        print("Game exists and is in progress; sending disconnect notice to other clients.")

                        fio.emit("update_gameroom", {"action": "conn_status", "room": room_name,
                                 "players": [user.name], "connected": False}, room=room_name,
                                 broadcast=True)
# -- End FlaskSocketIO -- #


# -- Account Management -- 
# @app.route("/set_username")
# def set_username():
#     fl.session["last_page"] = fl.url_for("set_username")
#     fl.session["session_cookie"] = fl.request.cookies.get("session")

#     return fl.render_template("set_username.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # User reached route via POST (as by submitting a form via POST)
    if fl.request.method == "POST":
        # Ensure username was submitted
        if not fl.request.form.get("username"):
            return apology("Must provide a username.", 403)

        # Ensure password was submitted
        elif not fl.request.form.get("password"):
            return apology("Must provide a password.", 403)

        db_response = {}
        # Query database for username
        with sqlite3.connect("database.db") as conn:
            conn.row_factory = dict_factory
            # COLLATE NOCASE in table schema makes search case insensitive
            db_response = conn.execute("SELECT * FROM users WHERE username = ?",    
                                       # extra comma to make this a tuple
                                       (fl.request.form.get("username"),))
        
        username = ""
        pwhash = ""
        user_id = ""
        for row in db_response:
            username = row["username"]
            pwhash = row["pwhash"]
            user_id = row["id"]

        # Ensure username exists and password is correct
        if len(username) == 0 or not ws.check_password_hash(
                                     pwhash, fl.request.form.get("password", "")):
            return apology("Invalid username and/or password.", 403)

        # Remember which user has logged in
        fl.session["user_id"] = user_id
        fl.session["username"] = username

        # Redirect user to last page visited
        if fl.session.get("last_page"):
            return fl.redirect(fl.session["last_page"])
        
        # Redirect user to home page if no last page was set
        return fl.redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return fl.render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""

    # Forget any user_id
    fl.session.clear()

    # Redirect user to home
    return fl.redirect("/")


@app.route("/register", methods=["GET", "POST"])
def register():
    """Register user"""

    if fl.request.method == "POST":
        # Ensure username was submitted
        if not fl.request.form.get("username"):
            return apology("Must provide a username.", 400)
        
        validation = validate_name_input(name=fl.request.form.get("username"), max_len=12)
        
        if not validation["accepted"]:
            print(validation["msg"])
            return apology(validation["msg"], 400)

        # Ensure password was submitted
        elif not fl.request.form.get("password"):
            return apology("Must provide a password.", 400)

        # Ensure password matches confirmation
        elif fl.request.form.get("password") != fl.request.form.get("confirmation"):
            return apology("The two passwords must match.", 400)

        # Attempt to register account, check for dupe username
        try:
            # If not dupe, add row to table
            with sqlite3.connect("database.db") as conn:
                conn.execute("""
                            INSERT INTO users (username, pwhash, date)
                            VALUES (?, ?, ?)
                            """,
                            (fl.request.form.get("username"),
                            ws.generate_password_hash(fl.request.form.get("password", "")),
                            int(time())))

        # Dupe username
        except sqlite3.IntegrityError:
            return apology("This username is taken.")

        # Redirect user to login
        return fl.redirect("/login")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return fl.render_template("register.html")


@app.route("/change_password", methods=["GET", "POST"])
# This is hidden if not logged in, but adding server-side validation
@login_required
def change_password():
    """Change password"""

    if fl.request.method == "POST":

        # Ensure old password was submitted
        if not fl.request.form.get("old_password"):
            return apology("must provide password", 400)

        # Ensure new password was submitted
        elif not fl.request.form.get("new_password"):
            return apology("must provide new password", 400)

        # Ensure new password matches confirmation
        elif fl.request.form.get("new_password") != fl.request.form.get("confirmation"):
            return apology("new password and confirmation must match", 400)

        db_response = {}
        # Query database for password hash
        with sqlite3.connect("database.db") as conn:
            conn.row_factory = dict_factory
            db_response = conn.execute("SELECT pwhash FROM users WHERE id = ?",
                                       (fl.session.get("user_id"), 0))

        pwhash_from_server = ""
        
        for row in db_response:
            pwhash_from_server = row["pwhash"]

        if len(pwhash_from_server) == 0:
            return apology("Error connecting to database.", 500)

        # Ensure old password is correct
        if not ws.check_password_hash(pwhash_from_server, fl.request.form.get("old_password", "")):
            return apology("Invalid password.", 403)

        # Check for dupe password
        if ws.check_password_hash(pwhash_from_server, fl.request.form.get("new_password", "")):
            return apology("New password must be different from the old password.", 400)

        # If not dupe, update password hash in table
        with sqlite3.connect("database.db") as conn:
            conn.row_factory = dict_factory
            conn.execute("UPDATE users SET pwhash = ? WHERE id = ?",
                   (ws.generate_password_hash(fl.request.form.get("new_password", "")),
                    fl.session.get("user_id", 0)))

        fl.flash("Your password has been changed!")

        # Redirect user to home
        return fl.redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return fl.render_template("change_password.html")


def apology(message, code=400):
    """Render message as an apology to user."""
    return fl.render_template("apology.html", top=code, bottom=message), code
# -- End Account Management -- #


if __name__ == "__main__":
    # Instead of app.run (for default flask)
    ### defaults to port 5000 ###

    socketio.run(app, debug=True, port=5001)  # for debug
    # socketio.run(app)  # for production

# Check flask-socketIO documentation for setting up deployment server:
# https://flask-socketio.readthedocs.io/en/latest/deployment.html
