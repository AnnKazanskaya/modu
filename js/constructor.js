// ============================================================
//  modu — 3D-конструктор дивана
//  Фотореалистичная подача: физические материалы ткани (PBR),
//  студийное освещение от окружения (IBL), мягкие тени,
//  чистые края и деликатное свечение (post-processing).
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- Параметры дивана ----------
const state = {
  colorIndex: 1,
  material: 'boucle',
  modules: 3,
  pillows: 3,
  arms: 'both',
  daybed: false,
  legType: 'floor',
  legHeight: 7,
  length: 300,
  depth: 100,
  backHeight: 72,
};

const COLORS = [
  { name: 'крем',       hex: '#EAE3D6' },
  { name: 'песок',      hex: '#D8C7AC' },
  { name: 'овёс',       hex: '#C9B79B' },
  { name: 'глина',      hex: '#B79A7B' },
  { name: 'тауп',       hex: '#9D8A77' },
  { name: 'мокко',      hex: '#7E6B58' },
  { name: 'шалфей',     hex: '#A7AA98' },
  { name: 'туман',      hex: '#B9BBB5' },
  { name: 'камень',     hex: '#9FA0A0' },
  { name: 'графит',     hex: '#4A4A48' },
  { name: 'терракота',  hex: '#B07A5E' },
  { name: 'сумерки',    hex: '#6E6A78' },
];

// физические параметры тканей: шероховатость, блик ворса (sheen),
// сила рельефа нормалей, повтор текстуры, исходная карта рельефа
const MATERIALS = {
  boucle: { roughness: 0.95, sheen: 0.35, sheenRough: 0.9,  normal: 0.85, rep: 7,  tex: 'boucle' },
  linen:  { roughness: 0.88, sheen: 0.20, sheenRough: 0.95, normal: 0.6,  rep: 11, tex: 'linen'  },
  velvet: { roughness: 0.62, sheen: 1.0,  sheenRough: 0.35, normal: 0.3,  rep: 6,  tex: 'boucle' },
};

// ---------- Рендерер ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

// студийное освещение от окружения (image-based lighting):
// даёт мягкий реалистичный свет и деликатные блики на ткани/ножках
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(4.0, 2.4, 5.6);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0.55, 0);

// ---------- Свет ----------
// общий мягкий свет уже идёт от окружения; добавляем тёплый ключевой
// источник (он рисует мягкую тень) и холодную подсветку с другой стороны
const hemi = new THREE.HemisphereLight(0xfff4e6, 0xb9a584, 0.18);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff2e0, 2.4);   // основной свет + источник тени
key.position.set(4.5, 7.5, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -5; key.shadow.camera.right = 5;
key.shadow.camera.top = 5; key.shadow.camera.bottom = -5;
key.shadow.camera.near = 0.5; key.shadow.camera.far = 25;
key.shadow.bias = -0.0004;
key.shadow.radius = 10;
key.shadow.blurSamples = 24;
scene.add(key);

const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);  // холодная подсветка теней
fill.position.set(-5, 3, -2);
scene.add(fill);

// ---------- Пост-обработка ----------
// чистые края (SMAA) + деликатное свечение бликов (bloom) → дорогая картинка
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.14, 0.6, 0.82);
composer.addPass(bloom);
composer.addPass(new SMAAPass(1, 1));
composer.addPass(new OutputPass());

// ---------- Пол ----------
const floorMat = new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.96, metalness: 0, envMapIntensity: 0.6 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// ---------- Текстуры ткани (процедурные карты нормалей + шероховатости) ----------
function newCanvas(s) { const c = document.createElement('canvas'); c.width = c.height = s; return c; }

// карта высот → её превратим в карту нормалей
function boucleHeight() {                   // плотный «барашек»
  const s = 512, c = newCanvas(s), x = c.getContext('2d');
  x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 34000; i++) {
    const px = Math.random() * s, py = Math.random() * s, r = Math.random() * 4 + 2;
    const h = 130 + Math.random() * 125;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${h},${h},${h},1)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, 7); x.fill();
  }
  return c;
}
function linenHeight() {                    // переплетение нитей
  const s = 512, c = newCanvas(s), x = c.getContext('2d');
  x.fillStyle = '#404040'; x.fillRect(0, 0, s, s);
  const step = 7;
  for (let y = 0; y < s; y += step) for (let xx = 0; xx < s; xx += step) {
    const a = ((xx / step + y / step) % 2 === 0);
    const g = x.createRadialGradient(xx + step/2, y + step/2, 0, xx + step/2, y + step/2, step);
    const h = a ? 230 : 120;
    g.addColorStop(0, `rgba(${h},${h},${h},0.9)`); g.addColorStop(1, 'rgba(40,40,40,0)');
    x.fillStyle = g;
    x.fillRect(xx, y, step, step);
  }
  return c;
}

