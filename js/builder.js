// ============================================================
//  modu — конструктор дивана из готовых деталей
//  Цвет стены/пола · форма спинки (квадрат/полукруг/овал) ·
//  размеры · ножки (форма+цвет) · материал+цвет · подушки drag&drop
// ============================================================
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ---------- Палитры ----------
const WALL_COLORS  = ['#EFEAE1','#E7D9C4','#D5DDD4','#E2DCE7','#DCCFC2','#C9CFD6','#3A3A3E','#F6F5F1'];
const FLOOR_COLORS = ['#C49A66','#B0875A','#D8C49E','#9E968C','#7A5E40','#CFCAC0','#EBD9B6','#5A4632'];
const LEG_COLORS   = ['#4A3526','#8A6F52','#1A1A1A','#C9C7C2','#B8902E'];
const FABRIC_COLORS = [
  { name:'крем',  hex:'#EAE3D6' }, { name:'песок', hex:'#D8C7AC' },
  { name:'овёс',  hex:'#C9B79B' }, { name:'глина', hex:'#B79A7B' },
  { name:'тауп',  hex:'#9D8A77' }, { name:'мокко', hex:'#7E6B58' },
  { name:'шалфей',hex:'#A7AA98' }, { name:'туман', hex:'#B9BBB5' },
  { name:'графит',hex:'#4A4A48' }, { name:'терракота',hex:'#B07A5E' },
];
const PILLOW_COLORS = ['#E8A584','#C36F4E','#9DAE8C','#6E7E6A','#D9C9A8','#8A8B94','#EFE7D9','#5A5A57'];
// roughness/sheen — глянец (НЕ трогаем); normal/rep/tex — рельеф (текстура)
const MATERIALS = {
  boucle: { roughness:0.95, sheen:0.35, sheenRough:0.9,  normal:3.4, rep:5,  tex:'boucle' }, // лохматые петли — сильный рельеф
  linen:  { roughness:0.88, sheen:0.20, sheenRough:0.95, normal:2.2, rep:13, tex:'linen'  }, // чёткое плетение
  velvet: { roughness:0.62, sheen:1.0,  sheenRough:0.35, normal:0.8, rep:10, tex:'velvet' }, // гладкий ворс
};

const state = {
  wall:'#EFEAE1', floor:'#C49A66', legColor:'#4A3526',
  backShape:'square', backHeight:72, arch:0,
  length:300, depth:100, legType:'cylinder',
  material:'boucle', fabricIndex:1,
};
const pilDefaults = { shape:'square', color:'#E8A584' };

// ---------- Рендерер ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, preserveDrawingBuffer:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;
scene.background = new THREE.Color('#EFEAE1');

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(3.8, 2.6, 5.6);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.09;
controls.minDistance = 3.5; controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI*0.49;
controls.target.set(0, 0.55, 0);

// ---------- Свет ----------
scene.add(new THREE.HemisphereLight(0xffffff, 0xb9a584, 0.4));
const key = new THREE.DirectionalLight(0xfff2e0, 2.1);
key.position.set(4.5, 7.5, 4.5); key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
const sc = key.shadow.camera; sc.left=-6; sc.right=6; sc.top=6; sc.bottom=-6; sc.near=0.5; sc.far=25;
key.shadow.bias = -0.0004; key.shadow.radius = 8;
scene.add(key);
const fill = new THREE.DirectionalLight(0xdfe8ff, 0.35); fill.position.set(-5,3,-2); scene.add(fill);

// ---------- Комната (стена + пол) ----------
const floorMat = new THREE.MeshStandardMaterial({ color: state.floor, roughness:0.95 });
const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), floorMat);
floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; scene.add(floor);

const wallMat = new THREE.MeshStandardMaterial({ color: state.wall, roughness:0.97 });
const wallBack = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
wallBack.position.set(0, 5, -2.6); wallBack.receiveShadow = true; scene.add(wallBack);
const wallLeft = new THREE.Mesh(new THREE.PlaneGeometry(20, 10), wallMat);
wallLeft.rotation.y = Math.PI/2; wallLeft.position.set(-3.2, 5, 0); wallLeft.receiveShadow = true; scene.add(wallLeft);

