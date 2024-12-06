# Python official modules
import logging
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

GAMEROOMS = ["dev1", "dev2"]

GAMES = ["thirty_one", "cribbage", "natac"]

# Uses session id - browser session cookie
# If there's nothing in flask or socketio that tracks when users join, can add timestamp session was created to User class
session_to_user = {}  # Session id: User class

# Uses socketio sid - new sid on every reconnect
sid_to_user = {}

user_to_sid = {}  # Player: list of sids --- might need to move this to be 
# room-specific because a user can be in more than one room at once. If separated 
# by room, player should only be associated with one sid at a time

# Maybe put User(username, session_id) into room_clients instead of just names?
room_clients = {r: [] for r in GAMEROOMS}  # Room: set(players)
room_to_game = {}  # Room: Game State


# Users can set username without creating an account
# To test existence of account, check `user_id`

# Users: [frankobjank, burnt, AAAA, newuser, richard]


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
    return fl.render_template("index.html")


@app.route("/lobby")
def lobby():
    # Want to load rooms from database
    game = fl.request.args.get("game")
    print(game)
    return fl.render_template("lobby.html", rooms=GAMEROOMS, game=game)


@app.route("/room_creation")
def room_creation():
    return fl.render_template("room_creation.html", games=GAMES)


@app.route("/game") #, methods=["GET", "POST"])
def game():
    fl.session["last_page"] = fl.url_for("game")

    # Load lobby?? Or drop into room and make lobby a separate route
    # username = fl.session.get("username", "")
    # if len(username) == 0:
    #     username = get_random_name()
    print(f"session on play get request = {fl.session}")
    # Required to instantiate a session cookie for players with random names
    fl.session["session_id"] = fl.request.cookies.get("session")
    fl.session["rooms"] = set()
        
    # Everything taken care of via web sockets
    return fl.render_template("game.html") #, username=username)


