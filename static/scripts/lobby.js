// https://socket.io/docs/v4/client-api/

// Room, Socket Variables
// Initializing socket
const socket = io();

// May not need this array if rooms are part of table
// let rooms = [];

// On page load - 'Main' function
document.addEventListener('DOMContentLoaded', () => {

    // Create room table and populate with room data
    roomTable = createRoomTable(roomData);

    // Add all elements created to outer container
    document.querySelector('.outer-container').appendChild(roomTable);
    
    // Need to add onclick for room buttons here after they've been added to document
    addOnClick()
});

// Include:
    // Option to create new room
    // Option to delete room (but only can be done by creator of room or site admin)
    // Table of rooms - columns:
        // "name": self.name,
        // "game": self.game,
        // "capacity": self.capacity,
        // "date_created": strftime('%Y-%m-%d %H:%M:%S', localtime(self.date_created)),
        // "creator": self.creator,
        // "clients_connected": len(self.clients),
        // "in_progress": in_progress
        
        // 'Join room' button

function createRoomTable(roomData) {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    
    const table = document.createElement('table');
    table.className = 'table table-striped room-table';
    table.id = 'room-table';

    const head = document.createElement('thead');
    head.className = 'room-table';
    head.id = 'room-table-head';


    for (const roomName of rooms) {
        const roomButton = document.createElement('button');
        roomButton.className = 'room-button';
        roomButton.id = roomName + '-button';
        roomButton.innerHTML = roomName;
        
        // Disable button if currently in room
        roomButton.disabled = roomName === currentRoom;
        
        // Adding onclick later with addOnClick()

        tableContainer.appendChild(roomButton);
    }
    
    tableContainer.appendChild(table);

    return tableContainer;
}


function addOnClick() {
    
    // Onclick above was not working; Moving to end of function
    document.querySelectorAll('.room-button').forEach(room => {
        room.onclick = () => {
            if (inProgress) {
                console.log('Cannot switch rooms when game is in progress.');
                return;
            }

            // Check if already in selected room
            if (room.innerHTML === currentRoom) {
                msg = `You are already in ${currentRoom} room.`;
                addToLog(msg);

            } else {
                // Join room if not in room
                if (currentRoom === undefined) {
                    joinRoom(room.innerHTML);
                } else {

                    // Else leave current room and join new room
                    const promise = leaveRoom(username, currentRoom);
                    
                    // Process leaveRoom as a promise
                    promise
                        .then(() => {
                            // On successful leave, teardown will be requested by server
                            console.log('Successfully left room.');

                            joinRoom(room.innerHTML);
                        })
                        .catch((error) => {
                            console.log(`Could not leave ${currentRoom}: ${error}`);
                        });
                }
            }
        }
    });
}

function updateRooms(data) {

}

// Socketio

// Join room
function joinRoom(room) {
    console.log('Client join event.');
    
    // Pass name of room to server
    socket.emit('join', {'room': room});
    
    // Server should check for game state on join and load game if game is in progress
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
