from flask import session, redirect
from functools import wraps
import random
from time import strftime, localtime

# Names to randomly assign
NAMES = ["Henk", "Jenkins", "Stone", "Bubbles", "Pickles", "Skwisgaar", "Gertrude", "Marmaduke", "Geraldine", "Squirrel", "Zacefron", "Ringo", "Thanos"]


class User:
    def __init__(self, name: str="", session_cookie: str="", websocket_id: str="", room: str=""):
        self.name = name
        self.session_cookie = session_cookie
        
        # Theoretically multiple rooms connects are possible so websocket id and room should be sets
        self.websocket_id = websocket_id
        self.room = room

        # Keep track of connection status to reconnect if user gets disconnected
        self.connected = False


    def __repr__(self) -> str:
        return f"User(name={self.name}, session_cookie={self.session_cookie}, websocket_id={self.websocket_id}, room={self.room}, connected={self.connected})"
    

    def __str__(self) -> str:
        return f"{self.name}"


class Room:
    def __init__(self, name: str, roompw: str, game_name: str, capacity: int, date_created: int, creator: str):
        self.name = name
        self.roompw = roompw
        self.game_name = game_name
        self.capacity = capacity
        self.date_created = date_created
        self.time_last_used = date_created
        self.creator = creator

        # Was storing these in standalone dicts, can move to this class
        self.users = []

        # An instance of game state - 1 per room
        self.game = None


    def is_full(self) -> bool:
        return len(self.users) >= self.capacity
    
    
    def package_self(self) -> dict:
        """Put variables to send to client into a dict."""
        
        if self.game:
            in_progress = self.game.in_progress
        else:
            in_progress = False
        
        return {
            "name": self.name,
            "game_name": self.game_name,
            "capacity": self.capacity,
            "date_created": strftime('%D %I:%M %p', localtime(self.date_created)),
            "creator": self.creator,
            "clients_connected": len(self.users),
            "in_progress": in_progress
        }
    

    def get_num_connected(self) -> int:
        return len([user for user in self.users if user.connected])


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


def get_all_clients(rooms: dict[str,Room] ) -> set:
    all_clients = set()
    
    for r in rooms.values():
        all_clients.union(r.users)
    
    return all_clients
