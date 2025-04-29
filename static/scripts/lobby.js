// Room, Socket Variables
// Initializing socket
const socket = io();
// TODO: Add leaveRoom() functions to all nav buttons that direct user to different page

// Client username - assign on connect if not logged into account
let username = '';

// Used on join to keep track of current room
var currentRoom;

// Global var chosenGame set in game.html - from flask session

// Use for validation when creating new usernames / room names
const nameValidation = '[a-zA-Z0-9_]{4,12}';  // Alphanumeric, underscores, len 4-12
const roomNameValidation = '[a-zA-Z0-9_]{4,18}';  // Alphanumeric, underscores, len 4-18
const roompwValidation = '^$|.{4,18}';  // Empty OR any string len 4-18
const GAME_DISPLAY_NAMES = { 'thirty_one': '31', 'cribbage': 'Cribbage', 'natac': 'Natac' };

// On page load
document.addEventListener('DOMContentLoaded', () => {
    // Join room - will join lobby on initial GET
    joinRoom('lobby');
});

// Overlay for background of modals; 
// Can use same one for every modal since it covers whole screen
const modalOverlay = document.createElement('div');
modalOverlay.id = 'modal-overlay';
// Allows user to click outside of modal to close it
modalOverlay.onclick = () => {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        closeModal(modal);
    })
}

document.querySelector('body').appendChild(modalOverlay);

function createUsernameModal() {
    // Copied from createUsernameInput for use on lobby header
    // Currently only used to enter username when trying to enter a room.
    // Room will be passed back on set_username response automatically join room after username is set

    // Modal for setting username
    const usernameModal = document.createElement('div');
    usernameModal.className = 'modal set-username';
    usernameModal.id = 'username-modal';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header set-username';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title set-username';
    modalTitle.innerText = 'Please enter a username to enter the room.';

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close-button set-username';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        closeModal(usernameModal);
    }

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    const modalBody = document.createElement('div');
    modalBody.id = 'username-modal-body';
    modalBody.className = 'modal-body set-username mt-3 mb-3';

    const labelContainer = document.createElement('span');
    
    const addUsernameLabel = document.createElement('label');
    addUsernameLabel.innerText = 'Enter a name:';
    addUsernameLabel.htmlFor = 'username-modal-input'
    
    const inputContainer = document.createElement('span');

    const addUsernameInput = document.createElement('input');
    addUsernameInput.className = 'modal-input';
    addUsernameInput.id = 'username-modal-input';
    addUsernameInput.type = 'text';
    addUsernameInput.autocomplete = 'off';
    addUsernameInput.placeholder = 'Enter username';
    addUsernameInput.pattern = nameValidation;
    
    labelContainer.appendChild(addUsernameLabel);
    inputContainer.appendChild(addUsernameInput);

    modalBody.appendChild(labelContainer);
    modalBody.appendChild(inputContainer);

    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer set-username';

    const submitButton = document.createElement('button');
    submitButton.className = 'username-modal-button btn btn-primary form-control w-auto';
    submitButton.id = 'set-username-submit-button';
    submitButton.innerText = 'Enter Room';

    // Set submitButton onclick when modal is opened because it contains specific room to join 

    // Set `enter` to send message
    addUsernameInput.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            submitButton.click();
        };
    });
    
    // Moving close button from header to body for clarity
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary modal-cancel-button set-username';
    cancelButton.innerText = 'Cancel';
    cancelButton.onclick = () => {
        closeModal(usernameModal);
    }

    modalFooter.appendChild(submitButton);
    modalFooter.appendChild(cancelButton);

    usernameModal.appendChild(modalHeader);
    usernameModal.appendChild(modalBody);
    usernameModal.appendChild(modalFooter);

    return usernameModal;
}

const usernameModal = createUsernameModal();
document.querySelector('body').appendChild(usernameModal);

