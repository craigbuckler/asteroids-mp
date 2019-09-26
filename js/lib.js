// library code

// event debouncing (delay passes without event reoccurring)
export function eventDebounce(element, event, callback, delay) {

  delay = delay || 300;
  let debounce;
  element.addEventListener(event, function (e) {
    if (debounce) clearInterval(debounce);
    debounce = setTimeout(function () { callback(e); }, delay);
  }, false);

}


// event throttling (will call every delay period regardless of event occurances)
export function eventThrottle(element, event, callback, delay) {

  delay = delay || 300;
  let throttle, latest;
  element.addEventListener(event, function (e) {
    if (throttle) {
      latest = e; // latest event
    }
    else {

      // prevent new events and callback
      throttle = setTimeout(function () {
        throttle = null;
        if (latest) callback(latest);
      }, delay);
      callback(e);

    }
  }, false);

}


// random integer between lo and hi
export function randomInt(lo, hi) {
  return Math.floor(random() * (hi - lo + 1)) + lo;
}


// predictable random number
const
  randomFactor = 2796203,
  randomStart = Math.round(randomFactor / 42);

export let seed = 0;
export function setSeed(v = 0) { seed = v; }

export function random() {
  seed = ((seed * 125) % randomFactor) || randomStart;
  return seed / randomFactor;
}
