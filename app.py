# Python official modules
import sqlite3
from time import time, localtime, strftime
import werkzeug.security as ws

# Flask modules
import flask as fl
from flask_session import Session
import flask_socketio as fio

# Python files
from helpers import *
import minesweeper_game
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

# Configure socketio
socketio = fio.SocketIO(app) #, logger=True, engineio_logger=True)

# # Predefined chatrooms; eventually want to enable users to create their own
CHATROOMS = ["Lounge", "News", "Games", "Coding"]

GAMEROOMS = ["room1", "room2"]

# Uses session id - browser session cookie
session_to_user = {}

# Uses socketio sid - new sid on every reconnect
sid_to_user = {}

user_to_sid = {}  # Player: list of sids --- might need to move this to be 
# room-specific because a user can be in more than one room at once. If separated 
# by room, player should only be associated with one sid at a time

# Maybe put User(username, session_id) into room_clients instead of just names?
room_clients = {r: [] for r in GAMEROOMS}  # Room: set(players)
active_games = {}  # Room: Game State


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
    return fl.render_template("index.html")


@app.route("/thirty_one") #, methods=["GET", "POST"])
def thirty_one():
    fl.session["last_page"] = fl.url_for("thirty_one")

    # Load lobby?? Or drop into room and make lobby a separate route
    # username = fl.session.get("username", "")
    # if len(username) == 0:
    #     username = get_random_name()
    print(f"session on thirty_one get request = {fl.session}")
    # Required to instantiate a session cookie for players with random names
    fl.session["session_id"] = fl.request.cookies.get("session")
    fl.session["rooms"] = set()
        
    # Everything taken care of via web sockets
    return fl.render_template("thirty_one.html") #, username=username)


@app.route("/chat", methods=["GET", "POST"])
def chat():
    username = fl.session.get("username")
    
    return fl.render_template("chat.html", username=username, rooms=CHATROOMS)


# -- FlaskSocketIO -- #
@socketio.on("join")
def on_join(data):
    fio.emit("debug_msg", "Server callback to join event.", room=data["room"])
    
    # Check if room full
    if is_full(room_users = data["room"], max_players = 7):
        print(f"{data['room']} is full, redirecting.")
        fio.emit("debug_msg", f"{data['room']} is full, redirecting.", room=data["room"])
        # Change this to lobby when it exists
        fl.redirect("/")
    
    # Create new game State object per room - could be part of room creation?
    # Add to active games dict, accessed by room name
    if not active_games.get(data["room"]):
        active_games[data["room"]] = thirty_one_game.State(data["room"])
    
    # If game does exist, check that it is not in progress
    else:
        if active_games[data["room"]].in_progress:
            print(f"Cannot join {data['room']}; Game is in progress.")
            fio.send({"msg": f"Cannot join {data['room']}; Game is in progress."}, room=data["room"])
            
            fl.redirect("/")

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
            print(f"REMOVING {old_user} from {data['room']}")

    # Assign random name if session id not found
    if len(user.name) == 0:
        # Pass in current room names to avoid duplicates
        user.name = get_random_name(exclude = {connected_user.name for connected_user in room_clients[data["room"]]})
        print(f"Random name chosen = {user.name}")

    # Add new user to room clients
    room_clients[data["room"]].append(user)
    print(f"ADDING {user} from {data['room']}")
    
    user.room = data["room"]
    user.connected = True
    
    # TODO This persists through flask socketio disconnect events so a session can be
    # recovered. However, this should be cleared every so often so it doesn't just grow
    # endlessly. Maybe after 10 minutes of inactivity?
    session_to_user[user.session_id] = user

    # Set up client's username on their end
    # THIS MUST HAPPEN BEFORE ADD_PLAYERS SO USERNAME IS SET
    fio.emit("update", {"action": "add_username", "username": user.name}, to=fl.request.sid)

    # Join the room
    fio.join_room(data["room"])
    
    # Log msg that player has joined
    fio.send({"msg": user.name + " has joined " + data["room"] + "."}, room=data["room"])

    # Callback to send updated list of players
    fio.emit("update", {"action": "add_players", "room": data["room"], "players": [user.name for user in room_clients[data["room"]] if user.connected]}, room=data["room"], broadcast=True)

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


