from functools import wraps
from flask import request, session, redirect
import random
from collections import namedtuple

class User:
    def __init__(self, name: str="", session_id: str="", websocket_id: str=""):
        self.name = name
        self.session_id = session_id
        self.websocket_id = websocket_id
    

    def __repr__(self) -> str:
        return f"User({self.name}, {self.session_id}, {self.websocket_id})"

# Names to randomly assign
NAMES = ["Henk", "Jenkins", "Stone", "Bubbles", "Pickles", "Skwisgaar", "Gertrude", "Marmaduke", "Geraldine", "Squirrel", "Zacefron", "Ringo", "Thanos"]


# Currently not working with flask socketio on_connect - says it needs to take exactly 0 args
def name_required(f):
    """
    Decorate routes to require a username.

    https://flask.palletsprojects.com/en/latest/patterns/viewdecorators/
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        print("Name required wrapper running")
        if len(session.get("username", "")) == 0:
            random_name = get_random_name()
            print(f"random_name = {random_name}")
            session["username"] = random_name

        return f(*args, **kwargs)

    return decorated_function


# Same as name_required but for accounts instead of just username
def login_required(f):
    """
    Decorate routes to require login.

    https://flask.palletsprojects.com/en/latest/patterns/viewdecorators/
    """

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if session.get("user_id", 0) != 0:
            return redirect("/login")
        return f(*args, **kwargs)

    return decorated_function


# Eventually change to pass in existing names so it can check for duplicates
def get_random_name(exclude: set=set()) -> str:
    """Get a random name if user doesn't have one."""

    # Remove names in exclude from available names
    rand_names_set = set(NAMES) - exclude

    # Convert resulting set to list and access random index
    return list(rand_names_set)[random.randint(0, len(rand_names_set) - 1)]


def dict_factory(cursor, row):
    """Returns SQL query as a dict."""
    fields = [column[0] for column in cursor.description]
    return {key: value for key, value in zip(fields, row)}


def to_percent(n: float) -> str:
    """Format as a percentage with 1 decimal place."""
    return f"{(n * 100.0):,.1f}%"


def get_all_clients(room_clients) -> set:
    all_clients = set()
    
    for s in room_clients.values():
        all_clients.union(s)
    
    return all_clients


def is_full(room_users: list, max_players: int):
    return max_players > len(room_users)
        