// карта высот → карта нормалей (по Собелю)
function heightToNormal(hc, strength) {
  const s = hc.width, src = hc.getContext('2d').getImageData(0, 0, s, s).data;
  const out = newCanvas(s), octx = out.getContext('2d'), img = octx.createImageData(s, s), d = img.data;
  const H = (x, y) => { x = (x + s) % s; y = (y + s) % s; return src[(y * s + x) * 4] / 255; };
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (H(x - 1, y) - H(x + 1, y)) * strength;
    const dy = (H(x, y - 1) - H(x, y + 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    const i = (y * s + x) * 4;
    d[i]   = ((dx / len) * 0.5 + 0.5) * 255;
    d[i+1] = ((dy / len) * 0.5 + 0.5) * 255;
    d[i+2] = ((1  / len) * 0.5 + 0.5) * 255;
    d[i+3] = 255;
  }
  octx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

const TEX = {
  boucle: heightToNormal(boucleHeight(), 5),
  linen:  heightToNormal(linenHeight(), 3.5),
};

let currentFabric = null;
function fabricMaterial() {
  const m = MATERIALS[state.material];
  const nrm = TEX[m.tex];
  nrm.repeat.set(m.rep, m.rep);
  if (currentFabric) currentFabric.dispose();
  currentFabric = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(COLORS[state.colorIndex].hex),
    roughness: m.roughness,
    metalness: 0,
    normalMap: nrm,
    normalScale: new THREE.Vector2(m.normal, m.normal),   // рельеф плетения ткани
    sheen: m.sheen,                                        // блик ворса (особенно велюр)
    sheenRoughness: m.sheenRough,
    sheenColor: new THREE.Color(0xffffff),
    envMapIntensity: 0.85,
  });
  return currentFabric;
}
const legMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3526, roughness: 0.4, metalness: 0.15, envMapIntensity: 1.0 });

// ---------- Контактная тень (мягкое пятно под диваном) ----------
function blobTexture() {
  const s = 256, c = newCanvas(s), x = c.getContext('2d');
  const g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0, 'rgba(60,42,20,0.55)');
  g.addColorStop(0.55, 'rgba(60,42,20,0.28)');
  g.addColorStop(1, 'rgba(60,42,20,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false });
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMat);
blob.rotation.x = -Math.PI / 2;
blob.position.y = 0.004;
scene.add(blob);

// ---------- Геометрия-помощник (плавные скругления) ----------
function rbox(w, h, d, radius = 0.09) {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.001);
  return new RoundedBoxGeometry(w, h, d, 6, Math.max(0.01, r));
}

// ---------- Построение дивана ----------
const sofa = new THREE.Group();
scene.add(sofa);
let dims = {};

