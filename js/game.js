// ============================================================
//  modu — игра-примерочная «Соберите свой уют»
//  Уютная изометрическая 3D-комната-диорама (Three.js).
//  Мягкий свет, пастель, скруглённые формы.
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- Данные ----------
const PALETTES = {
  cozy:   { name:'Уютная', bg:'#A7A98C', bgNight:'#3b3d44', wall:'#F1EBE0', floor:'#CDB892', base:'#C3CBB6', trim:'#E7B894', wood:'#C49A66', accent:'#E8A584', pot:'#C77B53', lamp:'#A9B7A0', art1:'#E8A584', art2:'#C3CBB6' },
  loft:   { name:'Лофт',   bg:'#8E9398', bgNight:'#33363b', wall:'#DAD7D2', floor:'#A0978C', base:'#B7B2AA', trim:'#9AA0A6', wood:'#8A6F52', accent:'#7E8C99', pot:'#7A6A5A', lamp:'#9AA0A6', art1:'#7E8C99', art2:'#B7B2AA' },
  scandi: { name:'Сканди', bg:'#CFD2C4', bgNight:'#3a3c40', wall:'#F6F5F1', floor:'#E0CDAB', base:'#E7E5DE', trim:'#C9D0C2', wood:'#D8B98A', accent:'#B9C4B0', pot:'#CDBBA0', lamp:'#C9CFC6', art1:'#B9C4B0', art2:'#E0CDAB' },
};
const FORMS = { straight:'Прямой', lounge:'Лаунж', corner:'Угловой', u:'П-образный' };
const MATERIALS = { boucle:'Букле', linen:'Лён', velvet:'Велюр' };
const MAT_PROPS = { boucle:{r:0.95,s:0.25}, linen:{r:0.88,s:0.15}, velvet:{r:0.55,s:0.9} };
const COLORS = [
  { name:'крем',  hex:'#EFE7D9' },
  { name:'песок', hex:'#E0D2B8' },
  { name:'овёс',  hex:'#CDB89A' },
  { name:'глина', hex:'#C2A07E' },
  { name:'тауп',  hex:'#A4917C' },
  { name:'мокко', hex:'#866F5A' },
  { name:'шалфей',hex:'#AEB59C' },
  { name:'дым',   hex:'#8F8B92' },
];

const state = { room:'cozy', form:'straight', colorIndex:0, material:'boucle', cat:true, night:false };

// ---------- Рендерер ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

// ---------- Камера (ортографическая, изо-угол) ----------
const FRUSTUM = 13;
let camera = new THREE.OrthographicCamera(-1,1,1,-1, 0.1, 100);
camera.position.set(13, 11, 13);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.09;
controls.enablePan = false;
controls.target.set(0, 1.8, 0);
controls.minPolarAngle = 0.78;
controls.maxPolarAngle = 1.18;
controls.minAzimuthAngle = Math.PI/4 - 0.6;
controls.maxAzimuthAngle = Math.PI/4 + 0.6;
controls.minZoom = 0.7;
controls.maxZoom = 1.7;

// ---------- Свет ----------
const hemi = new THREE.HemisphereLight(0xffffff, 0xb9a584, 0.5);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff2e0, 1.9);
key.position.set(8, 14, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
const sc = key.shadow.camera;
sc.left=-10; sc.right=10; sc.top=10; sc.bottom=-10; sc.near=0.5; sc.far=40;
key.shadow.bias = -0.0004;
key.shadow.radius = 7;
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.35);
fill.position.set(-6, 5, -4);
scene.add(fill);

// тёплый свет от торшера
const lampLight = new THREE.PointLight(0xffd9a0, 0, 9, 2);
lampLight.position.set(-3.5, 3.4, 1.6);
scene.add(lampLight);

