// https://socket.io/docs/v4/client-api/

// Room, Socket Variables
// Initializing socket
const socket = io();

// On page load - 'Main' function
document.addEventListener('DOMContentLoaded', () => {

    // Populate table with room data
    addRooms(roomData);
});

// Include:
    // Option to create new room
    // Option to delete room (but only can be done by creator of room or site admin)
    // Table of rooms - columns:
        // "name": self.name,
        // "game": self.game,
        // "capacity": self.capacity,
        // "date_created": strftime('%Y-%m-%d %I:%M:%S %p', localtime(self.date_created)),
        // "creator": self.creator,
        // "clients_connected": len(self.clients),
        // "in_progress": in_progress
        
        // 'Join room' button

        // <th id="room-th-name">Name</th>
        // <th id="room-th-game">Game</th>
        // <th id="room-th-players">Players</th>
        // <th id="room-th-date_created">Date Created</th>
        // <th id="room-th-creator">Created By</th>
        // <th id="room-th-in_progress">Game Running?</th>

function addRooms(newRooms) {
    const tbody = document.querySelector('#room-tbody');

    for (const room of newRooms) {
        if (document.querySelector('#room-tr-' + room.name) !== null) {
            console.log(`Duplicate room found when adding room ${room.name}.`);
            continue;
        }

        const row = document.createElement('tr');
        row.className = 'room-tr';
        row.id = 'room-tr-' + room.name;

        // Adding onclick to row instead of using button to join room
        row.onclick = () => {
            joinRoom(room.name);
        }

        const tdname = document.createElement('td');
        tdname.innerHTML = room.name;
        row.appendChild(tdname);

        const tdgame = document.createElement('td');
        tdgame.innerHTML = room.game;
        row.appendChild(tdgame);
        
        const tdplayers = document.createElement('td');
        tdplayers.innerHTML = `${room.clients_connected} / ${room.capacity}`;
        row.appendChild(tdplayers);
        
        const tdcreator = document.createElement('td');
        tdcreator.innerHTML = room.creator;
        row.appendChild(tdcreator);

        const tddate = document.createElement('td');
        tddate.innerHTML = room.date_created;
        row.appendChild(tddate);

        const tdin_progress = document.createElement('td');
        tdin_progress.innerHTML = room.in_progress;
        row.appendChild(tdin_progress);

        // const roomButton = document.createElement('button');
        // roomButton.className = 'room-button btn-custom';
        // roomButton.id = room.name + '-button';
        
        // // Disable button if room is full
        // roomButton.disabled = room.capacity === room.clients_connected;
        // roomButton.onclick = () => {
        //     joinRoom(room.name);
        // }
        // tbody.appendChild(roomButton);

        tbody.appendChild(row);
    }
    
}


// Socketio

// Join room
function joinRoom(room) {
    console.log('Sending join request.');
    
    // Pass name of room to server
    socket.emit('join', {'room': room}, (response) => {
        console.log(`Response to join: ${response}`);
    });
    
    // If accepted, should direct to a game page
}

// Updating table whenever room is added or players join/leave rooms
socket.on('update_table', data => {
    // For debug:
    console.log(`Client received update_table event: ${JSON.stringify(data)}.`);
    
    updateRoom(data);
});

socket.on('connect', () => {
    console.log('Client connect event.');
    // Incorporate `socket.recovered`?
});

socket.on('disconnect', () => {
    console.log('Client disconnect event.');
});

// Receiving debug messages
socket.on('debug_msg', data => {
    console.log(`Client debug msg received: ${data.msg}`);
});
