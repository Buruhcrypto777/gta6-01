// Solmar Bay — input: keyboard state with edge-triggered presses, mouse drag
// to orbit the camera, wheel to zoom. One frame of press memory, cleared by
// the main loop after every update.
export function createInput(canvas) {
  const keys = new Set();
  const pressedSet = new Set();
  let dragging = false, lastX = 0, lastY = 0;
  let orbitDX = 0, orbitDY = 0, wheelDelta = 0;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    pressedSet.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); });
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    orbitDX += e.clientX - lastX; orbitDY += e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
  });
  const endDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('wheel', (e) => { wheelDelta += e.deltaY; e.preventDefault(); }, { passive: false });

  return {
    key(code) { return keys.has(code); },
    pressed(code) { return pressedSet.has(code); },
    consumeOrbit() { const d = { dx: orbitDX, dy: orbitDY }; orbitDX = 0; orbitDY = 0; return d; },
    consumeWheel() { const w = wheelDelta; wheelDelta = 0; return w; },
    endFrame() { pressedSet.clear(); },
  };
}