// ---------- Хелперы геометрии ----------
function mat(hex, opts={}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    roughness: opts.r ?? 0.85,
    metalness: opts.m ?? 0,
    emissive: opts.e ? new THREE.Color(opts.e) : 0x000000,
    emissiveIntensity: opts.ei ?? 0,
  });
}
function rbox(w,h,d,r=0.12) {
  const rr = Math.min(r, Math.min(w,h,d)/2 - 0.001);
  return new RoundedBoxGeometry(w,h,d,5, Math.max(0.01,rr));
}
function add(group, geo, material, x,y,z, shadow=true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x,y,z);
  m.castShadow = shadow; m.receiveShadow = true;
  group.add(m);
  return m;
}

let world = new THREE.Group();
scene.add(world);

// ---------- Сборка сцены ----------
function build() {
  scene.remove(world);
  world.traverse(o => { o.geometry?.dispose?.(); });
  world = new THREE.Group();
  scene.add(world);

  const P = PALETTES[state.room];
  const night = state.night;

  scene.background = new THREE.Color(night ? P.bgNight : P.bg);
  // свет под режим
  hemi.intensity = night ? 0.18 : 0.5;
  key.intensity  = night ? 0.5  : 1.9;
  fill.intensity = night ? 0.12 : 0.35;
  lampLight.intensity = night ? 6.5 : 0.6;

  const wallMat  = mat(P.wall, {r:0.95});
  const floorMat = mat(P.floor, {r:0.9});
  const woodMat  = mat(P.wood, {r:0.6});
  const trimMat  = mat(P.trim, {r:0.7});

  // платформа-подиум
  add(world, rbox(11.2, 1.2, 11.2, 0.3), mat(P.base,{r:0.95}), 0, -0.6, 0);
  // пол
  add(world, rbox(10, 0.4, 10, 0.15), floorMat, 0, 0.0, 0);
  // стены (две, открытая сторона к камере)
  add(world, rbox(10, 6, 0.4, 0.1), wallMat, 0, 3, -4.9);
  add(world, rbox(0.4, 6, 10, 0.1), wallMat, -4.9, 3, 0);
  // тёплый кант по верху стен
  add(world, rbox(10.3, 0.5, 0.5, 0.18), trimMat, 0, 5.9, -4.9, false);
  add(world, rbox(0.5, 0.5, 10.3, 0.18), trimMat, -4.9, 5.9, 0, false);

  buildWindow(world, P, night);
  buildArt(world, P);
  buildRug(world, P);
  buildSofa(world, P);
  buildTable(world, P);
  buildPlant(world, P, -3.9, -3.9, 1.0);
  buildLamp(world, P, -3.6, 1.6);
  buildShelf(world, P);
}

// окно с занавесками на дальней стене
function buildWindow(g, P, night) {
  const fr = mat(P.wood,{r:0.5});
  add(g, rbox(3.4, 4.0, 0.25, 0.1), fr, 1.4, 3.1, -4.78);
  const glassCol = night ? '#26304f' : '#bcd2dc';
  const glass = mat(glassCol, {r:0.2, m:0.0, e: night?'#26304f':'#cfe2ea', ei: night?0.25:0.35});
  add(g, rbox(2.9, 3.5, 0.08, 0.04), glass, 1.4, 3.1, -4.7, false);
  // переплёт
  add(g, rbox(0.12,3.5,0.12,0.04), fr, 1.4, 3.1, -4.66, false);
  add(g, rbox(2.9,0.12,0.12,0.04), fr, 1.4, 3.1, -4.66, false);
  if (night) { // луна
    add(g, rbox(0.5,0.5,0.05,0.2), mat('#EFE8C6',{e:'#EFE8C6',ei:0.6}), 2.3, 4.0, -4.64, false);
  }
  // занавески по краям
  const cur = mat(P.trim,{r:0.9});
  add(g, rbox(0.5, 4.2, 0.4, 0.2), cur, -0.45, 3.1, -4.6);
  add(g, rbox(0.5, 4.2, 0.4, 0.2), cur, 3.25, 3.1, -4.6);
  // карниз
  add(g, rbox(4.2,0.18,0.18,0.09), woodCol(P), 1.4, 5.3, -4.55, false);
}
function woodCol(P){ return mat(P.wood,{r:0.5}); }