function setUsernameOnclick(roomToJoin) {

    document.querySelector('#set-username-submit-button').onclick = () => {
        
        // Prevent sending blank input
        if (document.querySelector('#username-modal-input').value.length > 0) {
            
            document.querySelector('#room-tr-' + roomToJoin).click();
            // // Using emitWithAck - for callback. Returns promise
            // const promise = socket.emitWithAck('set_username', {'username_request': document.querySelector('#username-modal-input').value, 'room': currentRoom});
            
            // promise
            //     .then((data) => {
            //         // Msg successfully sent / received but server validation failed.
            //         if (!data.accepted) {
            //             console.log(`Error: ${data.msg}`);
            //             return data.accepted;
            //         }
                    
            //         // Successful request, add username.
            //         username = data.username;
            //         document.querySelector('#room-tr-' + roomToJoin).dataset.roomUsername = data.username;
            //         console.log(`Username successfully added: ${data.username}.`);
                        
            //         // Close modal and reset input
            //         closeModal(document.querySelector('#username-modal'));
            //         document.querySelector('#username-modal-input').value = '';
                    
            //         // Start leave and join process
            //         leaveAndJoin(username, roomToJoin);
                    
            //         // Row Onclick calls prejoin - since name has been set, should pass prejoin
            //         // This feels circular - row.onclick opened this modal and resolving the modal activates the onclick to join the room
            //         // There is probably a way to do this with promises, not sure which way is 'better'
            //         // document.querySelector('#room-tr-' + roomToJoin).click();
            //     })
            //     .catch((error) => {
            //         console.error(`Could not set username: ${error}`);
            //     });
        };
    };
}    

function createPasswordModal() {
    // Copied from createUsernameModal
    // This will be a combined username - room password modal

    const passwordModal = document.createElement('div');
    passwordModal.className = 'modal room-password';
    passwordModal.id = 'password-modal';
    
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header room-password';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title room-password';
    modalTitle.innerText = 'This room requires a password to enter.';

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close-button room-password';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        closeModal(passwordModal);
    }

    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    
    const modalBody = document.createElement('div');
    modalBody.id = 'password-modal-body';
    modalBody.className = 'modal-body room-password mt-3 mb-3';

    // Username
    const usernameDiv = document.createElement('div');
    // Allows space-between flex to carry through from modal-body
    usernameDiv.display = 'contents';

    const userLabelContainer = document.createElement('span');
    
    const usernameLabel = document.createElement('label');
    usernameLabel.innerText = 'Enter a name:';
    usernameLabel.htmlFor = 'combined-username-modal-input'
    
    const userInputContainer = document.createElement('span');

    const usernameInput = document.createElement('input');
    usernameInput.className = 'modal-input';
    usernameInput.id = 'combined-username-modal-input';
    usernameInput.type = 'text';
    usernameInput.autocomplete = 'off';
    usernameInput.placeholder = 'Enter username';
    usernameInput.pattern = nameValidation;
    
    userLabelContainer.appendChild(usernameLabel);
    userInputContainer.appendChild(usernameInput);

    usernameDiv.appendChild(userLabelContainer);
    usernameDiv.appendChild(userInputContainer);

    // Room password
    const pwDiv = document.createElement('div');
    // Allows space-between flex to carry through from modal-body
    pwDiv.display = 'contents';
    
    const pwLabelContainer = document.createElement('span');
    
    const roomPasswordLabel = document.createElement('label');
    roomPasswordLabel.innerText = 'Room password:';
    roomPasswordLabel.htmlFor = 'password-modal-input'
    
    const pwInputContainer = document.createElement('span');

    const roomPasswordInput = document.createElement('input');
    roomPasswordInput.className = 'modal-input';
    roomPasswordInput.id = 'password-modal-input';
    roomPasswordInput.type = 'password';
    roomPasswordInput.autocomplete = 'off';
    roomPasswordInput.placeholder = 'Enter password';
    
    pwLabelContainer.appendChild(roomPasswordLabel);
    pwInputContainer.appendChild(roomPasswordInput);

    pwDiv.appendChild(pwLabelContainer);
    pwDiv.appendChild(pwInputContainer);
    
    modalBody.appendChild(usernameDiv);
    modalBody.appendChild(pwDiv);

    const modalFooter = document.createElement('div');
    modalFooter.className = 'modal-footer room-password';

    const submitButton = document.createElement('button');
    submitButton.className = 'password-modal-button btn btn-primary form-control w-auto';
    submitButton.id = 'room-password-submit-button';
    submitButton.innerText = 'Enter Room';

    // Set submitButton onclick when modal is opened because it contains specific room to join 

    // Set `enter` to send message
    roomPasswordInput.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            submitButton.click();
        };
    });
    
    // Moving close button from header to body for clarity
    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary modal-cancel-button room-password';
    cancelButton.innerText = 'Cancel';
    cancelButton.onclick = () => {
        closeModal(passwordModal);
    }

    modalFooter.appendChild(submitButton);
    modalFooter.appendChild(cancelButton);

    passwordModal.appendChild(modalHeader);
    passwordModal.appendChild(modalBody);
    passwordModal.appendChild(modalFooter);

    return passwordModal;
}

