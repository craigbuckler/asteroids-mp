// base sprite class
import * as lib from './lib.js';

class Sprite {

  // initialise
  constructor(game) {

    // type
    this.type = 'sprite';

    // canvas
    this.ctx = game.ctx;

    // is alive?
    this.alive = true;
    this.health = null;
    this.lifespan = null;
    this.strong = null;

    // shape
    this.shape = [];

    // inner text
    this.text = '';

    // initial position
    this.x = 0;
    this.y = 0;
    this.maxX = game.maxX;
    this.maxY = game.maxY;

    // direction
    this.dir = lib.random() * Math.PI * 2;

    // sizing
    this.size = game.spriteSize;
    this.setScale = 1;

    // rotation acceleration and deceleration
    this.dirRot = 0;
    this.dirRotAcc = 0.25;
    this.dirRotMax = 0.5;
    this.dirRotDec = 0.25;

    // velocity acceleration and deceleration
    this.velX = 0;
    this.velY = 0;
    this.velAcc = 900;
    this.velMax = 1500;
    this.velDec = 120;

    // styles
    this.lineWidth = Math.ceil(this.maxX / game.scale / 150);
    this.lineColor = '#fff';
    this.lineBlur = Math.floor(this.lineWidth * 1.5);
    this.lineBlurColor = this.lineColor;
    this.fillColor = '';
    this.fillStep = 1; // 0 = no fill, 1 = fill before stroke, 2 = fill after stroke

  }

  // set relative scale
  set setScale(relative) {
    this.scale = relative;
    this.scaleFactor = this.size * this.scale;
    this.boundX = this.maxX + this.scaleFactor;
    this.boundY = this.maxY + this.scaleFactor;
    this.setCollide = 1;
  }

  // collide radius
  set setCollide(r = 1) {
    this.collide = this.scaleFactor * r;
  }

  // move sprite
  move(time, input) {

    // reduce lifespan
    if (this.lifespan) {
      this.lifespan -= 1000 / time;
      if (this.lifespan <= 0) {
        this.lifespan = 0;
        this.alive = false;
      }
    }

    // reduce invulnerability
    if (this.strong) {
      this.strong -= 1000 / time;
      if (this.strong <= 0) this.strong = 0;
    }

    // rotate
    let rot = (input ? input.right - input.left : 0);

    if (rot) {

      // increase rotation
      this.dirRot += (this.dirRotAcc / time) * rot;
      this.dirRot = Math.min(Math.max(-this.dirRotMax, this.dirRot), this.dirRotMax);

    }
    else if (this.dirRot && this.dirRotDec) {

      // decrease rotation
      let f = (this.dirRot > 0 ? -1 : 1);
      this.dirRot += (this.dirRotDec / time) * f;
      if ((f === -1 && this.dirRot < 0) || (f === 1 && this.dirRot > 0)) this.dirRot = 0;

    }

    // change direction
    this.dir += this.dirRot;

    // velocity
    if (input && input.down) {

      // increase velocity
      let v = this.velAcc / time;

      this.velX += v * Math.cos(this.dir);
      this.velX = Math.min(Math.max(-this.velMax, this.velX), this.velMax);

      this.velY += v * Math.sin(this.dir);
      this.velY = Math.min(Math.max(-this.velMax, this.velY), this.velMax);

    }

    // decrease X velocity
    if (this.velX) this.velX += (this.velDec / time) * (this.velX > 0 ? -1 : 1);

    // decrease Y velocity
    if (this.velY) this.velY += (this.velDec / time) * (this.velY > 0 ? -1 : 1);

    // change position
    this.x += this.velX / time;
    this.y += this.velY / time;

    // wrap around
    if (this.x < -this.boundX) this.x = this.boundX;
    else if (this.x > this.boundX) this.x = -this.boundX;

    if (this.y < -this.boundY) this.y = this.boundY;
    else if (this.y > this.boundY) this.y = -this.boundY;

  }

