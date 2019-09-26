/* sound effect handler */
const
  sound = {},
  effect = ['shoot', 'explode', 'powerup', 'powerdown'];


// initialise sounds
export function init() {

  effect.forEach(s => {

    // sound object
    sound[s] = {
      audio: new Audio(`audio/${s}.mp3`),
      loaded: true
    };

    // load effect
    sound[s].audio.onerror = () => sound[s].audio.loaded = false;

  });

}


// play audio
export function play(name, volume = 1) {

  const effect = sound[name];
  if (!effect || !effect.audio || !effect.loaded || effect.audio.muted) return;

  if (effect.audio.currentTime) effect.audio.currentTime = 0;
  effect.audio.volume = volume;
  effect.audio.play();

}
