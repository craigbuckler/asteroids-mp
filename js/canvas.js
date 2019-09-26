// initialize canvas
import * as lib from './lib.js';

export function canvasInit(game) {

  game.canvas = document.querySelector(game.node);
  game.width = game.canvas.width;
  game.height = game.canvas.height;
  game.maxX = game.width / 2;
  game.maxY = game.width / 2;
  game.ratio = game.width / game.height;

  game.spriteSize = Math.ceil(game.width / 30);

  game.ctx = game.canvas.getContext('2d');

  // font
  game.ctx.font = `${Math.floor(game.spriteSize / 1.5)}px hyperspace`;
  game.ctx.textAlign = 'center';
  game.ctx.textBaseline = 'middle';

  // 0,0 at middle
  game.ctx.translate(game.width / 2, game.height / 2);

  // size to viewport
  canvasResize();
  lib.eventDebounce(window, 'resize', canvasResize);

  // resize canvas to viewport
  function canvasResize() {

    let b = document.body;
    game.scale = Math.min(b.clientWidth / game.width, b.clientHeight / game.height);

    game.canvas.style.width = game.width * game.scale + 'px';
    game.canvas.style.height = game.height * game.scale + 'px';

  }

  // enable fullscreen
  if (game.fullscreen && document.fullscreenEnabled) {

    game.fullscreen.classList.add('active');

    game.fullscreen.addEventListener('click', () => {

      if (!document.fullscreenElement) document.documentElement.requestFullscreen();
      else if (document.exitFullscreen) document.exitFullscreen();

    });

  }

}
