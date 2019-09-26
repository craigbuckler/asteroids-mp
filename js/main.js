/* main game */
import * as lib from './lib.js';
import { canvasInit } from './canvas.js';
import { inputInit, inputGamepad } from './input.js';
import * as sound from './sound.js';
import * as sprite from './sprite.js';
import * as ws from './wsclient.js';

const game = {
  active: false,
  node: '#game',
  start: '#start',
  connect: '#connect',
  namefield: '#name',
  health: '#health',
  score: '#score span',
  fullscreen: '#fullscreen',
  points: 0,
  fps: '#fps span',
  hiscore: '#hiscore',
  hipoints: parseInt(localStorage.getItem('hipoints') || 0, 10),
  powers: ['shots', 'shield', 'speed', 'size', 'strong', 'spread'],
  powerChanceMin: 0.5,
  rocksMax: 6
};

let
  rAF,        // requestAnimationFrame object
  fireStart;  // fire to start interval


// service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js', { scope: './'})
    .then(() => {})
    .catch(() => {});
}


// initialise
window.addEventListener('DOMContentLoaded', () => {

  // connect
  game.connect = document.querySelector(game.connect);
  game.namefield = document.querySelector(game.namefield);

  // start
  game.start = document.querySelector(game.start);
  //game.start.addEventListener('click', gameNew);

  // health
  game.health = document.querySelector(game.health);

  // scores
  game.score = document.querySelector(game.score);
  game.hiscore = document.querySelector(game.hiscore);

  // FPS counter
  game.fps = document.querySelector(game.fps);

  // full screen
  game.fullscreen = document.querySelector(game.fullscreen);

  // canvas
  canvasInit(game);

  // game input
  game.input = inputInit();
  sound.init();

  // tab active handler
  document.addEventListener('visibilitychange', gameActive, false);

  // state request handlers
  window.addEventListener('ws-statereq', gameStateRequest);
  window.addEventListener('ws-stateset', gameStateSet);
  window.addEventListener('ws-joined', gameJoined);

  // enter name
  enterName();

});


// enter name
function enterName() {

  game.connect.classList.add('active');
  game.namefield.addEventListener('change', () => {

    game.name = game.namefield.value.trim().toUpperCase() || '?';
    game.connect.classList.remove('active');

    // start network communications and send name
    ws.send({ type: 'name', data: { name: game.name } });

    // fire to start
    gameOver();

  }, { once: true });

}


// show game over
function gameOver() {

  // update highscore
  if (game.points > game.hipoints) {
    game.hipoints = game.points;
    localStorage.setItem('hipoints', game.hipoints);
  }

  game.hiscore.textContent = game.hipoints;
  game.start.classList.add('active');

  // press fire to start
  fireStart = setInterval(() => {
    inputGamepad();
    if (game.input.up) gameNew();
  }, 300);

}


// start new game
function gameNew() {

  clearInterval(fireStart);
  game.start.classList.remove('active');

  ws.send(JSON.stringify({ type: 'start' }));

  game.level = 1;
  game.powerChance = 1;

  updatePoints();
  defineSprites();
  gameActive();

}

// respond to game state request
function gameStateRequest(event) {

  let data = {
    id: event.detail,
    seed: lib.seed,
    level: game.level,
    powerChance: game.powerChance,
    input: ws.input,
    rock: [],
    userShip: []
  };

  game.rock.forEach(rock => data.rock.push(rock.export()));
  game.userShip.forEach(ship => data.userShip.push(ship.export()));

  ws.send(JSON.stringify({ type: 'stateres', data }));

}


// set game state from response
function gameStateSet(event) {

  let data = event.detail;

  lib.setSeed(data.seed);
  game.level = data.level;
  game.powerChance = data.powerChance;

  game.rock = new Set();
  data.rock.forEach(init => {
    let rock = new sprite.Rock(game);
    rock.import(init);
    game.rock.add(rock);
  });

  game.userShip = [];
  data.userShip.forEach(init => {
    let ship = createShip();
    ship.import(init);
    game.userShip.push(ship);
  });

  createPlayer();

}


//pause/resume on tab visibility
function gameActive() {
  if (rAF) cancelAnimationFrame(rAF);
  game.active = (document.visibilityState === 'visible');
  if (game.active && game.level) main();
}


