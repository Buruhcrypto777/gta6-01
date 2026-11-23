// Solmar Bay — keyboard and mouse input.
// Tracks held keys, edge-triggered actions (each press is taken once) and
// mouse drag deltas for orbiting the camera. WASD/arrows move, Shift sprints,
// E enters or leaves a car, F punches, 1/2/3 pick a weapon, R changes the
// radio station, P or Escape pauses, Enter/Space confirms.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_FIRE = 16;
export const ACTION_RADIO = 32;
export const ACTION_WEAPON_1 = 64;
export const ACTION_WEAPON_2 = 128;
export const ACTION_WEAPON_3 = 256;
export const ACTION_MISSION = 512;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyE: ACTION_ENTER,
  KeyF: ACTION_PUNCH,
  KeyR: ACTION_RADIO,
  Digit1: ACTION_WEAPON_1,
  Digit2: ACTION_WEAPON_2,
  Digit3: ACTION_WEAPON_3,
  KeyM: ACTION_MISSION,
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouseDown = false;
  let dragX = 0;
  let dragY = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action !== undefined) {
      queued |= action;
      event.preventDefault();
    }
    if (event.code === 'Space') event.preventDefault();
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }
  function onMouseDown(event) {
    if (event.button === 0) {
      mouseDown = true;
      queued |= ACTION_FIRE;
    }
  }
  function onMouseUp(event) {
    if (event.button === 0) mouseDown = false;
  }
  function onMouseMove(event) {
    if (!mouseDown) return;
    dragX += event.movementX || 0;
    dragY += event.movementY || 0;
  }
  function onBlur() {
    held.clear();
    mouseDown = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('mousemove', onMouseMove);

  return {
    held,
    isDown(code) {
      return held.has(code);
    },
    /** WASD/arrows movement vector, x right, z forward, normalised. */
    moveVector() {
      let x = 0;
      let z = 0;
      if (held.has('KeyW') || held.has('ArrowUp')) z -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) z += 1;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (x !== 0 && z !== 0) {
        x *= Math.SQRT1_2;
        z *= Math.SQRT1_2;
      }
      return { x, z };
    },
    sprinting() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    takeActions() {
      const out = queued;
      queued = 0;
      return out;
    },
    takeDrag() {
      const out = { x: dragX, y: dragY };
      dragX = 0;
      dragY = 0;
      return out;
    },
  };
}
