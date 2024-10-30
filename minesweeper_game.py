import random
from time import time
from collections import namedtuple


Point = namedtuple("Point", ("x", "y"))


class Square:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.adj = 0 # adj to mines number
        self.mine = False
        self.visible = False


    def __repr__(self):
        return f"Square at ({self.x}, {self.y}), mine = {self.mine}, adj = {self.adj}"


    # get number of adjacent mines but not mines themselves. Make sure it's in range i.e. .get()
    def get_adjacent_to_mines(self, state):
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:
                adj = state.squares.get((self.x+dx, self.y+dy), None)
                if adj is not None and adj != self and not adj.mine:
                    adj.adj += 1


class State:
    def __init__(self):
        
        # Board Elements
        self.width = 0
        self.height = 0
        self.num_mines = 0
        self.difficulty = ""

        # Board Collections
        self.squares = {}
        self.mines = set()
        self.adjacent_to_mines = set()
        self.visible_set = set()

        # Win/Lose
        self.win = False
        self.lose = False
        self.game_over = False
        self.reset = False
        self.blow_up = None

        # Timing
        self.has_started = False
        self.start_time = 0
        self.score = 0
    

    def coords_to_index(self, coords: tuple) -> int:
        # validate
        if len(coords) != 2:
            print("Tuple must have 2 items.")
            return None

        if coords[0] > self.width - 1 or coords[1] > self.height - 1:
            print("Coords out of bounds.")
            return None

        # y * self.width + x
        return coords[1] * self.width + coords[0]


    def index_to_coords(self, i: int) -> tuple:
        # validate
        if i > self.height * self.width:
            print("Index out of bounds.")
            return None

        # Can use modulo or divmod
        # x = i % self.width, y = i // self.width

        dm = divmod(i, self.width)
        return (dm[1], dm[0])


    def set_dimensions(self):
        if self.difficulty == "easy":
            self.width, self.height, self.num_mines = 9, 9, 10
        elif self.difficulty == "medium":
            self.width, self.height, self.num_mines = 16, 16, 40
        elif self.difficulty == "hard":
            self.width, self.height, self.num_mines =  30, 16, 99


    def create_board(self, difficulty, fixed_mines=False):

        # Set difficulty & dimensions
        self.difficulty = difficulty
        self.set_dimensions()

        # Create all squares - dict
        self.squares = {(x, y): Square(x, y) for y in range(self.height) for x in range(self.width)}

        # Assign random mines
        if not fixed_mines:
            while len(self.mines) < self.num_mines:
                mine = (self.get_random_coords())
                self.mines.add(self.squares[(mine.x, mine.y)])
                self.squares[(mine.x, mine.y)].mine = True
        
        # Fixed_mines mines for debugging
        elif fixed_mines:
            self.mines = set(
                self.squares[(mine_coord)] for mine_coord in [
                    (1, 2), (6, 4), (2, 3), (0, 5), (7, 5),
                    (3, 6), (7, 6), (0, 7), (2, 7), (2, 8)])

            for mine in self.mines:
                self.squares[(mine.x, mine.y)].mine = True

        # Calc adj to mines
        for mine in self.mines:
            mine.get_adjacent_to_mines(state=self)

        empty_squares = []
        for sq in self.squares.values():
            if not sq.mine:
                if sq.adj > 0:
                    self.adjacent_to_mines.add(sq)
                else:
                    empty_squares.append(sq)


    def get_random_coords(self):
        return Point(random.randrange(self.width), random.randrange(self.height))


    def setup_packet(self):
        # Only need dimensions; keep mines and adj info hidden on server side
        return {"width": self.width, "height": self.height, "num_mines": self.num_mines, "difficulty": self.difficulty}


    def reveal_adjacent_recursive(self, square):
        
        # Double for-loop to get all adjacent squares
        for dy in [-1, 0, 1]:
            for dx in [-1, 0, 1]:

                # Skip over self
                if dy == 0 and dx == 0:
                    continue

                adj = self.squares.get((square.x+dx, square.y+dy))
                
                if adj is not None and not adj.visible:
                    adj.visible = True
                    self.visible_set.add(adj)
                    
                    # If adj is empty, run again
                    if adj.adj == 0: 
                        self.reveal_adjacent_recursive(adj)


    def update_server(self, selection_index: str):
        # Start clock on first move if not started yet
        if not self.has_started:
            self.start_time = time()
            self.has_started = True
        
        # Convert index to int and access squares dict
        square = self.squares[self.index_to_coords(int(selection_index))]
        
        # Hit mine; game over
        if square.mine:
            self.lose = True
            self.game_over = True
            self.blow_up = square

        # Hit a number
        elif square.adj > 0: 
            square.visible = True
            self.visible_set.add(square)

        # Hit empty space; check to reveal additional spaces
        else:
            square.visible = True
            self.visible_set.add(square)
            self.reveal_adjacent_recursive(square)
        
        if self.check_for_win():
            self.win = True
            self.game_over = True

        # If gameover; freeze time
        if self.game_over:
            self.score = time() - self.start_time


    def update_packet(self):
        # Reveal adj, vis, mines as needed
        packet = {"adj": [], "visible": [], "mines": [], "win": self.win}
        
        # Send over mines on win AND lose
        if self.game_over:
            packet["mines"] = [self.coords_to_index((m.x, m.y)) for m in self.mines]

        # Append index of visible square and adj value corresponding with that square
        for s in self.squares.values():
            if s.visible:
                packet["adj"].append(s.adj)
                packet["visible"].append(self.coords_to_index((s.x, s.y)))
        
        assert len(packet["adj"]) == len(packet["visible"]), "len of adj and visible should match"
            
        return packet


    # Check if all non-mine squares are visible
    def check_for_win(self):
        return len(self.visible_set) == (self.width * self.height) - len(self.mines)


# state = State()
# state.create_board(difficulty="easy", fixed_mines=True)