// update points
function updatePoints(p) {

  if (p) game.points += p;
  else game.points = 0;

  game.score.textContent = game.points;

}


// update shield
function updateShield(ship, s) {

  if (!ship.health) return;

  ship.health = Math.min(100, ship.health + s);

  if (ship.health <= 0) {
    ship.health = 0;
    ship.lifespan = 300;
    explode(ship);
    gameOver();
  }

  game.health.value = ship.health;

}


// define initial sprites
function defineSprites() {

  // random rocks
  game.rock = new Set();
  createRocks();

  // explosions
  game.explode = new Set();

  // power ups
  game.powerUp = new Set();

  // create player's ship
  game.userShip = [];
  if (!ws.playerId) createPlayer();

}


// create rocks
function createRocks(count) {

  count = count || Math.min(game.level, game.rocksMax);

  while (count > 0) {
    game.rock.add(new sprite.Rock(game));
    count--;
  }

}


// create player's ship
function createPlayer() {

  game.userIdx = ws.playerId || 0;
  game.userShip[game.userIdx] = createShip();
  game.userShip[game.userIdx].player = true;
  game.userShip[game.userIdx].strong = 5000;

  game.health.value = game.userShip[game.userIdx].health;

  ws.send(JSON.stringify({ type: 'join', data: game.userShip[game.userIdx].export() }));

}


// player joined
function gameJoined(event) {

  if (!game.userShip) return;

  let
    data = event.detail,
    sId = data.id;

  game.userShip[sId] = createShip('#f60', '#f60', '#311');
  game.userShip[sId].import(data.ship);

}

// create a new ship
function createShip(line = '#6f0', blur = '#6f0', fill = '#131') {

  let ship = new sprite.Ship(game);

  // bullet set
  ship.bullet = new Set();
  ship.bulletMax = 1;
  ship.bulletDist = 800;
  ship.bulletFire = false;

  ship.lineColor = line;
  ship.lineBlurColor = blur;
  ship.fillColor = fill;

  return ship;

}


// shoot bullet
function shoot(ship, input) {

  if (!ship || !ship.alive || ship.bullet.size >= ship.bulletMax || (ship.bulletFire && input.up)) return;

  ship.bulletFire = !!input.up;
  if (ship.bulletFire) {
    sound.play('shoot');
    ship.bullet.add( new sprite.Bullet(game, ship, ship.bulletDist) );
  }

}


// game loop
function main() {

  const fpsRecMax = 100;
  let lastInput, last = 0, fpsPrev = 0, fpsTot = 0, fpsRec = fpsRecMax;

  rAF = requestAnimationFrame(loop);

  // main game look
  function loop(timer) {

    let time = timer - (last || timer);
    last = timer;

    if (time) {

      let fps = 1000 / time;

      // FPS calculation
      fpsTot += fps;
      fpsRec--;
      if (fpsRec <= 0) {

        let fpsNow = Math.round(fpsTot / fpsRecMax);
        fpsTot = 0;
        fpsRec = fpsRecMax;

        if (fpsNow && fpsNow !== fpsPrev) {
          fpsPrev = fpsNow;
          game.fps.textContent = fpsPrev;
        }
      }

      // gamepad input
      inputGamepad();

      // remote input
      if (ws.input) {

        let input = JSON.stringify({ type: 'in', data: game.input });
        if (input !== lastInput) ws.send(input);

        lastInput = input;

      }

      // clear canvas
      game.ctx.clearRect(-game.maxX, -game.maxY, game.width, game.height);

      // draw rocks
      drawAll(game.rock, fps);

      // draw power-ups
      drawAll(game.powerUp, fps);

      game.userShip.forEach((ship, i) => {

        // draw ships
        let input = (ws.input && ws.input[i]) || (i === game.userIdx && game.input);
        ship.draw(fps, input);

        // draw bullets
        shoot(ship, input);
        drawAll(ship.bullet, fps);

        // detect bullet/rock collision
        sprite.collideSetUnique(ship.bullet, game.rock, (bullet, rock) => bulletRock(ship, bullet, rock));

        if (ship.alive) {

          // detect user ship/powerup collision
          sprite.collideOne(ship, game.powerUp, shipPowerUp);

          // detect user ship/rock collision
          sprite.collideOne(ship, game.rock, shipRock);

        }

      });

      // draw explosions
      drawAll(game.explode, fps);

    }

    // next frame
    rAF = requestAnimationFrame(loop);

  }

}


