# Python official modules
import sqlite3
from time import time, localtime, strftime
import werkzeug.security as ws

# Flask modules
import flask as fl
from flask_session import Session
import flask_socketio as fio

# Python files
from helpers import dict_factory, to_percent, get_random_name, login_required
import minesweeper_game
import thirty_one_game

# link to access app for debug http://127.0.0.1:5001

# Configure application
app = fl.Flask(__name__)

# Still unclear if I need this/ what exactly it's used for
# app.config["SECRET_KEY"] = "secret!"
# or app.secret_key = "replace later"

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)

# Configure socketio
socketio = fio.SocketIO(app)

# # Predefined chatrooms; eventually want to enable users to create their own
CHATROOMS = ["Lounge", "News", "Games", "Coding"]

GAMEROOMS = ["thirty_one_room"]
# sid_to_user = {}
room_clients = {r: set() for r in GAMEROOMS}
active_games = {}  # {room_name: game_state}


# Users: [frankobjank, burnt, AAAA, newuser]

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


@app.route("/thirty_one", methods=["GET", "POST"])
def thirty_one():


    if fl.request.method == "GET":
        
        # Load lobby?? Or drop into room and make lobby a separate route
        username = fl.session.get("username", "")
        if len(username) == 0:
            username = get_random_name()
            
        # Everything taken care of via web sockets
        return fl.render_template("thirty_one.html", username=username)


@app.route("/chat", methods=["GET", "POST"])
def chat():
    username = fl.session.get("username")
    
    return fl.render_template("chat.html", username=username, rooms=CHATROOMS)


# -- FlaskSocketIO -- #
@socketio.on("join")
@login_required
def on_join(data):
    print(f"ON JOIN for {data['username']}")

    # Create new game State object per room; add to dict, accessed by room name
    if not active_games.get(GAMEROOMS[0]):
        active_games[GAMEROOMS[0]] = thirty_one_game.State(GAMEROOMS[0])

    # # Add sid associated to user to be able to identify for removal on disconnect
    # sid_to_user[fl.request.sid] = data["username"]
    # print(f"sid to user = {sid_to_user}")

    print(f"sid on JOIN = {fl.request.sid} for {data['username']}")

    print(f"{data['username']} has joined the {data['room']} room.")

    # Similar to active_games but keeps track of rooms and who is where 
    room_clients[data["room"]].add(fl.session["username"])
    
    # Join the room
    fio.join_room(data["room"])
    
    # Log msg that player has joined
    fio.send({"msg": data["username"] + " has joined the " + data["room"] + " room."}, room=data["room"])

    # Add player to game state
    active_games[GAMEROOMS[0]].add_player(fl.session["username"])


    # Callback to send updated list of players
    fio.emit("update", {"action": "add_players", "players": list(room_clients[data["room"]])}, broadcast=True)


@socketio.on("leave")
def on_leave(data):
    # Disconnect handles leaving the page or disconnecting other ways;
    # Leave can handle leaving the current room to go to the lobby
    # For debug:
    print("ON LEAVE")
    fio.send({"msg": f"Server callback to leave event."})
    print(f"{data['username']} has left the {data['room']} room.")

    # Remove from server set
    room_clients[data["room"]].discard(fl.session["username"])
    
    fio.leave_room(data["room"])
    fio.send({"msg": data["username"] + " has left the " + data["room"] + " room."})

    # Callback to send updated list of players
    fio.emit("update", {"action": "remove_players", "players": list(room_clients[data["room"]])}, broadcast=True)


# Make custom event bucket - "move"
@socketio.on("move")
def process_move(data):

    # Update based on data.action, data.card
    active_games[GAMEROOMS[0]].update(data)

    response = active_games[GAMEROOMS[0]].package_state(fl.session.get("username"))
    
    fio.emit("update", response)
    
    # For debug:
    fio.send({"msg": f"Server callback to move event: {response}."})


@socketio.on("message")
def message(data):
    
    print(f"\n\n{data}\n\n")
    
    fio.send({"msg": data["msg"], "username": data["username"], "time_stamp": strftime("%b-%d %I:%M%p", localtime())}, room=data["room"])


@socketio.on("connect")
@login_required
def on_connect(data):
    # For debug:
    print(f"ON CONNECT for {fl.session['username']}")
    print(f"sid on CONNECT = {fl.request.sid}")
    fio.send({"msg": "Server callback to connect event."})
    

    # Problem --- when reconnecting after connection issues, client does not go through normal 'join'
    # Therefore sid in sid_to_user becomes outdated. How to update sid without a username?
    
    # Solution? can check if username exists and update sid dict
    username = fl.session.get("username", "")

    # if len(username) > 0:
    #     for 
    #     len(username)


@socketio.on("disconnect")
def on_disconnect():
    # print(f"sid to user = {sid_to_user}")
    # For debug:
    print(f"ON DISCONNECT for {fl.session['username']}")
    print(f"sid on DISCONNECT = {fl.request.sid}")
    
    fio.send({"msg": "Server callback to disconnect event."}, broadcast=True)
    
    username = ""

    # Get username with sid
    try:
        # Pop sid since they are one-time codes that change on every connect
        username = sid_to_user.pop(fl.request.sid)
        print(f"Username `{username}` found with sid")
    
    except KeyError:
        print("Username not found with sid")


    if len(username) > 0:

        # Room id is unavailable;
        # Remove player from every room since disconnect implies leaving all rooms
        for players in room_clients.values():
            players.discard(username)
            
        # Must remove player with only the sid - convert sid to user and remove with update event
        print(f"Sending update to client to remove {username}")
        fio.emit("update", {"action": "remove_players", "players": username}, broadcast=True)
    
    
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

        # Redirect user to home page
        return fl.redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return fl.render_template("login.html")


@app.route("/logout")
def logout():
    """Log user out"""

    # Forget any user_id
    fl.session.clear()

    # Redirect user to login form
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
