// Solmar Bay — keyboard and mouse input.
// Keys are held in a set for steering; one-shot actions queue as a bitmask
// that the loop consumes once, so a single keypress never fires twice.
import { ACTIONS } from './config.js';

const KEYMAP = {
  Space: ACTIONS.CONFIRM,
  Enter: ACTIONS.CONFIRM,
  Escape: ACTIONS.PAUSE,
  KeyP: ACTIONS.PAUSE,
  KeyE: ACTIONS.ENTER,
  KeyF: ACTIONS.PUNCH,
  Digit1: ACTIONS.WEAPON1,
  Digit2: ACTIONS.WEAPON2,
  KeyR: ACTIONS.RADIO,
  KeyT: ACTIONS.TAXI,
};

export function createInput() {
  const down = new Set();
  const queued = new Set();
  let clickQueued = false;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    down.add(e.code);
    if (KEYMAP[e.code]) queued.add(KEYMAP[e.code]);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => down.delete(e.code));
  window.addEventListener('blur', () => down.clear());
  window.addEventListener('mousedown', (e) => {
    if (e.button === 0) clickQueued = true;
  });

  return {
    isDown: (code) => down.has(code),
    axis() {
      const f = (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0)
        - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0);
      const s = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0)
        - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0);
      return { f, s };
    },
    takeActions() {
      let bits = 0;
      for (const b of queued) bits |= b;
      queued.clear();
      return bits;
    },
    takeClick() {
      const c = clickQueued;
      clickQueued = false;
      return c;
    },
  };
}
