# Minesweeper via flask

## Video Demo

[Jacob Frank - CS50 Final Project Video](https://youtu.be/68rjMMaCvhI)

## Links to project

[My Minesweeper](https://frankobjank.pythonanywhere.com/)

[Source code on Github](https://github.com/frankobjank/cs50_final_project)

## Description

My goal for this project was to expand the `Homepage` project from Week 8 into a fully-fledged web app. I have made a couple of games in Python prior to enrolling in cs50 and I want to be able to port those games to the web and make them accessible from my homepage.

My first goal of the project was to implement Minesweeper. I re-wrote my existing Python code to work with flask as the backend. Then I created a new frontend using html, javascript, and css. While I had planned at first to implement multiple games, I ended up sticking with Minesweeper for the scope of this project as that gave me quite a bit of a challenge already.

I probably could have implemented the game logic almost entirely in Javascript, but I wanted to keep the layout of the mines on the server so that someone would not be able to cheat by seeing where the mines are located via developer tools. The game board is created on the server, and information is provided to the client on a need-to-know basis. I used AJAX to send user input to the server without refreshing the page. The user input is the square the user has selected. The server responds with information on which squares to make visible, the numbers on the visible squares, and whether or not the game is over. The client handles rendering the board and placing flags. I realized the server has no need to know where flags are since the goal of the game is simply to reveal all non-mine squares. Therefore flags are entirely handled on the client side.

In order to add a SQL element to the project, I decided to track players' stats, such as their fastest time, average time, the number of games they win or lose, and their win rate. I implemented ways for a user to register, login, and change passwords with some help from the Week 9 Finance project. I wanted to figure out a solution for using SQL without the SQL module from the cs50 library, so I used the native Python library sqlite3. The syntax was slightly different from the cs50 library but it got the job done.

## List of files included in the project directory

* [app.py](app.py) - The main flask file containing all the functions that route the user to each page. When processing the SQL query to get a user's stats, it only counts games that lasted for more than 0 seconds so it won't count the times a user clicks on a mine on the first turn.
* [database.db](database.db) - SQLite database containing 2 tables: `users` and `ms_stats`. The `users` table was adapted from the Week 9 Finance project with one addition. I set the `username` column to `COLLATE NOCASE` so that usernames would not have to be typed in the exact case that was used when they were created. The `ms_stats` table contains a foreign key (the user id) and the total time it took a user to complete a game, whether the game was won or lost, the date and time the game was finished, and what difficulty the game was set to.
* [helpers.py](helpers.py) - contains helper functions used to format things for `app.py`; all functions that did not have a corresponding route decoration.
* [minesweeper_game.py](minesweeper_game.py) - contains the logic for creating a minesweeper board. It randomly designates a number of mines corresponding with the difficulty level requested by the user. When a square is selected by the user, it recursively uncovers blank squares up until it hits squares with numbers. The list of revealed squares then gets passed back to the client via the minesweeper function in `app.py`. It ends the game if the user hits a mine or reveals all non-mine squares.
  * I put a timer on both the client and the server. I wanted to use the time shown in the client to be the time stored in the database because that is the time that the user sees. However, to be consistent with my choice to keep the placement of the mines solely on the server, I wanted to make sure the time could not be tampered with by the client. I decided to keep a score on the server side and compare the two scores at the end of the game to make sure it was reasonably accurate (a margin of error of 20% or less).
* [requirements.txt](requirements.txt) - flask and flasksession requirements for running the flask app.

## [Static](/static/)

* [favicon.png](static/favicon.png) - While I was testing, the webpage kept failing to load the favicon. Finally I looked up what that is and added an icon (my github profile picture).
* [minesweeper_screenshot.png](static/minesweeper_screenshot.png) - This is the screenshot shown on the homepage to give the user a preview of what the game will look like.
* [minesweeper.js](static/minesweeper.js) - This file contains everything needed for rendering the actual minesweeper game. It uses a double `for` loop to create a `grid` with the number of rows and columns received by the server depending on the difficulty. It also creates the panel on the top of the board containing the number of mines remaining and a timer. All the squares on the board are buttons that are assigned an index.
  * There's an AJAX request that gets sent every time a new square is clicked in order to get information from the server without reloading the page.

## [Templates](/templates/)

* [apology.html](/templates/apology.html), [change_password.html](/templates/change_password.html), [login.html](/templates/login.html), [register.html](/templates/register.html) - these were all adapted from the Week 9 Finance project. I needed the concept of user accounts to be able to track users' scores and calculate stats for the SQL portion of the project.
* [index.html](/templates/index.html) - This is the homepage of the site. It displays all the games that are on the site. There is currently only Minesweeper but I plan to add more in the future.
* [layout.html](/templates/layout.html) - This creates a template for all the pages on the site. It includes the header areas that allow users to navigate the site, and the footer that has my Github name and link.
* [minesweeper_stats.html](/templates/minesweeper_stats.html) - If logged in, this will display the user's Minesweeper stats. It breaks up the stats by difficulty.
* [minesweeper.html](/templates/minesweeper.html) - This is the page the javascript file fills in to render the Minesweeper game. Apart from that it has options to change the difficulty of the game by allowing users to choose between easy, medium, and hard. It also contains a link to view the user's stats.
