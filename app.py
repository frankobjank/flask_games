# Python modules
import flask as fl
from flask_session import Session
import sqlite3
from time import time
import werkzeug.security as ws

# Python files
from helpers import dict_factory, to_percent
import minesweeper_game

# link to access app for debug http://127.0.0.1:5000

# Configure application
app = fl.Flask(__name__)

# Configure session to use filesystem (instead of signed cookies)
app.config["SESSION_PERMANENT"] = False
app.config["SESSION_TYPE"] = "filesystem"
Session(app)


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


@app.route("/minesweeper", methods=["GET", "POST"])
def minesweeper():
    
    # POST - receive requests and update board
    if fl.request.method == "POST":

        # Redirect to initial `get` request on reset
        if fl.request.form.get("reset"):
            fl.redirect("/minesweeper")

        # Retrieve minesweeper state from session
        ms = fl.session.get("ms")

        # Square index from client
        square_idx = fl.request.form.get("square")

        # Only return data if game not over
        if square_idx and not (ms.win or ms.lose):
            ms.update_server(square_idx)
            
            # Connect to database on gameover; should only happen once
            if ms.game_over:
                
                # Validate score received from client to prevent cheating
                server_score = int(ms.score)
                client_score = int(fl.request.form.get("score"))

                # Test if margin of error is less than 20%
                if abs(server_score - client_score) < (0.2 * server_score):
                    server_score = client_score

                # Update database only if logged in
                if fl.session.get("user_id"):
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


@app.route("/minesweeper/stats")
def minesweeper_stats():
    # If not logged in
    if fl.session.get("user_id") is None:
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
                "SELECT score, win, date FROM ms_stats WHERE user_id = ? AND mode = ? AND score != 0", (fl.session.get("user_id"), mode)
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
                                     pwhash, fl.request.form.get("password")):
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
                            fl.request.form.get("password")),
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
                                       (fl.session.get("user_id"),))

        pwhash_from_server = ""
        
        for row in db_response:
            pwhash_from_server = row["pwhash"]

        if len(pwhash_from_server) == 0:
            return apology("Error connecting to database.", 500)

        # Ensure old password is correct
        if not ws.check_password_hash(pwhash_from_server, fl.request.form.get("old_password")):
            return apology("Invalid password.", 403)

        # Check for dupe password
        if ws.check_password_hash(pwhash_from_server, fl.request.form.get("new_password")):
            return apology("New password must be different from the old password.", 400)

        # If not dupe, update password hash in table
        with sqlite3.connect("database.db") as conn:
            conn.row_factory = dict_factory
            conn.execute("UPDATE users SET pwhash = ? WHERE id = ?",
                   (ws.generate_password_hash(fl.request.form.get("new_password")),
                   fl.session.get("user_id")))

        fl.flash("Your password has been changed!")

        # Redirect user to home
        return fl.redirect("/")

    # User reached route via GET (as by clicking a link or via redirect)
    else:
        return fl.render_template("change_password.html")


def apology(message, code=400):
    """Render message as an apology to user."""
    return fl.render_template("apology.html", top=code, bottom=message), code
