CREATE TABLE IF NOT EXISTS "users" (
      id INTEGER PRIMARY KEY,
username TEXT COLLATE NOCASE,
  pwhash TEXT, date INTEGER
);
CREATE UNIQUE INDEX username ON users (username);
CREATE TABLE IF NOT EXISTS "rooms" (
    id INTEGER PRIMARY KEY,
     room TEXT COLLATE NOCASE,
        roompw TEXT,
          game TEXT,
  date_created INTEGER,
date_last_used INTEGER,
      capacity INTEGER,
       creator TEXT COLLATE NOCASE
);
CREATE UNIQUE INDEX room ON rooms (room);