// ---------- Текстуры ткани (как в конструкторе) ----------
function newCanvas(s){ const c=document.createElement('canvas'); c.width=c.height=s; return c; }
function boucleHeight(){ const s=512,c=newCanvas(s),x=c.getContext('2d'); x.fillStyle='#161616'; x.fillRect(0,0,s,s);
  // крупные мягкие петли
  for(let i=0;i<11000;i++){ const px=Math.random()*s,py=Math.random()*s,r=Math.random()*7+4,h=150+Math.random()*105;
    const g=x.createRadialGradient(px,py,0,px,py,r); g.addColorStop(0,`rgba(${h},${h},${h},1)`); g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g; x.beginPath(); x.arc(px,py,r,0,7); x.fill(); }
  // «лохматость» — короткие ворсинки во все стороны
  x.lineWidth=1.5;
  for(let i=0;i<16000;i++){ const px=Math.random()*s,py=Math.random()*s,a=Math.random()*7,len=Math.random()*7+3,h=185+Math.random()*70;
    x.strokeStyle=`rgba(${h},${h},${h},0.85)`; x.beginPath(); x.moveTo(px,py); x.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len); x.stroke(); }
  return c; }
function linenHeight(){ const s=512,c=newCanvas(s),x=c.getContext('2d'); x.fillStyle='#404040'; x.fillRect(0,0,s,s); const step=7;
  for(let y=0;y<s;y+=step) for(let xx=0;xx<s;xx+=step){ const a=((xx/step+y/step)%2===0);
    const g=x.createRadialGradient(xx+step/2,y+step/2,0,xx+step/2,y+step/2,step); const h=a?230:120;
    g.addColorStop(0,`rgba(${h},${h},${h},0.9)`); g.addColorStop(1,'rgba(40,40,40,0)'); x.fillStyle=g; x.fillRect(xx,y,step,step); } return c; }
function heightToNormal(hc, strength){ const s=hc.width, src=hc.getContext('2d').getImageData(0,0,s,s).data;
  const out=newCanvas(s), octx=out.getContext('2d'), img=octx.createImageData(s,s), d=img.data;
  const H=(x,y)=>{x=(x+s)%s;y=(y+s)%s;return src[(y*s+x)*4]/255;};
  for(let y=0;y<s;y++)for(let x=0;x<s;x++){ const dx=(H(x-1,y)-H(x+1,y))*strength, dy=(H(x,y-1)-H(x,y+1))*strength, len=Math.hypot(dx,dy,1), i=(y*s+x)*4;
    d[i]=((dx/len)*0.5+0.5)*255; d[i+1]=((dy/len)*0.5+0.5)*255; d[i+2]=((1/len)*0.5+0.5)*255; d[i+3]=255; }
  octx.putImageData(img,0,0); const t=new THREE.CanvasTexture(out); t.wrapS=t.wrapT=THREE.RepeatWrapping;
  t.anisotropy=renderer.capabilities.getMaxAnisotropy(); return t; }
function velvetHeight(){ const s=512,c=newCanvas(s),x=c.getContext('2d'); x.fillStyle='#7a7a7a'; x.fillRect(0,0,s,s);
  // плотный мелкий вертикальный ворс
  for(let xx=0;xx<s;xx++){ const base=95+Math.random()*40;
    for(let yy=0;yy<s;yy+=2){ const h=base+Math.random()*55; x.fillStyle=`rgba(${h},${h},${h},0.5)`; x.fillRect(xx,yy,1,2); } }
  return c; }
const TEX = {
  boucle: heightToNormal(boucleHeight(), 9),
  linen:  heightToNormal(linenHeight(), 6),
  velvet: heightToNormal(velvetHeight(), 4.5),
};

let currentFabric = null;
function fabricMaterial(){
  const m = MATERIALS[state.material]; const nrm = TEX[m.tex].clone(); nrm.needsUpdate=true; nrm.repeat.set(m.rep,m.rep);
  return new THREE.MeshPhysicalMaterial({
    color:new THREE.Color(FABRIC_COLORS[state.fabricIndex].hex), roughness:m.roughness, metalness:0,
    normalMap:nrm, normalScale:new THREE.Vector2(m.normal,m.normal),
    sheen:m.sheen, sheenRoughness:m.sheenRough, sheenColor:new THREE.Color(0xffffff), envMapIntensity:0.85,
  });
}
const legMaterial = new THREE.MeshStandardMaterial({ color: state.legColor, roughness:0.4, metalness:0.2 });