  // draw sprite
  draw(time, input) {

    // sprite is dead?
    if (!this.alive) return;

    // move
    this.move(time, input);

    let ctx = this.ctx;

    // line style
    ctx.lineWidth = this.lineWidth;
    ctx.strokeStyle = this.lineColor;
    ctx.shadowBlur = this.lineBlur;
    ctx.shadowColor = this.lineBlurColor;

    // fill colour
    if (this.fillColor) {
      ctx.fillStyle = this.strong && this.strongColor && (this.strong > 1000 || Math.round(this.strong) % 3 === 0) ? this.strongColor : this.fillColor;
      this.fillStep = this.fillStep || 1;
    }
    else this.fillStep = 0;

    // alpha
    ctx.globalAlpha = this.lifespan !== null && this.lifespan < 1000 ? this.lifespan / 1000 : 1;

    // draw
    ctx.beginPath();

    // draw points
    for (let p = 0; p < this.shape.length; p++) {

      let
        r = this.shape[p][0] * Math.PI + this.dir,
        s = this.shape[p][1] * this.scaleFactor,
        x = Math.cos(r) * s + this.x,
        y = Math.sin(r) * s + this.y;

      if (p) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);

    }

    // close and draw
    ctx.closePath();

    // fill style (first)
    if (this.fillStep === 1) ctx.fill();

    ctx.stroke();

    // fill style (last)
    if (this.fillStep === 2) ctx.fill();

    // text
    if (this.text) {
      ctx.fillStyle = this.lineColor;
      ctx.fillText(this.text, this.x, this.y);
    }

  }

  // serialise object to string
  export() {
    return {
      type: this.type,
      text: this.text,
      alive: this.alive,
      health: this.health,
      lifespan: this.livespan,
      strong: this.strong,
      size: this.size,
      scale: this.scale,
      x: this.x,
      y: this.y,
      dir: this.dir,
      dirRot: this.dirRot,
      dirRotAcc: this.dirRotAcc,
      dirRotMax: this.dirRotMax,
      dirRotDec: this.dirRotDec,
      velX: this.velX,
      velY: this.velY,
      velAcc: this.velAcc,
      velMax: this.velMax,
      velDec: this.velDec
    };

  }


  // update object from string
  import(obj) {

    for (let p in obj) this[p] = obj[p];
    this.setScale = this.scale;

  }

}


// ship
export class Ship extends Sprite {

  constructor(game) {

    super(game);
    this.type = 'ship';
    this.health = 100;

    // style
    this.lineColor = '#6f0';
    this.lineBlurColor = '#6f0';
    this.fillColor = '#131';

    // invulnerable color
    this.strongColor = '#9f9';

    // radian (pi multiples) and radius pairs
    this.shape = [
      [0, 1],
      [0.7, 0.5],
      [0.7, 1],
      [0.9, 1],
      [1, 0.8],
      [-0.9, 1],
      [-0.7, 1],
      [-0.7, 0.5]
    ];

  }

}


// bullet
export class Bullet extends Sprite {

  constructor(game, ship, distance) {

    super(game);
    this.type = 'bullet';
    this.alive = ship && ship.alive;

    // style
    this.setScale = 0.2;
    this.setCollide = 0;
    this.lineColor = '#9f9';
    this.lineBlur = 0;
    this.lineBlurColor = '';
    this.fillColor = '';

    // position and velocity
    this.dir = ship.dir;
    this.x = ship.x + Math.cos(ship.dir) * ship.scaleFactor;
    this.y = ship.y + Math.sin(ship.dir) * ship.scaleFactor;

    this.velX = Math.cos(this.dir) * 600;
    this.velY = Math.sin(this.dir) * 600;
    this.velDec = 2;
    this.lifespan = distance;

    // radian (pi multiples) and radius pairs
    this.shape = [
      [0, 1],
      [1, 1]
    ];

  }

}


// power-up
export class PowerUp extends Sprite {

