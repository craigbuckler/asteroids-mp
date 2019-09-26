'use strict';

const
  DEBUG = true,
  cfg = require('./package.json'),
  httpPort = cfg.game.webserverport,
  wsPort = cfg.game.websocketport;


// web server
const
  http = require('http'),
  url = require('url'),
  path = require('path'),
  fs = require('fs'),
  folder = process.argv[2] || './',
  root = path.isAbsolute(folder) ? path.join(folder) : path.join(process.cwd(), folder),
  mime = {
    '.html': ['text/html', 86400],
    '.htm': ['text/html', 86400],
    '.css': ['text/css', 86400],
    '.js': ['application/javascript', 86400],
    '.json': ['application/json', 0],
    '.jpg': ['image/jpeg', 0],
    '.jpeg': ['image/jpeg', 0],
    '.png': ['image/png', 0],
    '.gif': ['image/gif', 0],
    '.ico': ['image/x-icon', 0],
    '.svg': ['image/svg+xml', 0],
    '.txt': ['text/plain', 86400],
    'err': ['text/plain', 30]
  };

let host = '';

// unable to read root folder
if (!fs.existsSync(root)) {
  console.log(`ERROR: root folder ${root} does not exist`);
  process.exit(1);
}

// new server
http.createServer((req, res) => {

  // find current host
  if (!host) {
    host = req.headers && req.headers.host;
    if (host) host = host.replace(/:\d+$/, ''); // remove port
  }

  let
    uri = url.parse(req.url).pathname,
    filename = path.join(root, uri);

  // web service request
  if (uri === '/api/ws') {
    serve(200, `{"wsURL":"ws://${host}:${wsPort}"}`, '.json');
    return;
  }

  // file available?
  fs.access(filename, fs.constants.R_OK, (err) => {

    // not found
    if (err) {
      serve(404, '404 Not Found\n');
      return;
    }

    // index.html default
    if (fs.statSync(filename).isDirectory()) filename += '/index.html';

    // read file
    fs.readFile(filename, (err, file) => {

      if (err) {
        // error reading
        serve(500, err + '\n');
      }
      else {
        // return file
        serve(200, file, path.extname(filename));
      }

    });
  });

  // serve content
  function serve(code, content, type) {

    let head = mime[type] || mime['err'];

    res.writeHead(code, {
      'Content-Type': head[0],
      'Cache-Control': 'must-revalidate, max-age=' + (head[1] || 2419200),
      'Content-Length': Buffer.byteLength(content)
    });
    res.write(content);
    res.end();

  }

}).listen(httpPort);

console.log(`Web server port: ${httpPort}`);


// ________________________________________________________
// web socket server
const
  WebSocket = require('ws'),
  server = new WebSocket.Server({ port: wsPort }),
  universe = [],
  maxPerUniverse = 5;

console.log(`WebSocket port : ${wsPort}\n`);

// client connected
server.on('connection', (socket, req) => {

  // create player
  let { universeId, playerId } = createPlayer(socket, req);

  // return user ID
  socket.send(JSON.stringify({ type: 'reg', data: String(playerId) }));

  // announce connection
  socket.on('message', msg => wsHandler(socket, universeId, playerId, msg));

  // closed
  socket.on('close', () => removePlayer(universeId, playerId));

});


// parse incoming message
function wsHandler(socket, universeId, playerId, msg) {

  let obj;
  try {
    obj = JSON.parse(msg);
  }
  catch (e) {
    if (DEBUG) console.log(`universe ${universeId}, player ${playerId}: INVALID JSON ${msg}, ${e}`);
  }

  if (!obj || !obj.type) return;

  const
    type = obj.type.toLowerCase(),
    data = obj.data || {},
    player = universe[universeId].player[playerId];

  if (DEBUG && type !== 'in') console.log(`universe ${universeId}, player ${playerId}: ${msg}`);

  switch (type) {

    // player name
    case 'name': {
      if (data.name) {
        player.name = data.name.slice(0,8).toUpperCase();
        if (DEBUG) console.log(`universe ${universeId}, player ${playerId}, name: ${player.name}`);
      }
      break;
    }

    // player movement
    case 'in': {
      broadcast(universeId, { type: 'in', data: { id: playerId, in: data } });
      break;
    }

    // game started - send state request
    case 'start': {
      let active = universe[universeId].player.find(p => p.playing);
      if (active) active.socket.send(JSON.stringify({ type: 'statereq', data: playerId }));
      else player.playing = true;
      break;
    }

    // game state response
    case 'stateres': {
      if (universe[universeId].player[data.id]) {
        universe[universeId].player[data.id].socket.send(JSON.stringify({ type: 'stateset', data }));
        universe[universeId].player[data.id].playing = true;
      }
      break;
    }

    // user joins game
    case 'join': {
      broadcast(universeId, { type: 'joined', data: { id: playerId, ship: data } }, playerId);
      break;
    }

  }

}


// broadcast message to all clients
// set playerId to ignore active player
function broadcast(universeId, msg, playerId) {

  msg = (typeof msg === 'string' ? msg : JSON.stringify(msg));

  universe[universeId].player.forEach((player, idx) => {
    if (idx !== playerId && player && player.socket.readyState === WebSocket.OPEN) player.socket.send(msg);
  });

}


// create new player
function createPlayer(socket, req) {

  // find/create new universe
  let r = playerUniverse();
  universe[r] = universe[r] || { active: 0, player: [] };

  // add player
  let
    pN = universe[r].player.length,
    newPlayer = {
      id: pN,
      universeId: r,
      name: `ship${pN + 1}`,
      socket: socket,
      host: req.headers.host,
      ip: req.connection.remoteAddress,
      playing: false
    };

  universe[r].player.push(newPlayer);
  universe[r].active++;

  if (DEBUG) console.log(`universe ${r}: player ${pN} joined, ${universe[r].active} players active`);

  return { universeId: newPlayer.universeId, playerId: newPlayer.id };

}


// remove player
function removePlayer(universeId, playerId) {

  // remove user
  universe[universeId].player[playerId] = null;
  universe[universeId].active--;

  if (DEBUG) console.log(`universe ${universeId}: player ${playerId} left, ${universe[universeId].active} players active`);

  if (!universe[universeId].active) {

    // no players remain?
    universe[universeId] = null;

  }
  else {

    // TODO: broadcast to other players

  }

}


// find appropriate universe
function playerUniverse() {

  let firstZero = -1, firstActive = -1;

  universe
    .map((r, i) => { return { idx: i, players: (r && r.active) || 0 }; })
    .filter(r => r.players < maxPerUniverse)
    .forEach(r => {

      if (firstZero < 0 && r.players === 0) firstZero = r.idx;
      if (firstActive < 0 && r.players > 0) firstActive = r.idx;

    });

  return (firstActive >= 0 ? firstActive : firstZero >= 0 ? firstZero : universe.length);

}