// ---------- Форма спинки ----------
function rbox(w,h,d,r=0.09){ const rr=Math.min(r,Math.min(w,h,d)/2-0.001); return new RoundedBoxGeometry(w,h,d,5,Math.max(0.01,rr)); }

function backGeometry(W, H, thk){
  const hw = W/2; const apex = state.arch/100 * hw * 0.9; const s = new THREE.Shape();
  if (state.backShape === 'square') {
    const r = Math.min(0.12, hw, H/2);
    s.moveTo(-hw, 0); s.lineTo(-hw, H-r); s.quadraticCurveTo(-hw, H, -hw+r, H);
    s.lineTo(hw-r, H); s.quadraticCurveTo(hw, H, hw, H-r); s.lineTo(hw, 0); s.lineTo(-hw,0);
  } else if (state.backShape === 'semicircle') {
    const sideH = Math.max(H*0.12, H - hw*0.85);
    s.moveTo(-hw, 0); s.lineTo(-hw, sideH);
    s.quadraticCurveTo(-hw, H, apex, H);
    s.quadraticCurveTo(hw, H, hw, sideH); s.lineTo(hw, 0); s.lineTo(-hw,0);
  } else { // oval
    s.absellipse(apex, H/2, hw, H/2, 0, Math.PI*2, false);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth:thk, bevelEnabled:true, bevelThickness:0.03, bevelSize:0.03, bevelSegments:2, steps:1 });
  g.translate(0, 0, -thk/2); g.computeVertexNormals(); return g;
}

// ---------- Сборка дивана ----------
const sofa = new THREE.Group(); scene.add(sofa);
let dims = {};
function buildSofa(){
  while (sofa.children.length){ const o=sofa.children.pop(); o.geometry?.dispose?.(); }
  if (currentFabric) currentFabric.dispose();
  currentFabric = fabricMaterial();
  legMaterial.color.set(state.legColor);

  const W = state.length/100, D = state.depth/100;
  const backTop = state.backHeight/100;
  const legH = state.legType==='none' ? 0 : 0.14;
  const baseH=0.20, seatThk=0.24, armW=0.26, backThk=0.24;
  const baseTopY = legH + baseH, seatTopY = baseTopY + seatThk;
  const armTopY = baseTopY + (backTop - baseTopY)*0.5;

  const addMesh=(geo,mat,x,y,z)=>{ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; sofa.add(m); return m; };

  addMesh(rbox(W,baseH,D,0.06), currentFabric, 0, legH+baseH/2, 0);                  // цоколь

  const seatL=-W/2+armW, seatR=W/2-armW, span=seatR-seatL;
  const nCush=Math.max(1,Math.min(4,Math.round(span/1.05))), cw=span/nCush;
  for(let i=0;i<nCush;i++) addMesh(rbox(cw*0.95,seatThk,D*0.9,0.1), currentFabric, seatL+cw*(i+0.5), baseTopY+seatThk/2, D*0.04);

  // спинка-форма
  const backH=Math.max(0.2, backTop-baseTopY);
  const back=addMesh(backGeometry(span+0.04, backH, backThk), currentFabric, (seatL+seatR)/2, baseTopY, -D/2+backThk/2);

  // подлокотники
  addMesh(rbox(armW, armTopY-legH, D, 0.09), currentFabric, -W/2+armW/2, legH+(armTopY-legH)/2, 0);
  addMesh(rbox(armW, armTopY-legH, D, 0.09), currentFabric,  W/2-armW/2, legH+(armTopY-legH)/2, 0);

  // ножки
  if (state.legType!=='none'){
    const inset=0.16, xs=[-W/2+inset,W/2-inset], zs=[-D/2+inset,D/2-inset];
    for(const x of xs) for(const z of zs) addLeg(x,z,legH);
    if (W>2.6) for(const z of zs) addLeg(0,z,legH);
  }

  dims={W,D,seatTopY,backTop}; placeHandles();
  reclampPillows(); positionPillows();
}
function addLeg(x,z,legH){
  let geo;
  if(state.legType==='cylinder') geo=new THREE.CylinderGeometry(0.045,0.045,legH,18);
  else if(state.legType==='cone') geo=new THREE.CylinderGeometry(0.052,0.026,legH,18);
  else geo=new THREE.BoxGeometry(0.08,legH,0.08);
  const m=new THREE.Mesh(geo,legMaterial); m.position.set(x,legH/2,z); m.castShadow=true; sofa.add(m);
}