  constructor(game, text, inc) {

    super(game);
    this.type = 'powerup';
    this.text = text;
    this.inc = inc;
    this.setScale = 1.75;
    this.setCollide = 0.6;
    this.lifespan = 10000;

    // style
    if (this.inc > 0) {
      this.lineColor = '#6c0';
      this.lineBlurColor = '#6c0';
    }
    else {
      this.lineColor = '#f66';
      this.lineBlurColor = '#f66';
    }
    this.lineBlur = 5;
    this.fillColor = '';

    // random position
    let
      rPos = Math.ceil((lib.random() - 0.5) * 2 * this.maxX),
      fPos = Math.random < 0.5 ? -this.boundX : this.boundX;

    if (lib.random() < 0.5) {
      this.x = rPos;
      this.y = fPos;
    }
    else {
      this.x = fPos;
      this.y = rPos;
    }

    // rotate
    this.dirRot = 0.02;
    this.dirRotDec = 0;

    // velocity acceleration and deceleration
    this.velX = (lib.random() - 0.5) * 400;
    this.velY = (lib.random() - 0.5) * 400;
    this.velDec = 0;

    // radian (pi multiples) and radius pairs
    this.shape = [];
    const sides = 7;
    for (let i = 0; i <= sides; i++) this.shape.push([4/sides * i ,1]);

  }

}


// rock
export class Rock extends Sprite {

  constructor(game) {

    super(game);
    this.type = 'rock';

    // style
    let c = lib.randomInt(8, 15).toString(16);
    c = `#${c + c + c}`;

    this.setScale = 2;
    this.lineColor = c;
    this.lineBlurColor = c;
    this.fillColor = '#222';
    this.fillStep = 1;

    // random position
    let
      rPos = Math.ceil((lib.random() - 0.5) * 2 * this.maxX),
      fPos = Math.random < 0.5 ? -this.boundX : this.boundX;

    if (lib.random() < 0.5) {
      this.x = rPos;
      this.y = fPos;
    }
    else {
      this.x = fPos;
      this.y = rPos;
    }

    // random rotation
    this.dirRot = lib.random() * 0.03;
    this.dirRotDec = 0;

    // velocity acceleration and deceleration
    this.velX = (lib.random() - 0.5) * 120;
    this.velY = (lib.random() - 0.5) * 120;
    this.velDec = 0;

    // random shape
    const sMin = 2 / (5 * this.scale), sMax = 2 - sMin;
    let sLast = 0, rLast = 1;

    while (sLast < sMax) {
      sLast += (lib.random() * sMin) + 0.2;
      rLast = (rLast === 1 ? lib.randomInt(6, 10) / 10 : 1);
      this.shape.push([sLast, rLast]);
    }

  }

}


// detect collision between two sprites (Pythagorus)
export function collision(s1, s2) {

  return ((s1.x - s2.x) ** 2) + ((s1.y - s2.y) ** 2) < ((s1.collide + s2.collide) ** 2);

}


// detect collision between two sets of sprites
export function collideSet(set1, set2, callback) {

  let col = [];

  set1.forEach(i1 => {
    set2.forEach(i2 => {
      if (collision(i1, i2)) col.push([i1, i2]);
    });
  });

  // call after collision detect to ensure newly-created sprites are not checked
  col.forEach( s => callback.apply(null, s) );

}


// detect unique collisions between two sets of sprites
// an s1 item can only collide with a single s2 item
export function collideSetUnique(set1, set2, callback) {

  let col = [], isHit;

  set1.forEach(i1 => {
    isHit = false;
    set2.forEach(i2 => {
      if (!isHit) {
        isHit = collision(i1, i2);
        if (isHit) col.push([i1, i2]);
      }
    });
  });

  // call after collision detect to ensure newly-created sprites are not checked
  col.forEach(s => callback.apply(null, s));

}


// find first colliding item
export function collideOne(item, set, callback) {

  let iter = set.entries();

  for (let i2 of iter) {
    if (collision(item, i2[1])) {
      callback(item, i2[1]);
      break;
    }
  }

}
