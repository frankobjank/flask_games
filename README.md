# Board Games via Flask

## Web App Project

This project is primarily serves as a way to practice my Python and JavaScript skills. The goal is to create a site that hosts games and requires minimal setup time for the user. I wanted to avoid forcing a user to create an account because everyone already has too many passwords to keep track of. Currently the card game 31 is available, with cribbage and natac coming soon. The site can be accessed [here](blooming-falls-07859-414c2b032485.herokuapp.com/).

## Design

The client utilizes the JavaScript library, [socket.io](https://socket.io/), to use websockets to connect to the server. The server is built with Flask, and uses the [Flask-SocketIO library](https://github.com/miguelgrinberg/Flask-SocketIO) to communicate with the client.