@socketio.on("leave")
def on_leave(data):
    # Disconnect handles leaving the page or disconnecting other ways;
    # Leave can handle leaving the current room to go to the lobby
    # For debug:
    print("ON LEAVE")
    
    fio.emit("debug_msg", "Server callback to leave event.", to=fl.request.sid)
    
    print(f"{data['username']} has left the {data['room']} room.")

    # Remove user from room clients dict
    for user in room_clients[data["room"]]:
        if fl.session["session_id"] == user.session_id and fl.session["username"] == user.name:
            # Set connected to False rather than removing from list
            user.connected = False
            
    
    fl.session["rooms"].discard(data["room"])
    
    fio.leave_room(data["room"])
    fio.send({"msg": data["username"] + " has left " + data["room"] + "."}, room=data["room"])

    # Callback to send updated list of players
    fio.emit("update", {"action": "remove_players", "room": data["room"], "players": list(user.name for user in room_clients[data["room"]] if user.connected)}, room=user.room, broadcast=True)


# Custom event bucket - "move"
@socketio.on("move")
def process_move(data):
    # For debug:
    print(f"Received move event `{data['action']}` from client `{fl.session.get('username')}`.")
    # print(f"Received request from client: {data}")
    
    # Game state should be created on first join (room creation)
    game = active_games[data["room"]]

    # If client requests start, check number of players in room
    if data["action"] == "start":
        # Reject if game has already started
        if game.in_progress:
            print("Game is already in progress.")
            # fio.send({"msg": f"Rejecting start request; Game is already in progress"})
        
        # Reject if invalid number of players
        if not (2 <= len([user for user in room_clients[data["room"]] if user.connected]) <= 7):
            print("Invalid number of players.")
            # fio.send({"msg": f"Rejecting start request; Invalid number of players."})
            return
    
        # Add all players to game state since there are the correct number
        for user in room_clients[data["room"]]:
            if user.connected:
                print(f"Adding {user} to game")
                active_games[data["room"]].add_player(user.name)

    
    # Check that username is current player if game has started
    # Only allow input from all players to click continue during round ending
    if game.in_progress and game.mode != "end_round" and fl.session.get("username", "") != game.current_player:
        print("Not accepting move from non-current player while game is in progress.")
        fio.emit({"debug_msg": f"Server rejecting move request; Client not current player."}, room=data["room"])
        return
    
    # Update based on data.action, data.card
    if game.update(data) == "reject":
        # Send on server reject
        print(f"Rejecting `{data['action']}` from `{fl.session.get('username')}`")
        # fio.send({"msg": f"Server rejected move event `{data['action']}`"})

    # Send on server accept; Tailored response to each player
    else:
        for username in game.players.keys():
            
            response = game.package_state(username)
            
            # have to specify the 'to' parameter of 'emit' to send to specific player
            # is sid needed for this? Not sure how to get all the sids of everyone in room
            print(f"Sending response: \n{response} \non {data['action']}")
            
            fio.emit("update", response, to = user_to_sid[username], room=data["room"])
            # fio.send({"msg": f"Server accepted move event `{data['action']}`. Server response: {response}."}, to = user_to_sid[username])
    
    # Empty temp log after all players are updated
    game.temp_log = []