// картины на левой стене
function buildArt(g, P) {
  const frame = mat(P.wood,{r:0.5});
  add(g, rbox(0.18, 1.7, 2.6, 0.06), frame, -4.74, 3.6, -1.2, false);
  add(g, rbox(0.06, 1.4, 2.3, 0.04), mat('#F7F4EC',{r:0.9}), -4.66, 3.6, -1.2, false);
  add(g, rbox(0.05, 0.7, 1.0, 0.2), mat(P.art1,{r:0.8}), -4.62, 3.5, -1.5, false);
  add(g, rbox(0.05, 0.6, 0.7, 0.2), mat(P.art2,{r:0.8}), -4.62, 3.7, -0.8, false);
  // маленькая квадратная
  add(g, rbox(0.16, 1.0, 1.0, 0.06), frame, -4.74, 4.3, 1.6, false);
  add(g, rbox(0.05, 0.7, 0.7, 0.05), mat(P.accent,{r:0.8}), -4.64, 4.3, 1.6, false);
}

function buildRug(g, P) {
  const geo = new THREE.CylinderGeometry(3.0, 3.0, 0.08, 48);
  const m = new THREE.Mesh(geo, mat(P.accent,{r:0.95}));
  m.position.set(0.4, 0.22, 1.0); m.receiveShadow = true;
  g.add(m);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.05, 8, 48), mat(P.wall,{r:0.9}));
  ring.rotation.x = Math.PI/2; ring.position.set(0.4, 0.27, 1.0);
  g.add(ring);
}

// ---------- Диван ----------
function buildSofa(g, P) {
  const fabric = mat(COLORS[state.colorIndex].hex, MAT_PROPS[state.material]);
  const accent = mat(P.accent, MAT_PROPS[state.material]);
  const feet = mat(P.wood, {r:0.4, m:0.1});
  const form = state.form;

  let W = 4.0, D = 1.7, backH = 1.5, seatH = 0.55;
  if (form === 'lounge') { W = 4.2; D = 2.0; backH = 1.1; seatH = 0.7; }
  if (form === 'corner') { W = 3.8; }
  if (form === 'u')      { W = 4.0; }

  const sofa = new THREE.Group();
  const baseY = 0.42;          // верх пола ~0.2; ножки приподнимают
  const armW = 0.5;

  // ножки
  for (const sx of [-W/2+0.35, W/2-0.35]) for (const sz of [-D/2+0.35, D/2-0.35])
    add(sofa, rbox(0.18,0.3,0.18,0.05), feet, sx, 0.35, sz);

  // цоколь
  add(sofa, rbox(W, 0.5, D, 0.16), fabric, 0, baseY+0.25, 0);
  // спинка
  add(sofa, rbox(W-2*armW+0.1, backH, 0.45, 0.18), fabric, 0, baseY+0.5+backH/2, -D/2+0.22);
  // подлокотники
  add(sofa, rbox(armW, backH*0.7, D, 0.2), fabric, -W/2+armW/2, baseY+0.5+backH*0.35, 0);
  add(sofa, rbox(armW, backH*0.7, D, 0.2), fabric,  W/2-armW/2, baseY+0.5+backH*0.35, 0);
  // подушки сиденья
  const nC = form==='lounge' ? 2 : 3;
  const innerW = W-2*armW, cw = innerW/nC;
  for (let i=0;i<nC;i++)
    add(sofa, rbox(cw*0.92, seatH, D*0.8, 0.2), fabric, -innerW/2 + cw*(i+0.5), baseY+0.5+seatH/2, 0.12);
  // декоративные подушки
  const pil1 = add(sofa, rbox(0.7,0.7,0.22,0.16), accent, -innerW/2+0.5, baseY+0.5+seatH+0.2, -D/2+0.45);
  pil1.rotation.z = 0.12; pil1.rotation.x = -0.18;
  const pil2 = add(sofa, rbox(0.7,0.7,0.22,0.16), mat(COLORS[state.colorIndex].hex,{r:0.8}).clone(), innerW/2-0.5, baseY+0.5+seatH+0.2, -D/2+0.45);
  pil2.rotation.z = -0.12; pil2.rotation.x = -0.18;

  // кушетки для угловой / П-образной — выступ вперёд
  if (form === 'corner')
    add(sofa, rbox(1.3, seatH+0.3, 1.4, 0.2), fabric, W/2-0.65, baseY+0.5+(seatH+0.3)/2-0.15, D/2+0.7);
  if (form === 'u') {
    add(sofa, rbox(1.0, seatH+0.3, 1.3, 0.2), fabric, -W/2+0.5, baseY+0.5+(seatH+0.3)/2-0.15, D/2+0.65);
    add(sofa, rbox(1.0, seatH+0.3, 1.3, 0.2), fabric,  W/2-0.5, baseY+0.5+(seatH+0.3)/2-0.15, D/2+0.65);
  }

  // котик, свернувшийся на подушке
  if (state.cat) buildCat(sofa, innerW/2-0.6, baseY+0.5+seatH+0.05, 0.2);

  sofa.position.set(0.3, 0, -2.7);
  g.add(sofa);
}

