// Solmar Bay — renderer and chase camera. Golden hour: a warm low sun, a
// purple-to-orange sky dome, and haze fog so the far city melts into the
// sunset instead of ending in a hard line.
export function createRenderer(canvas, THREE) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf2a56b, 150, 520);

  // Sky dome: vertical gradient painted on a canvas, wrapped on a sphere.
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 256;
  const sctx = skyCanvas.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#6a4f9e');
  grad.addColorStop(0.45, '#c65f7a');
  grad.addColorStop(0.72, '#ff8f5e');
  grad.addColorStop(0.88, '#ffd9a0');
  grad.addColorStop(1, '#ffe9c4');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 4, 256);
  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(480, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  // Low sun disc, so the horizon has something to look at.
  const sun = new THREE.Mesh(
    new THREE.CircleGeometry(26, 24),
    new THREE.MeshBasicMaterial({ color: '#fff3c4', fog: false }),
  );
  sun.position.set(-330, 52, 260);
  sun.lookAt(0, 40, 0);
  scene.add(sun);

  const sunLight = new THREE.DirectionalLight(0xffd9a8, 1.7);
  sunLight.position.set(-140, 95, 130);
  scene.add(sunLight);
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x54486a, 0.9);
  scene.add(hemi);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1100);
  camera.position.set(0, 8, 20);

  const camPos = new THREE.Vector3(0, 8, 20);
  const lookAt = new THREE.Vector3(0, 1, 0);

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  return {
    renderer,
    scene,
    camera,
    resize,
    // Chase camera: behind the focus point, lower and closer on foot,
    // higher and further back in a car. `focus` carries pos (Vector3),
    // heading (radians) and inCar (bool).
    update(dt, focus) {
      const dist = focus.inCar ? 13 : 8.5;
      const height = focus.inCar ? 5.2 : 3.6;
      const fx = Math.sin(focus.heading);
      const fz = Math.cos(focus.heading);
      const wantX = focus.pos.x - fx * dist;
      const wantY = height;
      const wantZ = focus.pos.z - fz * dist;
      const k = Math.min(1, dt * 5.5);
      camPos.x += (wantX - camPos.x) * k;
      camPos.y += (wantY - camPos.y) * k;
      camPos.z += (wantZ - camPos.z) * k;
      camera.position.copy(camPos);
      lookAt.set(focus.pos.x + fx * 7, focus.inCar ? 1.6 : 1.4, focus.pos.z + fz * 7);
      camera.lookAt(lookAt);
      sky.position.copy(camPos);
      sun.position.set(camPos.x - 330, 52, camPos.z + 260);
      sun.lookAt(camPos.x, 40, camPos.z);
    },
  };
}
