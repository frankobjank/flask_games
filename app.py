# Python official modules
import logging
import re
import sqlite3
from time import time, localtime, strftime
import werkzeug.security as ws

# Flask modules
import flask as fl
from flask_session import Session
import flask_socketio as fio

# Python files
from helpers import *
import thirty_one_game

# link to access app for debug http://127.0.0.1:5001

# Configure application
app = fl.Flask(__name__)

# Still unclear if I need this/ what exactly it's used for
app.config["SECRET_KEY"] = "secret!"
# or app.secret_key = "replace later"

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Sets flask logging to Error only
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Configure socketio
socketio = fio.SocketIO(app) #, logger=True, engineio_logger=True)

users = {}

rooms = {}

rooms["lobby"] = Room(
    # This limits the lobby to 10000 people. Instead can skip capacity validation 
    # on join for lobby
    name="lobby", roompw="", game_name="", capacity=10000, date_created=time(), 
    creator="dev"
)

rooms["dev1"] = Room(
    name="dev1", roompw="", game_name="thirty_one", capacity=7, date_created=time(), 
    creator="dev"
)

rooms["dev2"] = Room(
    name="dev2", roompw=ws.generate_password_hash("llll"), game_name="thirty_one", 
    capacity=7, date_created=time(), creator="dev"
)

GAMES = ["thirty_one", "cribbage", "natac"]

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
def game():
    fl.session["last_page"] = fl.url_for("game")
    
    # Load lobby on GET

    username = fl.session.get("username", "")
    if len(username) == 0:
        username = get_random_name()
    
    # Required to instantiate a session cookie for players with random names
    fl.session["session_cookie"] = fl.request.cookies.get("session")
    
    return fl.render_template("game.html")


# -- FlaskSocketIO -- #
@socketio.on("create_room")
def on_create_room():
    # TODO: Send new room details to lobby
        # - on client side, room should be appended to lobby container
    return "Server callback: room created."


@socketio.on("set_username")
def on_set_username(data):
    # TODO: username validation - check db for duplicate, check existing rooms for duplicate
    username = data["username_request"]

    print(f"Received username: {username}")

    if len(fl.session.get("username", "")) > 0:
        return {"msg": "Canceling request: username already set.", "username": ""}
    
    # Strip whitespace
    username = username.strip()

    # Security concern - sanitize username. Only allow non-alphanumeric and underscore chars.
    if not re.match(r"^[a-zA-Z0-9_]+$", username):
        return {"msg": "Canceling request: username contains illegal characters.", "username": ""}

    # Limit to 12 chars
    if len(username) > 12:
        username = username[:12]
    
    # Update name in session dict and in room's user list
    fl.session["username"] = username
    
    # Setting username should only happen in lobby, therefore only need to update users in lobby
    # Can make users a dict to shorten lookup time
    for user in rooms["lobby"].users:
        if fl.session["session_cookie"] == user.session_cookie and len(user.name) == 0:
            user.name = username
            
            # Break after first match
            break

    return {"username": username}