const passwordModal = createPasswordModal();
document.querySelector('body').appendChild(passwordModal);

function setPasswordOnclick(roomToJoin) {

    usernameInput = document.querySelector('#combined-username-modal-input');
    
    // Fill in username as readonly value in username field if username has been provided for room already
    if (document.querySelector('#room-tr-' + roomToJoin).dataset.roomUsername.length > 0) {
        
        usernameInput.readOnly = true;
        usernameInput.value = document.querySelector('#room-tr-' + roomToJoin).dataset.roomUsername;
    }
    // Otherwise, empty the value and remove readOnly
    else {
        
        usernameInput.readOnly = false;
        // Should be happening automatically on modal close
        // usernameInput.value = '';
    }

    document.querySelector('#room-password-submit-button').onclick = () => {
        
        // Prevent sending blank input
        if (document.querySelector('#password-modal-input').value.length > 0) {
            
            // Activate row onclick, i.e. prejoin. Can pull values here by id.
            document.querySelector('#room-tr-' + roomToJoin).click();
        };
    };
}    



// Include (for addRooms()):
    // Option to create new room
    // Option to delete room (but only can be done by creator of room or site admin)
    // Table of rooms - columns:
        // "name": self.name,
        // "game_name": self.game_name,
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

        // Check if room already exists - do not allow rooms with the same name
        if (document.querySelector('#room-tr-' + room.name) !== null) {
            console.log(`Duplicate room found when adding room ${room.name}.`);
            continue;
        }

        const row = document.createElement('tr');
        row.className = 'room-tr';
        row.id = 'room-tr-' + room.name;
        // The problem is this is reset every lobby reload - server could send info
        row.dataset.roomUsername = '';

        row.dataset.roomName = room.name;
        row.dataset.pwFlag = room.pw_flag;
        row.dataset.gameName = room.game_name;
        row.dataset.clientsConnected = room.clients_connected;
        row.dataset.inProgress = room.in_progress;

        // Adding onclick to row instead of using button or anchor
        // Event listener here is async because there is an await in the function
        row.onclick = () => {
            console.log('Row onclick')

            let reqUsername = '';

            // Use different usernames for prejoin depending on password flag 
            // different modals are used depending on existence of password
            if (room.pw_flag > 0) {
                reqUsername = document.querySelector('#combined-username-modal-input').value;
            }
            else {
                reqUsername = document.querySelector('#username-modal-input').value;
            }

            // preJoin is async function; handled as a Promise
            const promise = preJoin(room.name, document.querySelector('#password-modal-input').value,
                                    reqUsername);

            promise
                .then((data) => {
                    
                    if (!data.can_join) {
                        // Message received / returned, but server failed validation
                        if (data.ask === 'username') {
                            console.log('Opening modal to set username.');
    
                            // Set submit button onclick for username modal - need to include room to join
                            setUsernameOnclick(room.name);

                            openModal(document.querySelector('#username-modal'));
                        }

                        else if (data.ask === 'password') {
                            console.log('Opening modal to enter password');
                            
                            // Pass username to row data if username found
                            if (data.username && data.username.length > 0) {
                                row.dataset.roomUsername = data.username;
                            }
                            
                            // Set submit button onclick for password modal
                            setPasswordOnclick(room.name);
                            openModal(document.querySelector('#password-modal'));
                        }

                        else {
                            console.log(`Prejoin failed: ${data.msg}`);
                        }
                        
                        return false;
                    }

                    // Set username if found
                    if (data.username && data.username.length > 0) {
                        username = data.username;
                        row.dataset.roomUsername = data.username;
                    }

                    console.log('Join is allowed.');
                    return true;                        
                    
                })
                .then((cont) => {
                    console.log(`Rejoining = ${cont}`)
                    if (cont) {
                        leaveAndJoin(username, room.name);
                    }

                })
                .catch((error) => {
                    console.error(`Issue with prejoin: ${error}`);
                });
        }

        const tdname = document.createElement('td');
        tdname.className = 'room-td';
        tdname.innerText = room.name;
        
        // Add padlock to room name that is password-protected
        if (room.pw_flag) {
            // Whitespace padding between icon and name
            tdname.innerHTML += '&nbsp;&nbsp;';

            const lockI = document.createElement('i');
            lockI.className = 'bi-lock-fill';
            
            tdname.appendChild(lockI);
        }

        row.appendChild(tdname);

        const tdgame = document.createElement('td');
        tdgame.className = 'room-td';
        tdgame.innerText = GAME_DISPLAY_NAMES[room.game_name];
        row.appendChild(tdgame);
        
        const tdplayers = document.createElement('td');
        tdplayers.className = 'room-td';
        tdplayers.id = 'room-td-players-' + room.name;
        tdplayers.innerText = `${room.clients_connected} / ${room.capacity}`;
        row.appendChild(tdplayers);
        
        const tddate = document.createElement('td');
        tddate.className = 'room-td';
        tddate.innerText = room.date_created;
        row.appendChild(tddate);
        
        const tdin_progress = document.createElement('td');
        tdin_progress.className = 'room-td';
        tdin_progress.id = 'room-td-in_progress-' + room.name;
        tdin_progress.innerText = room.in_progress;
        
        // Create a div to change between red and green depending on status
        const status = document.createElement('div');
        status.className = 'room-td-in_progress';

        tdin_progress.appendChild(status);

        row.appendChild(tdin_progress);

        tbody.appendChild(row);
    }
    
}

