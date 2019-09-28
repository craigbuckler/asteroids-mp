# Multi-player game plan

Game is always playing - player gets spawned and re-spawned automatically.

On pause, latest game state is retrieved?

Server can accept three types of message:

1. Broadcast to everyone (including self) (ALL)
1. Broadcast to everyone else (not including self) (OTHERS)

Other options (may not be necessary):

1. Broadcast to any one client. (ANY)
1. Broadcast to a specific client. (CLIENT)
1. Broadcast to the master. (MASTER)

One client is determined to be the master. If the master disconnects, the next active client becomes the master. The master does not necessarily know it's the master and clients could randomly become masters or be cycled.


## Game changes

1. Put rock and ship sprites in arrays so they can be referenced on all clients.
1. Ship sprite may need additional factors to ensure max bullets and other items are stored.
1. Powerups can probably remain a set since they are generated on each client when a rock is hit. When a power-up appears, it remains on-screen for all clients (two or more ships can collect it)
1. Similarly, bullets can remain a set.
1. No start/stop game.
1. WS client has send method and incoming event emitter - no other logic is necessary.

Server should retain kills vs lives lost. This can be sent to all clients when any client dies.


## WebSocket Messages

Unless specified otherwise, the server should not need to any work other than re-transmit messages accordingly.

JOIN GAME - ALL
Send name
Server will instantly send a JOINED message back with the user's ID

GET GAME STATE - MASTER
Requests a game state - all existing rocks and ships (not bullets or power-ups)

SEND GAME STATE - CLIENT
Sends a game state back so client can initialise and add ship.

INPUT - ALL
Sends ship and current input object when input changes.
All devices then update ship movement using that criteria.

HIT ROCK
Client is responsible for checking own ship's bullets against rocks
Sends rock ID and random seed. All clients remove that rock, generate others, and show powerup.

ADD ROCK
Sends random seed to all devices.

Rocks should be randomly added when the number drops below a threshold. Only the master should do this, so a client must know it's the master - or all messages from non-masters are ignored.

SHIP DEAD
Each client also checks own ship against all other ships and other bullets to monitors it's own health.

Once a ship is killed, it's ID (and the ID of the killing ship if appropriate) is sent to all others - but it will respawn elsewhere a few seconds later (and send another INPUT state)

STATS
The server can then send statistics to all clients. Kills, killed, rank? (Rank can be determined on the client).
