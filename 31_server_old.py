import random
import socket
import json
from time import sleep
from collections import namedtuple
from operator import attrgetter


local_IP = "127.0.0.1"
default_port = 12345
buffer_size = 10000
buffer_time = .5

def to_json(obj) -> str:
    return json.dumps(obj, default=lambda o: o.__dict__)


class ServerState:
    def __init__(self, debug):
        self.debug = debug
        self.socket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
        self.socket.bind((local_IP, default_port))

        self.players = {}

    def send_broadcast(self, kind: str, msg: str):
        if kind == "log":
            for m in msg.split("\n"):
                print(m)
        for p_object in self.players.values():
            self.socket.sendto(to_json({"kind": kind, "msg": msg}).encode(), p_object.address)
    
    def send_to_player(self, address: str, kind: str, msg: str):
        if kind == "log":
            for m in msg.split("\n"):
                print(m)
        if isinstance(msg, str):
            self.socket.sendto(to_json({"kind": kind, "msg": msg}).encode(), address)


    def update_server(self, client_msg: dict):
        # {"name": "", "action": "", "msg": ""}
        # actions: start, add_player, draw, pickup, knock, discard, continue, new_game, quit
        pass

    def server_packet(self, kind: str="", msg: str="") -> dict:
        return {}
        # return {"players": self.players, "current_player": self.current_player, "discard_card": discard_card, "mode": self.mode}
        
        # return {"kind": kind, "msg": msg}
    
    def server_to_client(self):
        pass

class ClientState:
    def __init__(self, debug):
        self.socket = socket.socket(family=socket.AF_INET, type=socket.SOCK_DGRAM)
        self.debug = debug
        self.name = ""


    def user_input_to_packet(self, action, msg) -> dict:
        # actions: start, add_player, draw, pickup, knock, discard, continue, new_game, quit
        return {"name": self.name, "action": action, "msg": msg}

    def client_to_server(self, client_request):
        msg_to_send = json.dumps(client_request).encode()
        
        # send pulse b'null' every once a second to force server response
        if msg_to_send != b'null' or time.time() - self.time_last_sent > buffer_time:
            self.num_msgs_sent += 1
            self.socket.sendto(msg_to_send, (self.server_IP, self.port))
            self.time_last_sent = time.time()

        # receive message from server
        try:
            msg_recv, address = self.socket.recvfrom(buffer_size, socket.MSG_DONTWAIT)
            self.num_msgs_recv += 1
            self.time_last_recv = time.time()
        except BlockingIOError:
            return None
        return msg_recv


    def update_client(self, server_response):
        self.players = server_response["players"]
        self.discard_card = server_response["discard_card"]
        self.mode = server_response["mode"]

    def print_out(self, kind, player="", card=None, score=0):
        sleep(.8)
        if kind == "hand":
            print(f"Current Hand: {self.players[self.name].hand}. Score: {self.players[self.name].calc_score()}")
        elif kind == "pickup":
            print(f"{player} picked up a {card} from discard.")
        elif kind == "discard":
            print(f"Discard: {self.discard_card}")
        elif kind == "welcome":
            print(f"Welcome {self.name}")
        elif kind == "blitz":
            print("Blitz! You win!")
    
    def print_state(self):
        self.print_out("hand")
        self.print_out("discard")
        


# main loop
def combined():
    client = ClientState(debug=True)
    server = ServerState(debug=True)
    
    while True:
        packet = client.user_input_to_packet()
        client_to_server = client.send_to_server(packet)
        server.update_server(client_to_server)
        server_response = server.send_to_client()
        client.update_client(server_response)

combined()



# guide on how to set up non-combined client/server
def run_client(name="", server_IP=local_IP):
    c_state = ClientState(debug=True)
    while True:
        user_input = c_state.get_user_input()
        # 3 client updates - 1. local, 2. sending to server, 3. after server response
        client_request = c_state.build_client_request(user_input)

        server_responses = []
        while True:
            response = c_state.client_to_server(client_request)
            if response is None:
                break
            else:
                server_responses.append(response)

        for response in server_responses:
            if response is not None:
                c_state.update_client(response)

        c_state.render_client()
    
    c_state.socket.close()


def run_server(debug=False,):
    s_state = ServerState(debug=debug)
    s_state.initialize_game()
    while True:
        # receives msg, updates s_state, then sends message
        try:
            s_state.server_to_client()
        except KeyboardInterrupt:
            break
    s_state.send_broadcast("log", "Server is offline.")
    print("\nclosing server")
    s_state.socket.close()