// function createUsernameInput() {
//     // Add username - only display this if username not set yet
//     const usernameInputContainer = document.createElement('div');
//     usernameInputContainer.id = 'username-input-container';
    
//     const addUsernameLabel = document.createElement('label');
//     addUsernameLabel.htmlFor = 'username-input'

//     const addUsernameInput = document.createElement('input');
//     addUsernameInput.className = 'lobby-header-input form-control w-auto';
//     addUsernameInput.id = 'username-input';
//     addUsernameInput.type = 'text';
//     addUsernameInput.autocomplete = 'off';
//     addUsernameInput.placeholder = 'Enter username';
//     addUsernameInput.pattern = nameValidation;
    
//     usernameInputContainer.appendChild(addUsernameInput);

//     const submitButton = document.createElement('button');
//     submitButton.className = 'lobby-header-button btn btn-secondary form-control w-auto';
//     submitButton.innerText = 'Submit username';

//     submitButton.onclick = () => {
//         // Prevent sending blank input
//         if (addUsernameInput.value.length > 0) {

//             // Using emitWithAck - for callback. Returns promise
//             const promise = socket.emitWithAck('set_username', {'username_request': addUsernameInput.value, 'room': currentRoom});
            
//             promise
//                 .then((data) => {
//                     // Msg successfully sent / received but server validation failed.
//                     if (!data.accepted) {
//                         console.log(`Error: ${data.msg}`);
//                         return;
//                     }
                    
//                     // Successful request, add username.
//                     username = data.username;
//                     console.log(`Username successfully added: ${data.username}.`);

//                     document.querySelector('#lobby-username-container').removeChild(document.querySelector('#username-input-container'));

//                     // Add welcome to lobby
//                     const welcome = createWelcome();
//                     document.querySelector('#lobby-username-container').appendChild(welcome);
//                 })
//                 .catch((error) => {
//                     console.error(`Could not set username: ${error}`);
//                 });

//         };
//     };

//     // Set `enter` to send message
//     addUsernameInput.addEventListener('keyup', (event) => {
//         event.preventDefault();
//         if (event.key === 'Enter') {
//             submitButton.click();
//         };
//     });

//     usernameInputContainer.appendChild(submitButton);

//     return usernameInputContainer;
// }

function createWelcome() {
    const welcome = document.createElement('h4');
    welcome.id = 'lobby-welcome';
    welcome.innerText = `Welcome ${username}`;
    return welcome;
}