@socketio.on("join")
def on_join(data):
    # Change to unique url room solution?
        # potentially with option of making public and being added to a lobby
    
    print(f"Users on join: {rooms[data['room']].users} before processing.")

    fio.emit("debug_msg", {"msg": "Server received join event."}, to=fl.request.sid)
    
    if data["room"] != "lobby":

        # Check if room full
        if rooms[data["room"]].is_full():
        
            print(f"{data['room']} is full; Unable to join.")
            fio.emit("debug_msg", {"msg": f"{data['room']} is full; Unable to join."}, to=fl.request.sid)
            
            # Should already be in lobby, stay in lobby
            # Maybe turn this into a flash message
            return f"{data['room']} is full"
        
        # Do not allow client to join non-lobby room with no username
        if len(fl.session.get("username", "")) == 0:
            
            print(f"Username is not set; cannot join {data['room']}.")
            fio.emit("debug_msg", {"msg": f"Username is not set; cannot join {data['room']}."}, to=fl.request.sid)
            
            return

    
    user = None

    # Use session cookie to see if user exists in room already; update sid and connection status
    for room_user in rooms[data["room"]].users:
        if room_user.session_cookie == fl.session["session_cookie"]:

            print(f"User {room_user.name} was found in room {data['room']}. Updating sid from {room_user.sid} TO {fl.request.sid}")
            
            # Copy new sid to room_user object
            room_user.sid = fl.request.sid

            # If user found, set connected to True
            room_user.connected = True

            # Assign to `user` for using below
            user = room_user

    # If no existing user matches, create new user object.
    # If a user connects to multiple rooms, a new user object will be created for each one.
    if not user:
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

    # For lobby
    if data["room"] == "lobby":
        fio.emit("update_lobby", {"action": "setup_room", "room": data["room"],
                 "username": user.name}, to=fl.request.sid)

    # For game room
    else:
        # Set up client's username on their end
        # THIS MUST HAPPEN BEFORE ADD_PLAYERS SO USERNAME IS SET
        fio.emit("update_gameroom", {"action": "setup_room", "room": data["room"],
                 "username": user.name}, to=fl.request.sid)
    
    print(f"Users on join: {rooms[data['room']].users} after processing.")

    # Join the room
    fio.join_room(data["room"])
    print(f"{user.name} joined {data['room']}.")

    # Joining lobby; exit early
    if data["room"] == "lobby":
        # When room is added, push changes to all other users in lobby
        fio.emit("update_lobby", {"action": "add_rooms", "room": data["room"], 
                 "username": user.name, "rooms": [room.package_self() for room in rooms.values()
                 if room.name != "lobby"]}, to=fl.request.sid)
        
        return "Server callback: join completed."
    
    # Joining game room - NOT lobby

    # Log msg that player has joined
    fio.emit("chat_log", {"msg": f"{user.name} has joined {data['room']}.", "sender": "system",
             "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])

    print(f"Sending update room to {data['room']} to add {list((user.name for user in rooms[data['room']].users if user.connected))}")

    # Send updated list of players to others in room
    fio.emit("update_gameroom", {"action": "add_players", "room": data["room"],
             "players": list(user.name for user in rooms[data["room"]].users if user.connected)},
             room=data["room"], broadcast=True)
    
    # Send updated player count to anyone remaining in lobby
    fio.emit("update_lobby", {"action": "update_lobby_table", "row": data["room"], "col": "players",
             "new_value": f"{rooms[data['room']].get_num_connected()} / {rooms[data['room']].capacity}"}, 
             to="lobby")
    
    # Send game data if game in progress
    game = rooms[data["room"]].game

    # Use all players list to send updates to players who are knocked out
    if game and game.in_progress and user.name in game.players.keys():
        
        response = game.package_state(user.name)
                    
        print(f"Sending game state to {user.name} on join: \n{response}")    
        fio.emit("update_game", response, to=fl.request.sid, room=data["room"])
        fio.emit("debug_msg", {"msg": f"Server sent game state on join."}, to=fl.request.sid)
        
        # If player is rejoining, update connection status for all other clients in room
        fio.emit("update_gameroom", {"action": "conn_status", "room": data["room"], 
                 "players": [user.name], "connected": True}, room=data["room"], broadcast=True)

        # Empty log for player after update is sent
        game.log[user.name] = []

    return "Server callback: join completed."
        

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

    # For lobby (LEAVING lobby)
    if data["room"] == "lobby":
        fio.emit("update_lobby", {"action": "teardown_room", "room": data["room"]}, to=fl.request.sid)

        # Will update lobby player counts when leaving game room, but not lobby

        # Exit early
        return "Server callback: successful leave."
    

    # For game room (LEAVING game room)

    # Send updated player count to anyone remaining in lobby
    fio.emit("update_lobby", {"action": "update_lobby_table", "row": data["room"], "col": "players",
             "new_value": f"{rooms[data['room']].get_num_connected()} / {rooms[data['room']].capacity}"}, 
             to="lobby")

    fio.emit("update_gameroom", {"action": "teardown_room", "room": data["room"]}, to=fl.request.sid)

    # Notify the rest of clients in the room that user has left
    fio.emit("chat_log", {"msg": f"{data['username']} has left.", "sender": "system",
                          "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, 
                          room=data["room"])

    # Can leave freely if:
        # Not game OR if game AND game is not in progress:
    
    # Remove leaving player from list of players
    if not rooms[data["room"]].game or (rooms[data["room"]].game 
                                        and not rooms[data["room"]].game.in_progress):
        
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
        fio.emit("debug_msg", {"msg": "Game has not been initialized yet."}, to=fl.request.sid)
        return
    
    # Check that username is current player if game has started
    # Only allow input from all players to click continue during round ending
    if game.in_progress and game.mode != "end_round" and fl.session.get("username", "") != game.current_player:
        
        print("Not accepting move from non-current player while game is in progress.")
        fio.emit("debug_msg", {"msg":
                f"Server rejected move request; Client not current player."}, to=fl.request.sid)
        
        return

    # Update based on data.action, data.card
    if game.update(data) == "reject":
        
        # Send on server reject
        print(f"Rejecting `{data['action']}` from `{fl.session.get('username')}`")
        fio.emit("debug_msg", {"msg": 
                f"Server rejected move event `{data['action']}`"}, to=fl.request.sid)

    # Send on server accept; Tailored response to each player
    else:
        
        # Save in_progress var before game update
        in_progress_before_update = game.in_progress
        
        for username in game.players.keys():
            
            response = game.package_state(username)
            
            # have to specify the 'to' parameter of 'emit' to send to specific player
            # is sid needed for this? Not sure how to get all the sids of everyone in room
            print(f"Sending response: \n{response} \non {data['action']}")
            
            fio.emit("update_game", response, to=response["sid"], room=data["room"])
            
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


@socketio.on("disconnect")
def on_disconnect():
    print(f"Session on disconnect: {fl.session}")

    # Getting username via flask session
    print("On disconnect; getting username via flask session.")
    username = fl.session.get("username", "")
    
    # Username must exist beyond this point
    
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


# -- Account Management -- #
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
                            ws.generate_password_hash(
                            fl.request.form.get("password", "")),
                            time()))

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
    socketio.run(app, port=5001, debug=True)