// draw all items in a set
function drawAll(set, time) {

  set.forEach(item => {
    item.draw(time);
    if (!item.alive) set.delete(item);
  });

}


// bullet hits a rock
function bulletRock(ship, bullet, rock) {

  if (ship.player) updatePoints(10 / rock.scale);
  ship.bullet.delete(bullet);
  splitRock(rock);

}


// user's ship hits a powerup
function shipPowerUp(ship, powerup) {

  let inc = powerup.inc;

  if (inc) sound.play(inc > 0 ? 'powerup' : 'powerdown');

  switch (powerup.text) {

    case 'shield':
      updateShield(ship, 50 * inc);
      break;

    case 'shots':
      ship.bulletMax = Math.min(Math.max(1, ship.bulletMax + inc), 5);
      break;

    case 'spread':
      ship.bulletDist = Math.min(Math.max(500, ship.bulletDist + (inc * 100)), 1500);
      break;

    case 'speed':
      ship.dirRotAcc += inc * 0.1;
      ship.dirRotMax += inc * 0.2;
      ship.dirRotDec += inc * 0.1;
      ship.velAcc += inc * 120;
      ship.velMax += inc * 120;
      ship.velDec += inc * 60;
      break;

    case 'size':
      ship.setScale = Math.min(Math.max(0.5, ship.scale - (inc * 0.15)), 2);
      break;

    case 'strong':
      ship.strong = 8000;
      break;

  }

  powerup.lifespan = 100;
  powerup.inc = 0;

}


// user's ship hits a rock
function shipRock(ship, rock) {

  if (!ship.strong) updateShield(ship, -rock.size);

  ship.velX += rock.velX * rock.scale;
  ship.velY += rock.velY * rock.scale;

  splitRock(rock);

}


// split a rock
function splitRock(rock) {

  // create new rocks
  if (rock.scale > 0.5) {

    let
      rockNew = lib.randomInt(2,3),
      scale = rock.scale / rockNew;

    do {

      let r = new sprite.Rock(game);

      r.setScale = scale;
      r.setCollide = 1;
      r.x = rock.x;
      r.y = rock.y;

      r.velX = (lib.random() - 0.5) * (150 / scale);
      r.velY = (lib.random() - 0.5) * (150 / scale);

      game.rock.add(r);

      rockNew--;

    } while (rockNew);

    // add power-up
    addPowerUp(rock);

  }

  // remove rock
  game.rock.delete(rock);
  sound.play('explode');

  // any rocks left?
  if (!game.rock.size) {

    game.userShip.forEach(ship => {
      updateShield(ship, 50);
      ship.strong = 5000;
      if (ship.player) updatePoints(game.level * 100);
    });

    game.level++;
    createRocks();
  }

}


// random new power-up
function addPowerUp(item) {

  // no power-up if two active or random chance
  if (game.powerUp.size > 1 || lib.random() > game.powerChance) {
    game.powerChance += 0.1; // increase chance of new power-up
    return;
  }

  // reset power-up chance
  game.powerChance = game.powerChanceMin;

  let pu = new sprite.PowerUp(game, game.powers[lib.randomInt(0, Math.min(game.level - 1, game.powers.length - 1))], (game.level < 3 || lib.random() > 0.1 ? 1 : -1));

  // invulnerable always increments
  if (pu.text === 'strong') pu.inc = 1;

  // inherit location
  if (item) {
    pu.x = item.x;
    pu.y = item.y;
  }

  game.powerUp.add(pu);

}


// explode a sprite
function explode(item, count = 6) {

  do {

    let r = new sprite.Rock(game);
    r.setScale = 0.2;
    r.lifespan = 3000;

    r.x = item.x;
    r.y = item.y;

    r.lineColor = item.lineColor;
    r.lineBlurColor = item.lineBlurColor;
    r.fillColor = item.fillColor;

    r.velX = (lib.random() - 0.5) * lib.random() * 500;
    r.velY = (lib.random() - 0.5) * lib.random() * 500;

    game.explode.add(r);

    count--;

  } while (count);

  sound.play('explode');

}