function updateLobby(response) {
    if (response === undefined) {
        console.log('response = undefined');
        return;
    }
    
    // Called on join. Client adds username, builds room.
    if (response.action === 'setup_room') {
        
        // Update global var `currentRoom`
        currentRoom = response.room;
        
        // Assign username if not yet defined
        if (username.length === 0) {
            username = response.username;
        }

        // Remove toLobby button
        document.querySelector('#sub-header-left').replaceChildren();
        
        // Update page title
        document.querySelector('title').innerText = 'The Space: Lobby';

        // Update header - only time chosenGame var is used
        document.querySelector('#sub-header-center-h2').innerText = `Lobby - ${GAME_DISPLAY_NAMES[chosenGame]}`;
        
        // Create lobby container
        const lobbyContainer = document.createElement('div');
        lobbyContainer.className = 'lobby-container';
        document.querySelector('#outer-container').appendChild(lobbyContainer);
        
        // // -- Lobby header --
        // const lobbyHeader = document.createElement('div');
        // lobbyHeader.className = 'lobby-header';
        // lobbyHeader.id = 'lobby-header-container';
        // lobbyContainer.appendChild(lobbyHeader);
        
        // Container for new room button
        const newRoomContainer = document.createElement('div');
        newRoomContainer.className = 'create-room';
        
        // Create new room modal
        const newRoomModal = createNewRoomModal();
        newRoomContainer.appendChild(newRoomModal);
        
        const newRoomButton = document.createElement('button');
        newRoomButton.className = 'lobby-header-button btn btn-secondary form-control w-auto';
        newRoomButton.id = 'open-modal-create-room';
        newRoomButton.innerText = 'Create Room';
        newRoomButton.onclick = () => {
            openModal(document.querySelector('#create-room-modal'));
        }
        
        newRoomContainer.appendChild(newRoomButton);
        
        // Add new room to sub-header-left
        document.querySelector('#sub-header-left').appendChild(newRoomContainer);
        
        // const lobbyUsername = document.createElement('div');
        // lobbyUsername.className = 'add-username';
        // lobbyUsername.id = 'lobby-username-container';
        
        // // Add welcome to sub-header-right - will need to clear on game room setup
        // document.querySelector('#sub-header-right').appendChild(lobbyUsername);
        
        // if (username === undefined || username.length === 0) {
        //     // const usernameInputContainer = createUsernameInput();
        //     // lobbyUsername.appendChild(usernameInputContainer);
            
        // }
        // else if (username.length > 0) {
        //     const welcome = createWelcome();
        //     lobbyUsername.appendChild(welcome);
        // }

        // -- End lobby header --

        // Lobby table
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        lobbyContainer.appendChild(tableContainer);

        const roomTable = document.createElement('table');
        roomTable.className = 'table table-striped room-table';
        roomTable.id = 'room-table';
        tableContainer.appendChild(roomTable);

        // -- Lobby thead --
        const thead = document.createElement('thead');
        thead.className = 'room-thead';
        thead.id = 'room-thead';
        roomTable.appendChild(thead);

        // All header cells
        const theadRoom = document.createElement('th');
        theadRoom.id = 'room-thead-name';
        theadRoom.innerText = 'Room';
        thead.appendChild(theadRoom);

        const theadGame = document.createElement('th');
        theadGame.id = 'room-thead-game';
        theadGame.innerText = 'Game';
        thead.appendChild(theadGame);

        const theadPlayers = document.createElement('th');
        theadPlayers.id = 'room-thead-players';
        theadPlayers.innerText = 'Players';
        thead.appendChild(theadPlayers);

        const theadDate = document.createElement('th');
        theadDate.id = 'room-thead-date_created';
        theadDate.innerText = 'Date Created';
        thead.appendChild(theadDate);

        const theadInProgress = document.createElement('th');
        theadInProgress.id = 'room-thead-in_progress';
        theadInProgress.innerText = 'Game in progress';
        thead.appendChild(theadInProgress);
        // -- End Lobby thead --

        // tbody - to be filled in via addRooms
        const tbody = document.createElement('tbody');
        tbody.className = 'room-tbody';
        tbody.id = 'room-tbody';
        roomTable.appendChild(tbody);
    }

    // Called on leave. Removes panels so they can be re-added with new data.
    else if (response.action === 'teardown_room') {

        // Remove lobby container
        if (document.querySelector('.lobby-container') !== null) {
            document.querySelector('.lobby-container').remove();
        }
    }

    // Add rooms to lobby
    else if (response.action === 'add_rooms') {
        // Called when loading lobby and when creating new room
        addRooms(response.rooms);
    }

    // Update number of players in a room when a player leaves or joins
    else if (response.action === 'update_lobby_table') {
        
        // Check that row exists
        if (document.querySelector('#room-tr-' + response.row) === null) {
            console.log(`${response.row} does not exist.`);
            return;
        }

        // Update number of players
        if (response.col === 'players') {
            document.querySelector('#room-td-players-' + response.row).innerText = response.new_value;
        }

        // Update in_progress
        if (response.col === 'in_progress') {
            
            // Update row dataset
            document.querySelector('#room-tr-' + response.row).dataset.inProgress = response.new_value;

            document.querySelector('#room-td-in_progress-' + response.row).innerText = response.new_value;
        }
        
    }
}

