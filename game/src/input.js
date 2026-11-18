// Keyboard and pointer input. Held keys give a steering direction; one-shot presses (enter
// a car, punch, pause, mute, confirm) are queued as bit flags and taken once by the loop, so
// a press between two frames is never lost and never counted twice. Dragging the mouse orbits
// the camera, the wheel zooms it.

export const ACTION_ENTER = 1;
export const ACTION_PUNCH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_CONFIRM = 16;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const HELD = new Set(['KeyW', 'ArrowUp', 'KeyS', 'ArrowDown', 'KeyA', 'ArrowLeft', 'KeyD', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  const keys = new Set();
  let actions = 0;
  let orbitYaw = 0;
  let orbitPitch = 0;
  let zoom = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (HELD.has(event.code)) keys.add(event.code);
    // Space is both the handbrake while driving and a confirm on the menus.
    if (event.code === 'Space') actions |= ACTION_CONFIRM;
    else if (event.code === 'KeyE') actions |= ACTION_ENTER;
    else if (event.code === 'KeyF') actions |= ACTION_PUNCH;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (!HELD.has(event.code)) return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.clear();
    dragging = false;
  });

  target.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    target.setPointerCapture(event.pointerId);
  });
  target.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    orbitYaw -= (event.clientX - lastX) * 0.005;
    orbitPitch += (event.clientY - lastY) * 0.005;
    orbitPitch = Math.max(-0.1, Math.min(0.55, orbitPitch));
    lastX = event.clientX;
    lastY = event.clientY;
  });
  target.addEventListener('pointerup', () => {
    dragging = false;
  });
  target.addEventListener('wheel', (event) => {
    zoom += event.deltaY * 0.002;
    zoom = Math.max(-4, Math.min(8, zoom));
    event.preventDefault();
  }, { passive: false });

  function has(set) {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  }

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    steer() {
      return (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
    },
    /** 1 forward, -1 back, 0 neither. */
    throttle() {
      return (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0);
    },
    get handbrake() {
      return keys.has('Space');
    },
    get sprint() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    /** Camera orbit the drag built up since the last call, in radians. */
    takeOrbit() {
      const taken = { yaw: orbitYaw, pitch: orbitPitch, zoom };
      orbitYaw = 0;
      orbitPitch = 0;
      return taken;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