function buildCat(g, x, y, z) {
  const body = mat('#C8743C',{r:0.7}), dark = mat('#A85E2E',{r:0.7});
  const b = add(g, new THREE.SphereGeometry(0.42, 16, 12), body, x, y+0.25, z);
  b.scale.set(1.3, 0.7, 1.0);
  add(g, new THREE.SphereGeometry(0.24,14,12), body, x-0.42, y+0.32, z+0.1);  // голова
  add(g, rbox(0.1,0.14,0.05,0.03), dark, x-0.52, y+0.52, z+0.02, false);       // ушки
  add(g, rbox(0.1,0.14,0.05,0.03), dark, x-0.4, y+0.52, z+0.18, false);
  const tail = add(g, new THREE.CylinderGeometry(0.07,0.05,0.7,8), body, x+0.5, y+0.28, z); // хвост
  tail.rotation.z = Math.PI/2.3;
}

// ---------- Журнальный столик ----------
function buildTable(g, P) {
  const wood = mat(P.wood,{r:0.45,m:0.05});
  const t = new THREE.Group();
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,0.16,32), wood);
  top.position.y = 1.0; top.castShadow = true; top.receiveShadow = true; t.add(top);
  for (let i=0;i<3;i++){
    const a = i/3*Math.PI*2;
    add(t, new THREE.CylinderGeometry(0.07,0.05,1.0,10), wood, Math.cos(a)*0.6, 0.5, Math.sin(a)*0.6);
  }
  // две чашечки
  add(t, new THREE.CylinderGeometry(0.12,0.1,0.16,16), mat('#F4EFE6',{r:0.5}), -0.25,1.16,0.1);
  add(t, new THREE.CylinderGeometry(0.12,0.1,0.16,16), mat('#F4EFE6',{r:0.5}), 0.25,1.16,-0.1);
  t.position.set(0.5, 0.2, 1.2);
  g.add(t);
}

// ---------- Растение ----------
function buildPlant(g, P, x, z, s=1) {
  const pot = mat(P.pot,{r:0.7});
  add(g, new THREE.CylinderGeometry(0.45*s,0.35*s,0.7*s,18), pot, x, 0.2+0.35*s, z);
  const leaf = mat('#6E8F59',{r:0.7}), leaf2 = mat('#5E7D4F',{r:0.7});
  for (let i=0;i<7;i++){
    const a = i/7*Math.PI*2, r=0.28*s;
    const l = add(g, new THREE.SphereGeometry(0.3*s,10,8), i%2?leaf:leaf2, x+Math.cos(a)*r, 0.2+0.9*s+ (i%3)*0.18*s, z+Math.sin(a)*r);
    l.scale.set(0.6,1.5,0.6); l.rotation.z = Math.cos(a)*0.4; l.rotation.x = Math.sin(a)*0.4;
  }
}