function createNewRoomModal() {
    // Lookup to dynamically set max capacity (min capacity is 2 for all)
    // const capacityLookup = {'thirty_one': 7, 'cribbage': 3, 'natac': 4};

    // Modal for setting up a new room
    const newRoomModal = document.createElement('div');
    newRoomModal.className = 'modal create-room';
    newRoomModal.id = 'create-room-modal';

    // Close modal when escape key is pressed
    // Bug -- This only worked when close button or input field was selected
    // newRoomModal.addEventListener('keydown', (event) => {
    //     console.log(`key ${event.code} pressed`)
    //     if (event.code === 'Escape') {
    //         console.log('escape being pressed?')
    //         closeModal(newRoomModal);
    //     }
    // })

    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header create-room';
    
    const modalTitle = document.createElement('div');
    modalTitle.className = 'modal-title create-room';
    modalTitle.innerText = 'Create a New Room';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close-button create-room';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => {
        closeModal(newRoomModal);
    }
    
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body create-room';

    // Set up under `form` even though the handler will be a socket.io event instead of a regular GET or POST
    const form = document.createElement('form');

    // Choose game
    const gameFieldset = document.createElement('fieldset');
    gameFieldset.id = 'create-room-game-fieldset';

    const gameLegend = document.createElement('legend');
    gameLegend.id = 'create-room-game-legend';
    gameLegend.innerText = 'Choose a Game:';

    gameFieldset.appendChild(gameLegend);

    const gameChoicesContainer = document.createElement('div');
    gameChoicesContainer.className = 'btn-group'
    
    const thirtyOneInput = document.createElement('input');
    thirtyOneInput.type = 'radio';
    thirtyOneInput.id = 'create-room-thirty_one';
    thirtyOneInput.name = 'game';
    thirtyOneInput.value = 'thirty_one';
    thirtyOneInput.autocomplete = 'off';
    thirtyOneInput.required = true;
    
    const thirtyOneLabel = document.createElement('label');
    thirtyOneLabel.className = 'btn btn-secondary';
    thirtyOneLabel.htmlFor = 'create-room-thirty_one';
    thirtyOneLabel.innerText = 'Thirty One';
    
    const cribbageInput = document.createElement('input');
    cribbageInput.type = 'radio';
    cribbageInput.id = 'create-room-cribbage';
    cribbageInput.name = 'game';
    cribbageInput.value = 'cribbage';
    cribbageInput.autocomplete = 'off';
    cribbageInput.required = true;
    
    const cribbageLabel = document.createElement('label');
    cribbageLabel.className = 'btn btn-secondary';
    cribbageLabel.htmlFor = 'create-room-cribbage';
    cribbageLabel.innerText = 'Cribbage';
    
    const natacInput = document.createElement('input');
    natacInput.type = 'radio';
    natacInput.id = 'create-room-natac';
    natacInput.name = 'game';
    natacInput.value = 'natac';
    natacInput.autocomplete = 'off';
    natacInput.required = true;
    
    const natacLabel = document.createElement('label');
    natacLabel.className = 'btn btn-secondary';
    natacLabel.htmlFor = 'create-room-natac';
    natacLabel.innerText = 'Natac';

    gameChoicesContainer.appendChild(thirtyOneInput);
    gameChoicesContainer.appendChild(thirtyOneLabel);
    gameChoicesContainer.appendChild(cribbageInput);
    gameChoicesContainer.appendChild(cribbageLabel);
    gameChoicesContainer.appendChild(natacInput);
    gameChoicesContainer.appendChild(natacLabel);

    gameFieldset.appendChild(gameLegend);
    gameFieldset.appendChild(gameChoicesContainer);
    
    let btnArray = [thirtyOneLabel, cribbageLabel, natacLabel]
    
    // Add event listener for label buttons to be active (selected) on click
    btnArray.forEach(btn => {
        btn.addEventListener('click', () => {
            
            // Set clicked button to active and DE-activate all others
            btn.classList.add('active');
            
            // Loop through array again to find all others
            btnArray.forEach(btnCompare => {
                if (btn.innerText !== btnCompare.innerText){
                    btnCompare.classList.remove('active');
                }
            })
        })
    })

    const roomFieldset = document.createElement('fieldset');
    roomFieldset.id = 'create-room-details-fieldset';
    
    const roomLegend = document.createElement('legend');
    roomLegend.id = 'create-room-details-legend';
    roomLegend.innerText = 'Room Name and Password';

    // Room name
    const roomContainer = document.createElement('div');
    roomContainer.id = 'create-room-name-container';
    
    const roomLabel = document.createElement('label');
    roomLabel.htmlFor = 'create-room-name'
    roomLabel.innerText = 'Room Name:';
    
    const roomHelpText = 'Room name must be 4-18 characters long and only contain letters, numbers, or underscores.';

    const roomInput = document.createElement('input');
    roomInput.className = 'form-control';
    roomInput.id = 'create-room-name';
    roomInput.type = 'text';
    // Use same pattern as username - includes min and max length
    roomInput.title = roomHelpText;
    roomInput.pattern = roomNameValidation;
    roomInput.autocomplete = 'off';
    roomInput.required = true;

    // const roomSmall = document.createElement('small');
    // roomSmall.className = 'form-small';
    // roomSmall.innerText = roomHelpText;
    
    roomContainer.appendChild(roomLabel);
    roomContainer.appendChild(roomInput);
    // roomContainer.appendChild(roomSmall);
    
    // Password (optional)
    const pwContainer = document.createElement('div');
    pwContainer.id = 'create-room-password-container';
    
    const pwHelpText = 'Password must either be blank or 4-18 characters.';

    const pwLabel = document.createElement('label');
    pwLabel.htmlFor = 'create-room-password';
    pwLabel.innerText = 'Password for Room (optional):';
    
    const pwInput = document.createElement('input');
    pwInput.className = 'form-control';
    pwInput.id = 'create-room-password';
    pwInput.type = 'password';
    // No char restrictions; len is 0 OR 4-18
    pwInput.title = pwHelpText;
    pwInput.pattern = roompwValidation;
    pwInput.autocomplete = 'off';

    // const pwSmall = document.createElement('small');
    // pwSmall.className = 'form-small';
    // pwSmall.innerText = roomHelpText;
    
    pwContainer.appendChild(pwLabel);
    pwContainer.appendChild(pwInput);
    // pwContainer.appendChild(pwSmall);
    
    roomFieldset.appendChild(roomLegend);
    roomFieldset.appendChild(roomContainer);
    roomFieldset.appendChild(pwContainer);
    
    form.appendChild(gameFieldset);
    form.appendChild(roomFieldset);

    const submitContainer = document.createElement('div');
    submitContainer.id = 'create-room-submit-container';
    
    const submitButton = document.createElement('button');
    submitButton.className = 'btn btn-primary';
    submitButton.id = 'create-room-submit';
    submitButton.innerText = 'Create Room';

    // Button onclick behavior
    submitButton.onclick = () => {
        // `form` here is the create room form
        console.log(`Name: ${roomInput.value}\nGame: ${form.elements["game"].value}`);
        
        // Prevent sending blank messages
        if (roomInput.value.length === 0 || form.elements["game"].value === undefined) {
            console.log('Missing a value; cannot submit.')
            return;
        }

        // Using emitWithAck - Wait for server to accept request. Returns promise
        const promise = socket.emitWithAck('create_room', {'new_room_name': roomInput.value, 'game': form.elements["game"].value, 'password': pwInput.value, 'username': username, 'room': currentRoom});
                    
        promise
            .then((data) => {
                // Message received / returned, but server failed validation
                if (!data.accepted) {
                    
                    // Server may send message to client to fix something specific
                    if (data.client_msg) {
                        const serverResponse = document.createElement('div');
                        serverResponse.className = 'form-server-response';
                        serverResponse.innerText = data.client_msg;

                        // Add to room container so client will see it next to room name input
                        roomContainer.appendChild(serverResponse);
                    }
                    
                    // Log in console and exit early
                    console.log(`Error: ${data.msg}`)
                    return;
                }
                
                // Close modal on success
                console.log('Room created successfully.');
                closeModal(newRoomModal);                
            })
            .catch((error) => {
                console.error(`Could not create room: ${error}`);
            });
    };
    
    // Set `enter` to submit the form
    form.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            submitButton.click();
        };
    });

    const cancelButton = document.createElement('button');
    cancelButton.className = 'btn btn-secondary';
    cancelButton.id = 'create-room-cancel';
    cancelButton.innerText = 'Cancel';
    
    // Cancel button triggers `close` button
    cancelButton.onclick = () => {
        closeButton.click();
    }
    
    submitContainer.appendChild(submitButton);
    submitContainer.appendChild(cancelButton);
    
    // Capacity will be defaulted to the max players a game can handle
    
    form.appendChild(submitContainer);

    modalBody.appendChild(form);
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeButton);
    newRoomModal.appendChild(modalHeader);
    newRoomModal.appendChild(modalBody);

    return newRoomModal;
}