// ---------- Подушки ----------
const pillowsGroup = new THREE.Group(); scene.add(pillowsGroup);
const pillows = []; // {mesh, shape, color, x, z}
let selected = null;

function pillowGeo(shape){
  if(shape==='round'){ const g=new THREE.SphereGeometry(0.26,20,16); g.scale(1,0.55,1); return g; }
  if(shape==='bolster'){ const g=new THREE.CylinderGeometry(0.16,0.16,0.62,18); g.rotateZ(Math.PI/2); return g; }
  return rbox(0.5,0.5,0.2,0.14); // square
}
function pillowMaterial(color){
  return new THREE.MeshPhysicalMaterial({ color:new THREE.Color(color), roughness:0.7, sheen:0.5, sheenRoughness:0.6, sheenColor:0xffffff, envMapIntensity:0.7 });
}
function makePillow(shape,color,x,z){
  const m=new THREE.Mesh(pillowGeo(shape), pillowMaterial(color));
  m.castShadow=true; m.receiveShadow=true;
  const p={mesh:m, shape, color, x, z}; m.userData.p=p; pillows.push(p); pillowsGroup.add(m);
  positionPillow(p); return p;
}
function pillowHeight(p){ return p.shape==='round'?0.29 : p.shape==='bolster'?0.16 : 0.5; }
function positionPillow(p){ const y=(dims.seatTopY||0.6)+pillowHeight(p)/2 - (p.shape==='square'?0.02:0); p.mesh.position.set(p.x, y, p.z); }
function positionPillows(){ pillows.forEach(positionPillow); }
function reclampPillows(){ const W=dims.W||3, D=dims.D||1; pillows.forEach(p=>{ p.x=clamp(p.x,-W/2+0.3,W/2-0.3); p.z=clamp(p.z,-D/2+0.25,D/2-0.25); }); }
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

function selectPillow(p){
  if(selected) selected.mesh.material.emissive.setHex(0x000000);
  selected=p;
  if(p){ p.mesh.material.emissive=new THREE.Color(0x3a2c18); p.mesh.material.emissiveIntensity=0.35;
    pilDefaults.shape=p.shape; pilDefaults.color=p.color; syncPillowUI(); }
}
function addPillow(){ const W=dims.W||3; const x=(pillows.length%2?0.5:-0.5)*Math.min(1.2,W/3); const z=-(dims.D||1)/2+0.45;
  const p=makePillow(pilDefaults.shape, pilDefaults.color, x, z); selectPillow(p); updatePillowCount(); }
function deleteSelected(){ if(!selected) return; pillowsGroup.remove(selected.mesh); selected.mesh.geometry.dispose();
  pillows.splice(pillows.indexOf(selected),1); selected=null; updatePillowCount(); }
function clearPillows(){ pillows.forEach(p=>{ pillowsGroup.remove(p.mesh); p.mesh.geometry.dispose(); }); pillows.length=0; selected=null; updatePillowCount(); }
function updatePillowCount(){ document.getElementById('pil-count').textContent=pillows.length; }

// меняем форму/цвет выбранной (или дефолт для будущих)
function applyPillowShape(shape){ pilDefaults.shape=shape; if(selected){ selected.shape=shape; selected.mesh.geometry.dispose(); selected.mesh.geometry=pillowGeo(shape); positionPillow(selected); } }
function applyPillowColor(color){ pilDefaults.color=color; if(selected){ selected.color=color; selected.mesh.material.color.set(color); } }

