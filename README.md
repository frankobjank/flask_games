# Board Games via Flask

## Web App Project

The goal of this project is to create a site that hosts games. The site will not involve user accounts because everyone already has too many usernames and passwords to keep track of. Users will just be able to open the site, enter a name, and play a game. Currently the card game 31 is available, with cribbage and natac coming soon. The site can be accessed [here](blooming-falls-07859-414c2b032485.herokuapp.com/).

## Design

This project utilizes Python for the server and HTML/CSS/Javascript for the client. The JavaScript library, [socket.io](https://socket.io/), is used by the client to establish websockets that connect to the server. The server is built with Flask, and uses the [Flask-SocketIO library](https://github.com/miguelgrinberg/Flask-SocketIO) to communicate back with the client via websockets.