// ---------- Торшер ----------
function buildLamp(g, P, x, z) {
  const metal = mat('#8a8276',{r:0.4,m:0.4});
  add(g, new THREE.CylinderGeometry(0.35,0.45,0.12,20), metal, x, 0.28, z);  // основание
  add(g, new THREE.CylinderGeometry(0.05,0.05,3.1,10), metal, x, 1.8, z);    // стойка
  const shade = state.night
    ? mat(P.lamp,{r:0.6, e:'#ffcf8c', ei:0.9})
    : mat(P.lamp,{r:0.7});
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.7,0.7,20, 1, true), shade);
  sh.position.set(x, 3.4, z); sh.castShadow = false; g.add(sh);
  add(g, new THREE.CylinderGeometry(0.55,0.55,0.05,20), mat('#fff3da',{e:'#ffe6b0',ei: state.night?1.0:0.2}), x, 3.06, z, false);
}

// ---------- Стеллаж-лесенка ----------
function buildShelf(g, P) {
  const wood = mat(P.wood,{r:0.5});
  const sh = new THREE.Group();
  for (const sx of [-0.5,0.5]) { const p = add(sh, rbox(0.1,3.0,0.1,0.04), wood, sx,1.5,0); p.rotation.x=0.08; }
  for (let i=0;i<3;i++) add(sh, rbox(1.4,0.1,0.5-i*0.1,0.04), wood, 0, 0.7+i*0.9, 0);
  add(sh, rbox(0.5,0.3,0.35,0.06), mat(P.accent,{r:0.8}), -0.2, 0.95, 0); // книжки
  add(sh, rbox(0.4,0.4,0.3,0.06), mat(P.art2,{r:0.8}), 0.25, 1.0, 0);
  sh.position.set(-2.6, 0.2, -3.9);
  g.add(sh);
}

// ---------- Размер/ресайз ----------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w === 0 || h === 0) return;
  if (canvas.width !== w*renderer.getPixelRatio() || canvas.height !== h*renderer.getPixelRatio()) {
    renderer.setSize(w, h, false);
  }
  const aspect = w / h;
  camera.left = -FRUSTUM*aspect/2; camera.right = FRUSTUM*aspect/2;
  camera.top = FRUSTUM/2; camera.bottom = -FRUSTUM/2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// ---------- Интерфейс ----------
function makeButtons(boxId, entries, current, onPick) {
  const box = document.getElementById(boxId); box.innerHTML='';
  entries.forEach(([val,label]) => {
    const b=document.createElement('button'); b.type='button'; b.textContent=label;
    b.className=(val===current)?'active':'';
    b.addEventListener('click', ()=>{
      box.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); onPick(val); build();
    });
    box.appendChild(b);
  });
}
makeButtons('rooms', Object.entries(PALETTES).map(([k,v])=>[k,v.name]), state.room, v=>state.room=v);
makeButtons('forms', Object.entries(FORMS), state.form, v=>state.form=v);
makeButtons('materials', Object.entries(MATERIALS), state.material, v=>state.material=v);

const colorsBox=document.getElementById('colors');
COLORS.forEach((c,i)=>{
  const b=document.createElement('button'); b.type='button';
  b.className='swatch'+(i===state.colorIndex?' active':'');
  b.style.background=c.hex; b.title=c.name; b.setAttribute('aria-label',c.name);
  b.addEventListener('click', ()=>{
    colorsBox.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active'));
    b.classList.add('active'); state.colorIndex=i; build();
  });
  colorsBox.appendChild(b);
});

document.getElementById('t-cat').addEventListener('click', e=>{ state.cat=!state.cat; e.currentTarget.classList.toggle('active',state.cat); build(); });
document.getElementById('t-night').addEventListener('click', e=>{ state.night=!state.night; e.currentTarget.classList.toggle('active',state.night); build(); });

document.getElementById('save').addEventListener('click', ()=>{
  renderer.render(scene, camera);
  const a=document.createElement('a'); a.download='мой-уют-modu.png'; a.href=canvas.toDataURL('image/png'); a.click();
});

// ---------- Запуск ----------
build();
resize();
function animate(){ requestAnimationFrame(animate); resize(); controls.update(); renderer.render(scene, camera); }
animate();