@socketio.on("message")
def message(data):
    
    print(f"Received chat msg {data['msg']} from {data['username']}")
    
    fio.send({"msg": data["msg"], "username": data["username"], "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])


@socketio.on("connect")
def on_connect():
    fl.session["session_id"] = fl.request.cookies.get("session")
    
    check_user = session_to_user.get(fl.session["session_id"])
    if check_user:
        fio.join_room(check_user.room)


@socketio.on("disconnect")
def on_disconnect():
    # Getting username via flask session
    print("Getting username via flask session")
    username = fl.session.get("username", "")

    # Getting username via client sid
    if len(username) == 0:
        print("Getting username via client sid")
        username = sid_to_user.get(fl.request.sid, "")
    
    # Remove all rooms from session["rooms"]
    fl.session["rooms"] = set()

    # If username available, remove from rooms
    if len(username) > 0:

        # Room id is unavailable;
        # Remove player from every room since disconnect implies leaving all rooms
        # DON'T REMOVE from room clients so client can reconnect
        for users in room_clients.values():
            for user in users:
                # Should probably change this because different users could have 
                # the same username in different rooms - added another validation
                # of session id to not remove the wrong user
                if user.name == username and user.session_id == fl.session["session_id"]:
                    user.connected = False
                    
                    fio.emit("update", {"action": "remove_players", "players": username}, room=user.room, broadcast=True)
        
                    print(f"Sending update to room {user.room} to remove `{username}`")
                    

        # Remove user from user to sid dict
        user_to_sid.pop(username)
    
    # Remove sid from sid to user dict
    sid_to_user.pop(fl.request.sid)
    
    
# -- End FlaskSocketIO -- #


# -- Account Management -- #
@app.route("/login", methods=["GET", "POST"])
def login():
    """Log user in"""

    # Forget any user_id
    fl.session.clear()

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


# -- Minesweeper -- #
@app.route("/minesweeper", methods=["GET", "POST"])
def minesweeper():
    
    # POST - receive requests and update board
    if fl.request.method == "POST":

        # Redirect to initial `get` request on reset
        if fl.request.form.get("reset"):
            fl.redirect("/minesweeper")

        # Retrieve minesweeper state from session
        ms = fl.session.get("ms")

        # Prevents accessing from `None`
        if not ms:
            return ("", 204)

        # Square index from client
        square_idx = fl.request.form.get("square", "")

        # Only return data if game not over
        if len(square_idx) > 0 and not (ms.win or ms.lose):
            ms.update_server(square_idx)
            
            # Connect to database on gameover; should only happen once
            if ms.game_over:
                
                # Validate score received from client to prevent cheating
                server_score = int(ms.score)
                client_score = int(fl.request.form.get("score", 0))

                # Test if margin of error is less than 20%
                if abs(server_score - client_score) < (0.2 * server_score):
                    server_score = client_score

                # Update database only if logged in
                if fl.session.get("user_id", 0) != 0:
                    with sqlite3.connect("database.db") as conn:
                        conn.execute(
                            """
                            INSERT INTO ms_stats (mode, score, win, date, user_id)
                            VALUES (?, ?, ?, ?, ?)
                            """, (
                                ms.difficulty,         # mode
                                client_score,          # score
                                ms.win,                # win
                                int(time()),           # date
                                fl.session["user_id"]  # user_id
                            )
                        )
                    
            # Return mines, visible squares to client
            response = ms.update_packet()
            
            return response

        # flask requires a return value; 204 status will keep browser on current page
        return ("", 204)

    # GET - create board and send
    elif fl.request.method == "GET":
        # Remember last page to redirect user after login
        fl.session["last_page"] = fl.url_for("minesweeper")

        # Get difficulty from client; defaults to easy
        difficulty = fl.request.args.get("difficulty", "easy")

        # Create new minesweeper State object; add to flask session to access later
        fl.session["ms"] = minesweeper_game.State()
        fl.session["ms"].create_board(difficulty=difficulty)  # , fixed_mines=True)

        # Send to client as dict
        return fl.render_template("minesweeper.html", data=fl.session["ms"].setup_packet())


# Turn this into general stats page with buttons to select stats for each game
# Or could spin off single-player games
@app.route("/minesweeper/stats")
def minesweeper_stats():
    # Remember last page to redirect user after login
    fl.session["last_page"] = fl.url_for("minesweeper_stats")

    user_id = fl.session.get("user_id", 0)
    
    # If not logged in; user_id is stored as int
    if user_id == 0:
        return fl.render_template("minesweeper_stats.html", data=None)
    
    # Display stats if logged in
    db_responses = {}  # {"easy": [], "medium": [], "hard": []}
    
    # Query database and retrieve the stats
    with sqlite3.connect("database.db") as conn:
        conn.row_factory = dict_factory
        modes = ["easy", "medium", "hard"]

        # To do in one transaction, could sort into mode as 
        for mode in modes:
            db_responses[mode] = conn.execute(
                "SELECT score, win, date FROM ms_stats WHERE user_id = ? AND mode = ? AND score != 0", (user_id, mode)
            )

    # Calculate win rate and average time for win, best time for all modes
    data = {"easy": {}, "medium": {}, "hard": {}}  # {"easy": {win_rate: 0, ...} ...}

    for mode in data.keys():
        games_won = 0.0
        total_scores = 0.0
        total_games = 0.0
        best_time = 0
        
        for row in db_responses[mode]:
            
            # Get stats from non-trash rounds (5 or more seconds)
            if row["score"] > 5:
                total_games += 1
                total_scores += row["score"]

                # Count wins
                if row["win"]:
                    games_won += row["win"]
               
                    # Get lowest non-zero value for best_time
                    if best_time == 0 or best_time > row["score"]:
                        best_time = row["score"]
                    
        data[mode]["games_won"] = int(games_won)
        data[mode]["total_games"] = int(total_games)

        if total_games != 0:
            data[mode]["win_rate"] = to_percent(games_won / total_games)
            data[mode]["average_score"] = round(total_scores / total_games)
        else:
            data[mode]["win_rate"] = "-"
            data[mode]["average_score"] = "-"

        if games_won != 0:
            data[mode]["best_time"] = best_time
        else:
            data[mode]["best_time"] = "-"

    return fl.render_template("minesweeper_stats.html", data=data)
# -- End Minesweeper -- #


if __name__ == "__main__":
    # Instead of app.run (for default flask)
    socketio.run(app, port=5001, debug=True)
