// WebSocket client
let wsURL, socket, lost = false;

export let playerId = null;
export let input = null;

// get WebSocket URL from REST API
fetch('/api/ws')
  .then(res => res.json())
  .then(json => wsURL = json.wsURL);


// initiate WebSocket connection
function init(obj) {

  if (!wsURL || socket) return false;

  socket = new WebSocket(wsURL);

  // client registration
  socket.addEventListener('open', () => {
    input = [];
    if (obj) send(obj);
  });

  // close
  socket.addEventListener('close', () => {
    lost = true;
    input = null;
    socket = null;
  });

  // receive message
  socket.addEventListener('message', evt => wsHandler(evt.data));

}


// send WebSocket data
export function send(obj) {

  if (lost) return;

  if (socket) {
    // console.log('SEND', typeof obj === 'string' ? obj : JSON.stringify(obj));
    socket.send( typeof obj === 'string' ? obj : JSON.stringify(obj) );
  }
  else init(obj);

}


// parse incoming message
function wsHandler(msg) {

  let obj;
  try {
    obj = JSON.parse(msg);
  }
  catch (e) { console.log(e); }

  if (!obj || !obj.type || !obj.data) return;

  const
    type = obj.type.toLowerCase(),
    data = obj.data || {};

  if (type !== 'in') console.log('RECEIVE', msg);

  switch (type) {

    // player register
    case 'reg': {
      if (data) playerId = parseInt(data, 10);
      break;
    }


    // input
    case 'stateset': {
      input = data.input;
      break;
    }

    // player input
    case 'in': {
      input[data.id] = data.in;
      return;
    }

  }

  // custom event
  let event = new CustomEvent(`ws-${type}`, { detail: data });
  window.dispatchEvent(event);


}