// Modal functions

function openModal(modal) {
    if (modal == null) return;
    modal.classList.add('active');
    modalOverlay.classList.add('active');
}

function closeModal(modal) {
    if (modal == null) return;
    modal.classList.remove('active');
    modalOverlay.classList.remove('active');

    // Clear all modal input values on close
    let inputs = modal.querySelectorAll('input');
    inputs.forEach(i => {
        i.value = '';
    });
}

// Socket functions / events

// Join room
function joinRoom(room, requestedName='') {
    console.log('Client join event.');
    
    // Pass name of room to server
    socket.emit('join', {'room': room, 'username': requestedName});
    
    // Server checks for game state on join and load game if game is in progress
}

// Check if user has been to room and can get username from server; also if user can join room
async function preJoin(room, roompw, reqUsername) {
    console.log('Prejoin called');
    
    try {
        // If room is lobby, can skip prejoin validations
        if (room === 'lobby') {
            console.log('Prejoin: room is lobby, can skip validation');
            return { 'can_join': true };
        }
        // Using emitWithAck for callback; Returns promise.
        const response = await socket.emitWithAck('prejoin', {'room': room, 'password': roompw, 'req_username': reqUsername});
        // console.log('Response on prejoin:');
        // for (const [key, value] of Object.entries(response)) {
        //     console.log(`${key}: ${value}`);
        // }
        return response;
    }
    catch(err) {
        throw new Error(`Error with prejoin: ${err}`);
    }
}

