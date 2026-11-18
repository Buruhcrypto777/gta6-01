// Keyboard and mouse: held keys as a movement vector, edge-triggered actions
// (enter a car, punch, pause, confirm), and the camera orbit from mouse drag.
import { KEYS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;

/** Wire up the listeners and return the live input state. */
export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let lookDX = 0;
  let lookDY = 0;
  let wheel = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function codeIs(list, code) {
    return list.includes(code);
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === KEYS.confirm) actions |= ACTION_CONFIRM;
    if (event.code === KEYS.pause) actions |= ACTION_PAUSE;
    if (event.code === KEYS.enterCar) actions |= ACTION_ENTER_CAR;
    if (event.code === KEYS.punch) actions |= ACTION_PUNCH;
    if (event.code === KEYS.handbrake) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    lookDX += event.clientX - lastX;
    lookDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  canvas.addEventListener('wheel', (event) => {
    wheel += event.deltaY;
    event.preventDefault();
  }, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function held(list) {
    for (const code of list) if (keys.has(code)) return true;
    return false;
  }

  return {
    /** Movement for this frame: forward, strafe, steer, run, handbrake. */
    move() {
      const fwd = (held(KEYS.up) ? 1 : 0) - (held(KEYS.down) ? 1 : 0);
      const strafe = (held(KEYS.right) ? 1 : 0) - (held(KEYS.left) ? 1 : 0);
      return {
        fwd,
        strafe,
        steer: strafe,
        run: keys.has(KEYS.run),
        handbrake: keys.has(KEYS.handbrake),
      };
    },
    /** Edge-triggered actions since the last take; clears them. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Mouse orbit since the last take, in pixels; clears it. */
    takeLook() {
      const look = { dx: lookDX, dy: lookDY, wheel };
      lookDX = 0;
      lookDY = 0;
      wheel = 0;
      return look;
    },
    /** Is any movement key held (for the title screen's "press a key" hint)? */
    anyKey() {
      return keys.size > 0;
    },
  };
}
