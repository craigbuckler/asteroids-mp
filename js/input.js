/* keyboard, touch, and gamepad input */
const
  input = {},

  // key bindings: cursor/WASD, space
  key = {
    37: 'left',
    65: 'left',
    39: 'right',
    68: 'right',
    32: 'up',
    38: 'up',
    87: 'up',
    40: 'down',
    83: 'down'
  },

  // gamepad defaults
  gpDef = {};

let
  gamepad = false,      // gamepad active
  gpSensitivity = 10,   // gamepad sensitivity
  gpAxesSet = false,    // gamepad axes used
  gpButtSet = false;    // gamepad button used


// initialise input
export function inputInit() {

  // default input state
  for (let k in key) input[key[k]] = 0;

  // key press events
  window.addEventListener('keydown', keyHandler);
  window.addEventListener('keyup', keyHandler);

  // mouse events
  window.addEventListener('mousemove', mouseMoveHandler);
  window.addEventListener('mousedown', mouseButtonHandler);
  window.addEventListener('mouseup', mouseButtonHandler);

  // touch events
  document.addEventListener('touchstart', () => {

    // touch activated
    document.body.classList.add('touch');
    document.addEventListener('touchstart', touchHandler);
    document.addEventListener('touchend', touchHandler);
    document.addEventListener('touchmove', e => e.preventDefault());

  }, { once: true });

  // pointer lock
  document.addEventListener('click', () => document.documentElement.requestPointerLock() );

  // gamepad connection
  window.addEventListener('gamepadconnected', () => {

    gamepad = true;
    let gp = navigator.getGamepads()[0];
    gpDef.axes = [];
    gp.axes.forEach((v, i) => gpDef.axes[i] = Math.round(v * gpSensitivity));

  });

  window.addEventListener('gamepaddisconnected', () => gamepad = false);

  return input;

}


// gamepad input
export function inputGamepad() {

  if (!gamepad || !navigator.getGamepads || !navigator.getGamepads().length) return;

  // first axes on first gamepad
  let
    gp = navigator.getGamepads()[0],
    ax = Math.round(gp.axes[0] * gpSensitivity),
    ad = gpDef.axes[0];

  if (ax === ad) {
    if (gpAxesSet) {
      resetLeftRight();
      gpAxesSet = false;
    }
  }
  else {
    input.left = ax < ad ? 1 : 0;
    input.right = 1 - input.left;
    gpAxesSet = true;
  }

  // check all buttons
  let bt = [0,0];
  gp.buttons.forEach((b, i) => bt[i % 2] |= b.value);

  if (!bt[0] && !bt[1]) {
    if (gpButtSet) {
      resetUpDown();
      gpButtSet = false;
    }
  }
  else {
    input.up = bt[0];
    input.down = bt[1];
    gpButtSet = true;
  }

}


// keyboard handler
function keyHandler(e) {

  let k = key[e.keyCode];
  if (k) input[k] = (e.type === 'keydown' ? 1 : 0);

}


// mouse movement handler
let mouseMoveTimeout;
function mouseMoveHandler(e) {

  clearTimeout(mouseMoveTimeout);
  resetLeftRight();

  let mx = e.movementX;
  if (mx) input[mx < 0 ? 'left' : 'right'] = 1;

  mouseMoveTimeout = setTimeout(resetLeftRight, 20);

}


// mouse button handler
function mouseButtonHandler(e) {

  e.preventDefault();
  let b = e.button === 0 ? 'up' : e.button === 2 ? 'down' : null;
  if (b) input[b] = (e.type === 'mousedown' ? 1 : 0);

}


// touch handler
function touchHandler(e) {

  resetLeftRight();
  resetUpDown();
  let point = e.touches;

  for (let p = 0; p < point.length; p++) {
    let t = point[p].target.dataset.input;
    if (t) input[t] = 1;
  }

}


// reset left and right
function resetLeftRight() {
  input.left = 0;
  input.right = 0;
}


// reset up and down
function resetUpDown() {
  input.up = 0;
  input.down = 0;
}
