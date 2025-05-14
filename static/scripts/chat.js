// Add message to chat log
function addToLog(msg, sender) {
    chatLogCount++;
    
    const msgElement = document.createElement('div');
    msgElement.className = 'chat-log-message';
    msgElement.id = 'chat-log-message-' + chatLogCount;
    
    // Add sender to msg if not a system message
    if (sender !== 'system') {
        const senderSpan = document.createElement('span');
        senderSpan.className = 'player-name chat message';
        senderSpan.id = 'sender-span-' + sender;
        // Can set color by sender !
        // senderSpan.style.color = 'blue';
        senderSpan.innerText = sender + ': ';

        msgElement.append(senderSpan);
    }

    // Debug log
    console.log(`Client received: '${msg}' from '${sender}'`);

    msgElement.innerText += msg;
    
    // Set custom attribute 'sender' for all msgs
    msgElement.setAttribute('sender', sender);
    // Could add time received to custom attribute and use that to separate if over certain time
    
    // Check sender of previous msg and add line break to beginning of msg if different sender
    if (chatLogCount > 1) {
        previousMsgId = 'chat-log-message-' + (chatLogCount - 1);
    
        if (document.querySelector('#' + previousMsgId).getAttribute('sender') !== msgElement.getAttribute('sender')) {
            const br = document.createElement('br');
            msgElement.innerHTML = br.outerHTML + msgElement.innerHTML;
        }
    }
    
    const messageArea = document.querySelector('#chat-log-messages');
    messageArea.append(msgElement);
    
    // Scroll to bottom when new msg received
    messageArea.scrollTop = messageArea.scrollHeight;
};

// Create chat log / panel
function createChatLogPanel(username) {

    const chatLogPanel = document.createElement('div');
    chatLogPanel.className = 'chat log panel';
    chatLogPanel.id = 'chat-log-panel';
    
    const chatLogContainer = document.createElement('div');
    chatLogContainer.className = 'chat log container rounded-0';
    chatLogContainer.id = 'chat-log-container';
    
    const chatLogHeader = document.createElement('h4');
    chatLogHeader.className = 'chat log header';
    chatLogHeader.id = 'chat-log-header';
    // chatLogHeader.innerText = username + ' - ' + currentRoom;
    // Need to decide what looks good in the header - just Chat for now
    chatLogHeader.innerText = 'Chat';

    const chatLogMessages = document.createElement('div');
    chatLogMessages.className = 'chat log messages';
    chatLogMessages.id = 'chat-log-messages';
    
    // input start
    const inputContainer = document.createElement('div');
    inputContainer.className = 'chat input container';
    inputContainer.id = 'chat-input-container';
    
    const usernameSpan = document.createElement('div');
    usernameSpan.className = 'chat-span input';
    usernameSpan.id = 'chat-input-username';
    // `&nbsp;` adds a space before input box
    usernameSpan.innerHTML = username + ': &nbsp;';
    
    const messageInput = document.createElement('input');
    messageInput.className = 'chat input';
    messageInput.id = 'chat-input-box';
    messageInput.type = 'text';
    messageInput.autocomplete = 'off';
    
    const paddingSpan = document.createElement('span');
    paddingSpan.className = 'chat input padding span'
    paddingSpan.id = 'chat-input-padding-span'
    paddingSpan.innerHTML = ' &nbsp;';
    
    const sendMessageButton = document.createElement('button');
    sendMessageButton.className = 'chat-button input';
    sendMessageButton.id = 'chat-input-send-button';
    sendMessageButton.innerText = '>';
    
    // Button onclick behavior
    sendMessageButton.onclick = () => {
        // Prevent sending blank messages
        if (messageInput.value.length > 0) {
            socket.send({'msg': messageInput.value, 'username': username, 'room': currentRoom});
            
            // Clear input area
            messageInput.value = '';
        };
    };

    // Set `enter` to send message
    messageInput.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.key === 'Enter') {
            sendMessageButton.click();
        };
    });
    
    inputContainer.appendChild(usernameSpan);
    inputContainer.appendChild(messageInput);
    inputContainer.appendChild(paddingSpan);
    inputContainer.appendChild(sendMessageButton);
    // input end

    // Add messages & input to container
    chatLogContainer.appendChild(chatLogHeader);
    chatLogContainer.appendChild(chatLogMessages);
    chatLogContainer.appendChild(inputContainer);

    // Add container to panel
    chatLogPanel.appendChild(chatLogContainer);

    return chatLogPanel;
};