function buildSofa() {
  while (sofa.children.length) { const o = sofa.children.pop(); o.geometry?.dispose?.(); }

  const fabric = fabricMaterial();
  const W = state.length / 100;
  const D = state.depth / 100;
  const backTop = state.backHeight / 100;
  const legH = state.legType === 'floor' ? 0 : state.legHeight / 100;
  const baseH = 0.20, seatThk = 0.24, backThk = 0.26, armW = 0.26;
  const baseTopY = legH + baseH;
  const seatTopY = baseTopY + seatThk;
  const armTopY = baseTopY + (backTop - baseTopY) * 0.55;

  const addMesh = (geo, mat, x, y, z) => {
    const msh = new THREE.Mesh(geo, mat);
    msh.position.set(x, y, z); msh.castShadow = true; msh.receiveShadow = true;
    sofa.add(msh); return msh;
  };

  const armL = state.arms === 'both' || state.arms === 'left';
  const armR = state.arms === 'both' || state.arms === 'right';

  addMesh(rbox(W, baseH, D, 0.06), fabric, 0, legH + baseH / 2, 0);     // цоколь

  const seatAreaL = -W / 2 + (armL ? armW : 0);
  const seatAreaR =  W / 2 - (armR ? armW : 0);
  const seatSpan = seatAreaR - seatAreaL;
  const modW = seatSpan / state.modules;
  for (let i = 0; i < state.modules; i++) {                              // подушки сиденья
    const cx = seatAreaL + modW * (i + 0.5);
    addMesh(rbox(modW * 0.95, seatThk, D * 0.9, 0.1), fabric, cx, baseTopY + seatThk / 2, D * 0.04);
  }

  const backH = Math.max(0.2, backTop - baseTopY);                       // спинка
  addMesh(rbox(seatSpan + 0.02, backH, backThk, 0.08), fabric,
    (seatAreaL + seatAreaR) / 2, baseTopY + backH / 2, -D / 2 + backThk / 2);

  if (armL) addMesh(rbox(armW, armTopY - legH, D, 0.09), fabric, -W / 2 + armW / 2, legH + (armTopY - legH) / 2, 0);
  if (armR) addMesh(rbox(armW, armTopY - legH, D, 0.09), fabric,  W / 2 - armW / 2, legH + (armTopY - legH) / 2, 0);

  if (state.pillows > 0) {                                               // декоративные подушки
    const pSpan = seatSpan - 0.1, pStep = pSpan / state.pillows;
    const pSize = Math.min(pStep * 0.86, 0.62);
    for (let i = 0; i < state.pillows; i++) {
      const cx = seatAreaL + 0.05 + pStep * (i + 0.5);
      const pil = addMesh(rbox(pSize, pSize, 0.18, 0.09), fabric, cx, seatTopY + pSize / 2 - 0.02, -D / 2 + backThk + 0.13);
      pil.rotation.x = -0.13;
    }
  }

  if (state.daybed) {                                                    // кушетка
    const chaiseD = D + 0.7, chaiseW = modW, cx = seatAreaR - chaiseW / 2;
    addMesh(rbox(chaiseW + 0.02, baseH, chaiseD, 0.06), fabric, cx, legH + baseH / 2, (chaiseD - D) / 2);
    addMesh(rbox(chaiseW * 0.95, seatThk, chaiseD * 0.92, 0.1), fabric, cx, baseTopY + seatThk / 2, (chaiseD - D) / 2 + D * 0.04);
  }

  if (state.legType !== 'floor') {                                       // ножки
    const inset = 0.16, xs = [-W / 2 + inset, W / 2 - inset], zs = [-D / 2 + inset, D / 2 - inset];
    for (const x of xs) for (const z of zs) addLeg(x, z, legH);
    if (W > 2.4) for (const z of zs) addLeg(0, z, legH);
  }

  // контактная тень под габарит
  const footprint = state.daybed ? D + 0.7 : D;
  blob.scale.set(W + 0.7, footprint + 0.7, 1);
  blob.position.set(0, 0.004, state.daybed ? (footprint - D) / 2 : 0);

  controls.target.y = seatTopY * 0.85;
  dims = { W, D, backTop, seatTopY, baseTopY };
  placeHandles();
}

function addLeg(x, z, legH) {
  let geo;
  if (state.legType === 'cylinder') geo = new THREE.CylinderGeometry(0.045, 0.045, legH, 20);
  else if (state.legType === 'cone') geo = new THREE.CylinderGeometry(0.052, 0.026, legH, 20);
  else geo = new THREE.BoxGeometry(0.08, legH, 0.08);
  const m = new THREE.Mesh(geo, legMaterial);
  m.position.set(x, legH / 2, z); m.castShadow = true;
  sofa.add(m);
}

// ============================================================
//  Перетаскиваемые точки
// ============================================================
const handleGeo = new THREE.SphereGeometry(0.075, 24, 24);
const handleMat = () => new THREE.MeshStandardMaterial({ color: 0x9b7b53, roughness: 0.35, metalness: 0.2, emissive: 0x3a2c18, emissiveIntensity: 0.3 });
const handles = {
  length: new THREE.Mesh(handleGeo, handleMat()),
  depth:  new THREE.Mesh(handleGeo, handleMat()),
  height: new THREE.Mesh(handleGeo, handleMat()),
};
Object.entries(handles).forEach(([k, h]) => { h.name = 'handle:' + k; h.renderOrder = 2; scene.add(h); });