// Leave room - async function so it blocks join from running until room teardown
async function leaveRoom(username, room) {
    
    console.log('Requesting leave event.');

    if (currentRoom === null || currentRoom === undefined) {
        console.log('Leave room called but not in room.');
        return;
    }

    try {
        // Using await and emitWithAck - has a callback and is blocking
        const response = await socket.emitWithAck('leave', {'username': username, 'room': room});
        console.log(`Response = ${response}`);
        return response;        
    } 
    catch (err) {
        throw new Error(`Leave error: ${err}`);
    }
}

// This should only be called AFTER all join validations.
// Previous room must be left in order to join new room
    // so failing a validation on join at this point will leave user in liminal space
function leaveAndJoin(username, newRoom) {
    // Leave the current room and join selected room
    const promise = leaveRoom(username, currentRoom);
                                
    // Process leaveRoom as a promise so that teardown happens before setup
    promise
        .then(() => {
            // On successful leave, teardown will be requested by server
            console.log(`Successfully left ${currentRoom}.`);

            joinRoom(newRoom, username);

            // Close all open modals (and clear all inputs)
            const modals = document.querySelectorAll('.modal.active');
            modals.forEach(modal => {
                closeModal(modal);
            })
        })
        .catch((error) => {
            console.log(`Could not leave ${currentRoom}: ${error}`);
        });
}

// Updating lobby
socket.on('update_lobby', data => {
    // For debug:
    console.log(`Client received 'update_lobby' event: ${JSON.stringify(data)}.`);
    
    updateLobby(data);
});

// Updating room state
socket.on('update_gameroom', data => {
    // For debug:
    console.log(`Client received 'update_gameroom' event: ${JSON.stringify(data)}.`);
    
    updateGameRoom(data);
});

// Updating game state
socket.on('update_board', data => {
    // For debug:
    console.log(`Client received 'update_board' event: ${JSON.stringify(data)}.`);

    if (data.game === 'thirty_one') {
        updateThirtyOne(data);
    }
});

// Example from socket.io using socket.recovered
// socket.on("connect", () => {
//     if (socket.recovered) {
//       // any event missed during the disconnection period will be received now
//     } else {
//       // new or unrecoverable session
//     }
//   });

socket.on('connect', () => {
    console.log('Client connect event.');
    // Incorporate `socket.recovered`?
});

socket.on('disconnect', (reason) => {
    console.log(`\nClient disconnect event for reason: ${reason}.\n`);
});


// Use this for reloading the page on reconnect - should ping server to reload page? or at least fill in missing info
socket.on('reconnect', (attempt) => {
    console.log('ON RECONNECT')
    // attempt = number of attempts to reconnect
    // ...
  });

// Receiving log / chat messages
socket.on('chat_log', data => {
    addToLog(data.msg, data.sender);
});

// Receiving debug messages
socket.on('debug_msg', data => {
    console.log(`Client debug msg received: ${data.msg}`);
});