# -- FlaskSocketIO -- #
@socketio.on("join")
def on_join(data):
    # Change to unique url room solution?
        # potentially with option of making public and being added to a lobby

    fio.emit("debug_msg", {"msg": "Server received join event."}, to=fl.request.sid)
    
    # Check if room full
    if is_full(room_users = data["room"], max_players = 7):
        
        print(f"{data['room']} is full, redirecting.")
        fio.emit("debug_msg", {"msg": f"{data['room']} is full, redirecting."}, to=fl.request.sid)
        
        # Should already be in lobby, stay in lobby
        # Maybe turn this into a flash message
        return f"{data['room']} is full"

    # Keep track of rooms joined in flask session dict
    fl.session["rooms"].add(data["room"])

    # Name and session id to add to room_clients dict
    user = User(
        name = fl.session.get("username", ""), 
        session_id = fl.session.get("session_id", ""), 
        websocket_id = fl.request.sid
    )
    
    # At least session id should be assigned at this point
    assert len(user.session_id) > 0, "Session id should be assigned at this point"
        
    # Use session id to find username if username not found
    # session id 
    for old_user in room_clients[data["room"]]:
        if user.session_id == old_user.session_id:
            
            # If user was in room clients already, assign new user to old user
            # (instead of adding a new entry to room clients)
            user = old_user

            # Copy new websocket instead of using old invalid sid
            user.websocket_id = fl.request.sid
            
            # Remove old copy of client, will append new client later
            room_clients[data["room"]].remove(old_user)

    # Assign random name if session id not found
    if len(user.name) == 0:
        
        # ALLOW USER TO CREATE THEIR OWN USERNAME - will have to implement on client side

        # Pass in current room names to avoid duplicates
        user.name = get_random_name(exclude = {connected_user.name for connected_user in room_clients[data["room"]]})
        print(f"Random name chosen = {user.name}")

    # Add new user to room clients
    room_clients[data["room"]].append(user)
    
    user.room = data["room"]
    user.connected = True
    
    # TODO session_to_user dict persists through flask socketio disconnect events so a session 
    # can be recovered. However, this should be cleared every so often so it doesn't just grow
    # endlessly. Maybe after 12 hours of inactivity?
    session_to_user[user.session_id] = user

    # Set up client's username on their end
    # THIS MUST HAPPEN BEFORE ADD_PLAYERS SO USERNAME IS SET
    fio.emit("update_room", {"action": "setup_room", "room": data["room"], "username": user.name}, to=fl.request.sid)

    # Join the room
    fio.join_room(data["room"])
    
    # Log msg that player has joined. Username set to empty string since it's a system msg
    fio.emit("chat_log", {"msg": f"{user.name} has joined {data['room']}.", "sender": "", "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])

    # Callback to send updated list of players
    fio.emit("update_room", {"action": "add_players", "room": data["room"], "players": [user.name for user in room_clients[data["room"]] if user.connected]}, room=data["room"], broadcast=True)

    # Store username in session
    fl.session["username"] = user.name
        
    user_to_sid[fl.session["username"]] = fl.request.sid
    sid_to_user[fl.request.sid] = fl.session["username"]
    
    # user to sid should store sids as list since users can be part of 
    # more than one room at a time - although, may not be needed with 
    # updated room clients dict

    # Print for debug
    print(f"ON JOIN for {user.name} to the {data['room']} room.")
    print(f"sid on JOIN = {user.websocket_id} for {user.name}")

    for room, users in room_clients.items():
        print(f"room {room} clients at end of JOIN \n{users}")

    # Send game data if game in progress
    game = room_to_game.get(data["room"])

    if game and game.in_progress and user.name in game.players.keys():
        
        response = game.package_state(user.name)
                    
        print(f"Sending game state to {user.name} on join: \n{response}")    
        fio.emit("update_game", response, to=fl.request.sid, room=data["room"])
        fio.emit("debug_msg", {"msg": f"Server sent game state on join."}, to=fl.request.sid)
        
        # If player is rejoining, update connection status for all other clients
        fio.emit("update_room", {"action": "conn_status", "room": room, "players": [user.name], "connected": True}, room=room, broadcast=True)
        
        # Can't empty temp log for one player;
        # This will probably result in duplicate messages coming to the joined player
        # Will probably have to create individual logs
        
        # game.temp_log = []
    
    return "Server callback: join fully processed"
        

@socketio.on("leave")
def on_leave(data):
    # Disconnect handles leaving the page or disconnecting other ways;
    # Leave can handle leaving the current room to go to the lobby
    # For debug:
    print("ON LEAVE")
    
    # Replacing callbacks with return statements
    # fio.emit("debug_msg", {"msg": "Server callback to leave event."}, to=fl.request.sid)
    
    print(f"{data['username']} has left the {data['room']} room.")

    # In lieu of removing user from room clients dict:
    # Set connected to False so that user persists
    for user in room_clients[data["room"]]:
        if fl.session["session_id"] == user.session_id and fl.session["username"] == user.name:
            user.connected = False
            
    
    fl.session["rooms"].discard(data["room"])
    
    fio.leave_room(data["room"])

    # Sender is empty string - signifies system message
    fio.emit("chat_log", {"msg": f"{data['username']} has left.", "sender": "", "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])

    # Room is implied since a single request sid is only linked to one room (I think)
    fio.emit("update_room", {"action": "teardown_room"}, to=fl.request.sid)

    game = room_to_game.get(data["room"])

    # If not game OR if game AND game is not in progress:
    # Remove leaving player from list of players
    if not game or (game and not game.in_progress):
        # Broadbast = True since notification should go to all other players in room
        fio.emit("update_room", {"action": "remove_players", "room": data["room"], "players": list(user.name for user in room_clients[data["room"]] if not user.connected)}, room=user.room, broadcast=True)
    
    return "Server callback: leave fully processed."


# Custom event - "move"
@socketio.on("move")
def process_move(data):

    # For debug:
    print(f"Received move event `{data['action']}` from client `{fl.session.get('username')}`.")
    
    # If client requests start, check number of players in room
    if data["action"] == "start":
        
        # Reject if invalid number of players
        if not (2 <= len([user for user in room_clients[data["room"]] if user.connected]) <= 7):
            fio.emit("debug_msg", {"msg": "Invalid number of players."}, to=fl.request.sid)
            print("Invalid number of players.")
            
            fio.emit("chat_log", {"msg": f"Must have between 2 and 7 people to start game.", "sender": "", "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, to=fl.request.sid)
            return
        
        # Create new game if no game in active games dict
        if not room_to_game.get(data["room"]):
            room_to_game[data["room"]] = thirty_one_game.State(data["room"])
        
        # Reject if game has already started
        if room_to_game.get(data["room"]).in_progress:
            fio.emit("debug_msg", {"msg": "Game is already in progress; Cannot start game."}, to=fl.request.sid)
            print("Game is already in progress.")
        
        # Add all players to game state since there are the correct number
        for user in room_clients[data["room"]]:
            if user.connected:
                fio.emit("debug_msg", {"msg": f"Adding {user} to game."}, to=fl.request.sid)
                print(f"Adding {user} to game.")
                room_to_game.get(data["room"]).add_player(user.name)

    game = room_to_game.get(data["room"])
    
    # Exit early if game does not yet exist
    if not game:
        fio.emit("debug_msg", {"msg": "Game has not been initialized yet."}, to=fl.request.sid)
        return
    
    # Check that username is current player if game has started
    # Only allow input from all players to click continue during round ending
    if game.in_progress and game.mode != "end_round" and fl.session.get("username", "") != game.current_player:
        print("Not accepting move from non-current player while game is in progress.")
        fio.emit("debug_msg", {"msg": f"Server rejecting move request; Client not current player."}, to=fl.request.sid)
        return
    
    # Update based on data.action, data.card
    if game.update(data) == "reject":
        # Send on server reject
        print(f"Rejecting `{data['action']}` from `{fl.session.get('username')}`")
        fio.emit("debug_msg", {"msg": f"Server rejected move event `{data['action']}`"}, to=fl.request.sid)

    # Send on server accept; Tailored response to each player
    else:
        for username in game.all_players:
            
            response = game.package_state(username)
            
            # have to specify the 'to' parameter of 'emit' to send to specific player
            # is sid needed for this? Not sure how to get all the sids of everyone in room
            print(f"Sending response: \n{response} \non {data['action']}")
            
            fio.emit("update_game", response, to=user_to_sid[username], room=data["room"])
            
            fio.emit("debug_msg", {"msg": f"Server accepted move event `{data['action']}`. Server response: {response}."}, to=user_to_sid[username])
    
        # Empty temp log after all players are updated
        game.temp_log = []


@socketio.on("message")
def message(data):
    
    print(f"Received chat msg {data['msg']} from {data['username']}")
    
    fio.emit("chat_log", {"msg": data["msg"], "sender": data["username"], "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])


@socketio.on("connect")
def on_connect():
    fl.session["session_id"] = fl.request.cookies.get("session")
    
    # Automatically re-join room if session cookie is stored on server
    # This may be handled by socketio `reconnect` - check documentation
    # Can probably remove the below code as it did not seem to work

    # Connect happens on lobby so connect doesn't actually mean reconnecting to a room
    # Re-join is covered in on_join
    
    # check_user = session_to_user.get(fl.session["session_id"])
    # if check_user:
    #     print(f"Found user in session dict; Calling join room on {check_user.room}")
    #     fio.join_room(check_user.room)
    #     fio.emit("update_room", {"action": "conn_status", "room": check_user.room, "players": [check_user.name], "connected": True}, room=check_user.room, broadcast=True)



@socketio.on("disconnect")
def on_disconnect():
    # Getting username via flask session
    print("On disconnect; getting username via flask session.")
    username = fl.session.get("username", "")

    # Getting username via client sid
    if len(username) == 0:
        print("Getting username via client sid.")
        username = sid_to_user.get(fl.request.sid, "")
    
    # Remove all rooms from session["rooms"]
    fl.session["rooms"] = set()
    
    if len(username) == 0:
        print("Failed to find username.")
        return
    
    # Username must exist beyond this point
    
    # If username available, remove from rooms

    # Room id is unavailable;
    # Remove player from every room since disconnect implies leaving all rooms
    # DON'T REMOVE from room clients so client can reconnect
    for room, users in room_clients.items():
        for user in users:
            # Should probably change this because different users could have 
            # the same username in different rooms - added another validation
            # of session id to not remove the wrong user
            if user.name == username and user.session_id == fl.session["session_id"]:
                user.connected = False

                game = room_to_game.get(room)
                
                # Remove player if no game
                if not game:
                    print("No game exists; removing player.")
                    fio.emit("update_room", {"action": "remove_players", "room": room, "players": [user.name]}, room=room, broadcast=True)
                    print(f"Sending update to room {room} to remove `{user.name}`")

                # If game, check if game is in progress
                else:
                    
                    # If game is not running, remove player. Otherwise keep player until game is officially reset
                    if not game.in_progress:
                        print("Game exists but is not in progress; removing player.")

                        # Broadcast = True; i.e. player who is leaving does not need the remove players event
                        fio.emit("update_room", {"action": "remove_players", "room": room, "players": [user.name]}, room=room, broadcast=True)

                        print(f"Sending update to room {room} to remove `{user.name}`")
                    
                    # If game is in progress, let other clients in room know that the player has disconnected 
                    # Can add visual indicator on client-side
                    else:
                        print("Game exists and is in progress; sending disconnect notice to other clients.")

                        fio.emit("update_room", {"action": "conn_status", "room": room, "players": [user.name], "connected": False}, room=room, broadcast=True)                        
    
    # End of loop

    # Remove user from user to sid dict
    user_to_sid.pop(username)

    # Remove sid from sid to user dict - this must be within `if username` conditional since will only exist if there is a username 
    sid_to_user.pop(fl.request.sid)    
    
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