function placeHandles() {
  const { W, D, backTop, seatTopY } = dims;
  handles.length.position.set(W / 2 + 0.12, seatTopY, 0);
  handles.depth.position.set(0, seatTopY - 0.02, D / 2 + 0.12);
  handles.height.position.set(0, backTop + 0.1, -D / 2 + 0.14);
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const dragPlane = new THREE.Plane();
const hitPoint = new THREE.Vector3();
let activeHandle = null, dirty = false;

function setPointer(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
}
canvas.addEventListener('pointerdown', (e) => {
  setPointer(e); raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(Object.values(handles))[0];
  if (!hit) return;
  activeHandle = hit.object.name.split(':')[1];
  controls.enabled = false; canvas.setPointerCapture(e.pointerId);
  if (activeHandle === 'height') {
    const n = new THREE.Vector3(); camera.getWorldDirection(n); n.y = 0; n.normalize();
    dragPlane.setFromNormalAndCoplanarPoint(n, hit.object.position);
  } else {
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), hit.object.position);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!activeHandle) return;
  setPointer(e); raycaster.setFromCamera(pointer, camera);
  if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;
  if (activeHandle === 'length') state.length = clampSync('len', Math.abs(hitPoint.x) * 2 * 100);
  else if (activeHandle === 'depth') state.depth = clampSync('dep', Math.abs(hitPoint.z) * 2 * 100);
  else if (activeHandle === 'height') state.backHeight = clampSync('hgt', hitPoint.y * 100);
  dirty = true;
});
function endDrag(e) {
  if (!activeHandle) return;
  activeHandle = null; controls.enabled = true;
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function clampSync(id, value) {
  const el = document.getElementById(id);
  const v = Math.round(Math.min(+el.max, Math.max(+el.min, value)));
  el.value = v; updateSliderLabel(id, v); return v;
}

// ============================================================
//  Интерфейс
// ============================================================
const colorsBox = document.getElementById('colors');
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.className = 'swatch' + (i === state.colorIndex ? ' active' : '');
  b.style.background = c.hex; b.title = c.name;
  b.addEventListener('click', () => {
    state.colorIndex = i;
    colorsBox.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    b.classList.add('active'); dirty = true;
  });
  colorsBox.appendChild(b);
});

function wireSeg(id, key, map) {
  const box = document.getElementById(id);
  box.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      box.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); state[key] = map(btn);
      if (id === 'legs') document.getElementById('leg-h-grp').style.opacity = (state.legType === 'floor') ? .4 : 1;
      dirty = true;
    });
  });
}
wireSeg('materials', 'material', b => b.dataset.mat);
wireSeg('arms', 'arms', b => b.dataset.arms);
wireSeg('legs', 'legType', b => b.dataset.leg);
wireSeg('daybed', 'daybed', b => {
  const v = b.dataset.daybed === '1';
  document.getElementById('daybed-val').textContent = v ? 'да' : 'нет';
  return v;
});

function clampInt(v, min, max) { return Math.min(max, Math.max(min, v)); }
document.querySelectorAll('[data-act]').forEach(btn => {
  btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    if (act === 'modules+') state.modules = clampInt(state.modules + 1, 2, 5);
    if (act === 'modules-') state.modules = clampInt(state.modules - 1, 2, 5);
    if (act === 'pillows+') state.pillows = clampInt(state.pillows + 1, 0, 6);
    if (act === 'pillows-') state.pillows = clampInt(state.pillows - 1, 0, 6);
    refreshSteppers(); dirty = true;
  });
});
function refreshSteppers() {
  document.getElementById('modules-val').textContent = state.modules;
  document.getElementById('pillows-val').textContent = state.pillows;
  document.getElementById('modules-fill').style.width = ((state.modules - 2) / 3 * 100) + '%';
  document.getElementById('pillows-fill').style.width = (state.pillows / 6 * 100) + '%';
}

function updateSliderLabel(id, v) {
  if (id === 'len') document.getElementById('len-val').textContent = v + ' см';
  if (id === 'dep') document.getElementById('dep-val').textContent = v + ' см';
  if (id === 'hgt') document.getElementById('hgt-val').textContent = v + ' см';
  if (id === 'legh') document.getElementById('legh-val').textContent = v + ' см';
}
[['len', 'length'], ['dep', 'depth'], ['hgt', 'backHeight'], ['legh', 'legHeight']].forEach(([id, key]) => {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { state[key] = +el.value; updateSliderLabel(id, +el.value); dirty = true; });
});

document.getElementById('btn-reset').addEventListener('click', () => location.reload());
document.getElementById('btn-save').addEventListener('click', () => {
  composer.render();
  const a = document.createElement('a');
  a.download = 'мой-диван-modu.png';
  a.href = renderer.domElement.toDataURL('image/png'); a.click();
});

function syncUIFromState() {
  refreshSteppers();
  ['len', 'dep', 'hgt', 'legh'].forEach(id => {
    const key = { len: 'length', dep: 'depth', hgt: 'backHeight', legh: 'legHeight' }[id];
    document.getElementById(id).value = state[key]; updateSliderLabel(id, state[key]);
  });
  document.getElementById('leg-h-grp').style.opacity = .4;
}

// ============================================================
//  Запуск
// ============================================================
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
}
window.addEventListener('resize', resize);

syncUIFromState();
buildSofa();
resize();
document.getElementById('loading').classList.add('hide');

function animate() {
  requestAnimationFrame(animate);
  resize();
  if (dirty) { buildSofa(); dirty = false; }
  controls.update();
  composer.render();
}
animate();