// ---------- Перетаскиваемые точки размеров ----------
const handleGeo=new THREE.SphereGeometry(0.07,20,20);
const handleMat=()=>new THREE.MeshStandardMaterial({color:0x9b7b53,roughness:0.35,metalness:0.2,emissive:0x3a2c18,emissiveIntensity:0.3});
const handles={ length:new THREE.Mesh(handleGeo,handleMat()), depth:new THREE.Mesh(handleGeo,handleMat()) };
Object.entries(handles).forEach(([k,h])=>{ h.name='handle:'+k; scene.add(h); });
function placeHandles(){ const {W,D,seatTopY}=dims; handles.length.position.set(W/2+0.12,seatTopY,0); handles.depth.position.set(0,seatTopY-0.02,D/2+0.12); }

// ---------- Указатель: drag подушек и точек ----------
const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2(), dragPlane=new THREE.Plane(), hit=new THREE.Vector3();
let activeHandle=null, activePillow=null, dirty=false;
function setPointer(e){ const r=canvas.getBoundingClientRect(); pointer.x=((e.clientX-r.left)/r.width)*2-1; pointer.y=-((e.clientY-r.top)/r.height)*2+1; }

canvas.addEventListener('pointerdown',(e)=>{
  setPointer(e); raycaster.setFromCamera(pointer,camera);
  const hH=raycaster.intersectObjects(Object.values(handles))[0];
  if(hH){ activeHandle=hH.object.name.split(':')[1]; controls.enabled=false; canvas.setPointerCapture(e.pointerId);
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0,1,0), hH.object.position); return; }
  const hP=raycaster.intersectObjects(pillows.map(p=>p.mesh))[0];
  if(hP){ const p=hP.object.userData.p; selectPillow(p); activePillow=p; controls.enabled=false; canvas.setPointerCapture(e.pointerId);
    dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0,1,0), p.mesh.position); return; }
  selectPillow(null);
});
canvas.addEventListener('pointermove',(e)=>{
  if(!activeHandle && !activePillow) return;
  setPointer(e); raycaster.setFromCamera(pointer,camera);
  if(!raycaster.ray.intersectPlane(dragPlane,hit)) return;
  if(activeHandle==='length'){ state.length=clampSync('len',Math.abs(hit.x)*2*100); dirty=true; }
  else if(activeHandle==='depth'){ state.depth=clampSync('dep',Math.abs(hit.z)*2*100); dirty=true; }
  else if(activePillow){ const W=dims.W,D=dims.D; activePillow.x=clamp(hit.x,-W/2+0.3,W/2-0.3); activePillow.z=clamp(hit.z,-D/2+0.25,D/2-0.25); positionPillow(activePillow); }
});
function endDrag(e){ activeHandle=null; activePillow=null; controls.enabled=true; try{canvas.releasePointerCapture(e.pointerId);}catch{} }
canvas.addEventListener('pointerup',endDrag); canvas.addEventListener('pointercancel',endDrag);
function clampSync(id,v){ const el=document.getElementById(id); const val=Math.round(Math.min(+el.max,Math.max(+el.min,v))); el.value=val; updateSliderLabel(id,val); return val; }

// ============================================================
//  Интерфейс
// ============================================================
function swatchRow(boxId, colors, current, onPick, rounded){
  const box=document.getElementById(boxId); box.innerHTML='';
  colors.forEach(hex=>{ const b=document.createElement('button'); b.className='swatch'+(hex===current?' active':''); b.style.background=hex; b.title=hex;
    b.addEventListener('click',()=>{ box.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active')); b.classList.add('active'); onPick(hex); }); box.appendChild(b); });
}
swatchRow('wall-colors', WALL_COLORS, state.wall, hex=>{ state.wall=hex; wallMat.color.set(hex); scene.background.set(hex); });
swatchRow('floor-colors', FLOOR_COLORS, state.floor, hex=>{ state.floor=hex; floorMat.color.set(hex); });
swatchRow('leg-colors', LEG_COLORS, state.legColor, hex=>{ state.legColor=hex; legMaterial.color.set(hex); });
swatchRow('pillow-colors', PILLOW_COLORS, pilDefaults.color, hex=>applyPillowColor(hex));

const fabricBox=document.getElementById('fabric-colors');
FABRIC_COLORS.forEach((c,i)=>{ const b=document.createElement('button'); b.className='swatch'+(i===state.fabricIndex?' active':''); b.style.background=c.hex; b.title=c.name;
  b.addEventListener('click',()=>{ fabricBox.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active')); b.classList.add('active'); state.fabricIndex=i; if(currentFabric) currentFabric.color.set(c.hex); }); fabricBox.appendChild(b); });

function wireSeg(id, onPick){ const box=document.getElementById(id); box.querySelectorAll('button').forEach(btn=>{ if(btn.id) return;
  btn.addEventListener('click',()=>{ box.querySelectorAll('button').forEach(b=>{ if(!b.id) b.classList.remove('active'); }); btn.classList.add('active'); onPick(btn); }); }); }
wireSeg('back-shape', b=>{ state.backShape=b.dataset.shape; dirty=true; });
wireSeg('legtype',    b=>{ state.legType=b.dataset.leg; dirty=true; });
wireSeg('material',   b=>{ state.material=b.dataset.mat; dirty=true; });
wireSeg('pillow-shape', b=>applyPillowShape(b.dataset.pil));

document.getElementById('pil-add').addEventListener('click', addPillow);
document.getElementById('pil-del').addEventListener('click', deleteSelected);
document.getElementById('pil-clear').addEventListener('click', clearPillows);

function syncPillowUI(){
  const box=document.getElementById('pillow-shape'); box.querySelectorAll('button').forEach(b=>b.classList.toggle('active', b.dataset.pil===pilDefaults.shape));
  document.querySelectorAll('#pillow-colors .swatch').forEach(s=>s.classList.toggle('active', s.style.background.replace(/\s/g,'')===hexToRgbStr(pilDefaults.color)));
}
function hexToRgbStr(hex){ const n=parseInt(hex.slice(1),16); return `rgb(${(n>>16)&255},${(n>>8)&255},${n&255})`; }

function updateSliderLabel(id,v){ const map={len:'len-val',dep:'dep-val'}; if(map[id]) document.getElementById(map[id]).textContent=v+' см'; }
[['len','length'],['dep','depth']].forEach(([id,key])=>{ const el=document.getElementById(id);
  el.addEventListener('input',()=>{ state[key]=+el.value; updateSliderLabel(id,+el.value); dirty=true; }); });
document.getElementById('bh').addEventListener('input',e=>{ state.backHeight=+e.target.value; document.getElementById('bh-val').textContent=state.backHeight+' см'; dirty=true; });
document.getElementById('arch').addEventListener('input',e=>{ state.arch=+e.target.value; const v=state.arch; document.getElementById('arch-val').textContent= v===0?'по центру':(v<0?'влево':'вправо'); dirty=true; });

document.getElementById('btn-reset').addEventListener('click',()=>location.reload());
document.getElementById('btn-save').addEventListener('click',()=>{ renderer.render(scene,camera); const a=document.createElement('a'); a.download='мой-диван-modu.png'; a.href=renderer.domElement.toDataURL('image/png'); a.click(); });

function syncUI(){ document.getElementById('len').value=state.length; document.getElementById('dep').value=state.depth;
  updateSliderLabel('len',state.length); updateSliderLabel('dep',state.depth);
  document.getElementById('bh').value=state.backHeight; document.getElementById('bh-val').textContent=state.backHeight+' см';
  document.getElementById('arch-val').textContent='по центру'; }

// ---------- Запуск ----------
function resize(){ const w=canvas.clientWidth,h=canvas.clientHeight; if(canvas.width!==w||canvas.height!==h){ renderer.setSize(w,h,false); camera.aspect=w/h; camera.updateProjectionMatrix(); } }
window.addEventListener('resize',resize);

syncUI(); buildSofa(); addPillow(); addPillow(); resize();
document.getElementById('loading').classList.add('hide');

function animate(){ requestAnimationFrame(animate); resize(); if(dirty){ buildSofa(); dirty=false; } controls.update(); renderer.render(scene,camera); }
animate();
