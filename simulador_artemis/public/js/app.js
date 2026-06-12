/**
 * Artemis II Mission Tracker — Main App
 * Orchestrates 3D scene, HUD, timeline, and events panel.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ——— Constants ———
const TOTAL_MET = 803400;    // segundos (9d 7h 10m — amerizaje)
const EARTH_R = 6.371;       // units (1 unit = 1000 km)
const MOON_R = 1.7374;
const EARTH_MOON_DIST = 384.4;
const SCALE_FACTOR = 1;      // visual scale

// ——— State ———
let trajectory = [];
let events = [];
let crew = [];
let currentMET = 0;
let isPlaying = false;
let playSpeed = 100;
let lastTimestamp = null;
let orionPosition = new THREE.Vector3(0, 0, EARTH_R);

// ——— Cached DOM ———
const hudMet = document.getElementById('hud-met');
const hudDistEarth = document.getElementById('hud-dist-earth');
const hudDistMoon = document.getElementById('hud-dist-moon');
const hudVelocity = document.getElementById('hud-velocity');
const hudPhase = document.getElementById('hud-phase');
const timelineSlider = document.getElementById('timeline-slider');
const timelineMetDisplay = document.getElementById('timeline-met-display');
const eventsList = document.getElementById('events-list');
const speedSelect = document.getElementById('speed-select');
const btnPlayPause = document.getElementById('btn-playpause');
const crewTooltip = document.getElementById('crew-tooltip');
const crewListEl = document.getElementById('crew-list');

// ——— THREE.js setup ———
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('space-canvas'),
  antialias: true,
  alpha: false,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10000);
camera.position.set(0, 80, 200);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 10;
controls.maxDistance = 1200;
controls.zoomSpeed = 1.2;

// ——— STARFIELD ———
function createStarfield() {
  const starCount = 8000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const r = 800 + Math.random() * 200;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.5 + Math.random() * 1.5;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.8,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });
  const stars = new THREE.Points(geo, mat);
  scene.add(stars);
  return stars;
}

// ——— EARTH ———
function createEarth() {
  const geo = new THREE.SphereGeometry(EARTH_R, 64, 64);

  // Procedural Earth texture
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base ocean blue
  ctx.fillStyle = '#1a4f8a';
  ctx.fillRect(0, 0, 1024, 512);

  // Simplified continent shapes
  const drawContinent = (path, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    path.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
    ctx.closePath();
    ctx.fill();
  };

  // Americas
  drawContinent([
    [150,80],[200,70],[220,100],[240,120],[230,160],[250,200],
    [240,260],[220,300],[200,340],[180,360],[160,340],[150,300],
    [140,260],[130,200],[120,160],[130,120],[140,100]
  ], '#2d8a3e');

  // Europe/Africa
  drawContinent([
    [450,60],[510,55],[530,80],[540,100],[520,140],[500,160],
    [480,200],[490,240],[510,280],[530,340],[520,400],[500,440],
    [480,460],[460,440],[450,400],[430,360],[420,300],[410,240],
    [420,180],[430,140],[440,100],[445,75]
  ], '#2d8a3e');

  // Asia
  drawContinent([
    [560,50],[700,40],[820,60],[880,80],[900,120],[880,160],
    [840,180],[820,200],[780,220],[750,240],[720,230],[700,210],
    [680,230],[650,240],[620,220],[590,200],[570,170],[550,140],
    [540,110],[545,80]
  ], '#2d8a3e');

  // Australia
  drawContinent([
    [720,310],[780,300],[820,310],[840,340],[830,370],[800,390],
    [760,395],[730,380],[710,355],[710,330]
  ], '#8a6a2d');

  // Ice caps
  ctx.fillStyle = '#e8f4f8';
  ctx.fillRect(0, 0, 1024, 30);
  ctx.fillRect(0, 490, 1024, 22);

  // Cloud layer (semi-transparent white swirls)
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * 1024;
    const cy = Math.random() * 512;
    const rx = 40 + Math.random() * 80;
    const ry = 10 + Math.random() * 20;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshPhongMaterial({
    map: texture,
    shininess: 15,
    specular: new THREE.Color(0x224466),
  });

  const earth = new THREE.Mesh(geo, mat);
  scene.add(earth);

  // Troposphere — innermost warm haze
  const tropoGeo = new THREE.SphereGeometry(EARTH_R * 1.02, 64, 64);
  const tropoMat = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.08,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(tropoGeo, tropoMat));

  // Stratosphere — main blue glow
  const stratGeo = new THREE.SphereGeometry(EARTH_R * 1.06, 64, 64);
  const stratMat = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(stratGeo, stratMat));

  // Mesosphere — outer rim backlit
  const mesoGeo = new THREE.SphereGeometry(EARTH_R * 1.12, 64, 64);
  const mesoMat = new THREE.MeshBasicMaterial({
    color: 0x2255cc,
    transparent: true,
    opacity: 0.06,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(mesoGeo, mesoMat));

  // Exosphere — diffuse outer halo
  const exoGeo = new THREE.SphereGeometry(EARTH_R * 1.22, 64, 64);
  const exoMat = new THREE.MeshBasicMaterial({
    color: 0x112244,
    transparent: true,
    opacity: 0.03,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  scene.add(new THREE.Mesh(exoGeo, exoMat));

  return earth;
}

// ——— MOON ———
function createMoon() {
  const geo = new THREE.SphereGeometry(MOON_R, 48, 48);

  // Procedural moon texture (grey with craters)
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(0, 0, 512, 256);

  // Add surface variation
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 1 + Math.random() * 8;
    const brightness = 100 + Math.floor(Math.random() * 80);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Craters
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 5 + Math.random() * 20;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(60,60,60,0.3)`;
    ctx.fill();
    // Crater rim highlight
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, r * 0.95, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  }

  // Mare (dark regions)
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    ctx.fillStyle = '#5a5a5a';
    ctx.beginPath();
    ctx.ellipse(x, y, 30 + Math.random() * 50, 20 + Math.random() * 30, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.MeshPhongMaterial({
    map: texture,
    shininess: 5,
    color: 0xcccccc,
  });

  const moon = new THREE.Mesh(geo, mat);
  moon.position.set(EARTH_MOON_DIST, 0, 0);
  scene.add(moon);
  return moon;
}

// ——— SUN ———
function createSun() {
  // Directional light from the Sun
  const sunLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
  sunLight.position.set(500, 100, 300);
  scene.add(sunLight);

  // Ambient light (very dim — space)
  const ambient = new THREE.AmbientLight(0x111122, 0.3);
  scene.add(ambient);

  // Sun sphere (distant visual)
  const sunGeo = new THREE.SphereGeometry(15, 16, 16);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
  const sun = new THREE.Mesh(sunGeo, sunMat);
  sun.position.set(600, 80, 200);

  // Sun glow
  const glowGeo = new THREE.SphereGeometry(18, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.2,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  sun.add(glow);
  scene.add(sun);

  return { sunLight, sun };
}

// ——— ORION SPACECRAFT ———
function createOrion() {
  const group = new THREE.Group();
  const SCALE = 0.8; // visual scale - exaggerated 500x real

  // Crew Module (cone)
  const cmGeo = new THREE.ConeGeometry(0.4 * SCALE, 0.8 * SCALE, 16);
  const cmMat = new THREE.MeshPhongMaterial({ color: 0xcccccc, shininess: 80 });
  const cm = new THREE.Mesh(cmGeo, cmMat);
  cm.position.y = 0.9 * SCALE;
  cm.rotation.z = Math.PI;
  group.add(cm);

  // Service Module (cylinder)
  const smGeo = new THREE.CylinderGeometry(0.35 * SCALE, 0.35 * SCALE, 1.2 * SCALE, 16);
  const smMat = new THREE.MeshPhongMaterial({ color: 0x8899aa, shininess: 40 });
  const sm = new THREE.Mesh(smGeo, smMat);
  sm.position.y = -0.2 * SCALE;
  group.add(sm);

  // Solar panels (flat rectangles)
  const panelMat = new THREE.MeshPhongMaterial({ color: 0x1144aa, shininess: 30, side: THREE.DoubleSide });
  [-1, 1].forEach(side => {
    const panelGeo = new THREE.BoxGeometry(1.8 * SCALE, 0.02 * SCALE, 0.5 * SCALE);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(side * 1.3 * SCALE, -0.2 * SCALE, 0);
    // Panel cell lines
    group.add(panel);
  });

  // Engine nozzle
  const nozzleGeo = new THREE.CylinderGeometry(0.1 * SCALE, 0.2 * SCALE, 0.3 * SCALE, 8);
  const nozzleMat = new THREE.MeshPhongMaterial({ color: 0x555566 });
  const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
  nozzle.position.y = -0.95 * SCALE;
  group.add(nozzle);

  // Marker light (always visible beacon)
  const markerGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0xff8800,
    transparent: true,
    opacity: 0.9,
  });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  group.add(marker);

  // Point light to make Orion glow
  const light = new THREE.PointLight(0xff8844, 2, 8);
  group.add(light);

  scene.add(group);
  return group;
}

// ——— TRAJECTORY LINE ———
function createTrajectoryLine(trajectoryData) {
  const points = trajectoryData.map(p => new THREE.Vector3(p.x, p.y, p.z));

  // Full trajectory (dim)
  const futureGeo = new THREE.BufferGeometry().setFromPoints(points);
  const futureMat = new THREE.LineBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.15,
  });
  const futureLine = new THREE.Line(futureGeo, futureMat);
  scene.add(futureLine);

  // Traversed (solid green) — will be updated each frame
  const traversedPoints = [points[0], points[0]];
  const traversedGeo = new THREE.BufferGeometry().setFromPoints(traversedPoints);
  const traversedMat = new THREE.LineBasicMaterial({ color: 0x00ff88 });
  const traversedLine = new THREE.Line(traversedGeo, traversedMat);
  scene.add(traversedLine);

  // Current segment (orange)
  const currentPoints = [points[0], points[0]];
  const currentGeo = new THREE.BufferGeometry().setFromPoints(currentPoints);
  const currentMat = new THREE.LineBasicMaterial({ color: 0xff8800, linewidth: 2 });
  const currentLine = new THREE.Line(currentGeo, currentMat);
  scene.add(currentLine);

  return { futureLine, traversedLine, currentLine, points };
}

// Update trajectory rendering based on current MET
function updateTrajectoryLines(lines, trajectoryData, met) {
  const totalMet = trajectoryData[trajectoryData.length - 1].met;
  const progress = met / totalMet;
  const totalPoints = lines.points.length;
  const currentIdx = Math.min(Math.floor(progress * totalPoints), totalPoints - 2);

  // Traversed portion
  if (currentIdx > 0) {
    const tPoints = lines.points.slice(0, currentIdx + 1);
    lines.traversedLine.geometry.setFromPoints(tPoints);
  }

  // Current segment (small chunk around current position)
  const segStart = Math.max(0, currentIdx - 3);
  const segEnd = Math.min(totalPoints - 1, currentIdx + 3);
  const cPoints = lines.points.slice(segStart, segEnd + 1);
  lines.currentLine.geometry.setFromPoints(cPoints.length > 1 ? cPoints : [lines.points[0], lines.points[1]]);
}

// ——— CAMERA PRESETS ———
let cameraTarget = null;
let cameraMode = 'overview';

function setCameraPreset(mode) {
  cameraMode = mode;
  document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-cam="${mode}"]`)?.classList.add('active');
  cameraTarget = null;

  if (mode === 'earth') {
    // Look at Earth from a medium distance
    animateCameraTo(new THREE.Vector3(0, 30, 80), new THREE.Vector3(0, 0, 0));
  } else if (mode === 'moon') {
    const moonPos = moonRef.position;
    animateCameraTo(
      new THREE.Vector3(moonPos.x - 20, moonPos.y + 15, moonPos.z + 30),
      moonPos.clone()
    );
  } else if (mode === 'follow') {
    cameraTarget = 'follow';
  } else if (mode === 'overview') {
    animateCameraTo(new THREE.Vector3(200, 150, 400), new THREE.Vector3(0, 0, 0));
  } else if (mode === 'earthrise') {
    // Behind the Moon, looking back at Earth
    const moonPos = moonRef.position;
    animateCameraTo(
      new THREE.Vector3(moonPos.x + 15, moonPos.y + 5, moonPos.z + 8),
      new THREE.Vector3(0, 0, 0)
    );
  }
}

let camAnimating = false;
let camAnimStart, camAnimEnd, camLookStart, camLookEnd, camAnimT = 0;

function animateCameraTo(targetPos, lookAt) {
  camAnimating = true;
  camAnimT = 0;
  camAnimStart = camera.position.clone();
  camAnimEnd = targetPos;
  camLookStart = controls.target.clone();
  camLookEnd = lookAt;
}

function tickCameraAnimation(dt) {
  if (!camAnimating) return;
  camAnimT = Math.min(camAnimT + dt * 1.2, 1);
  const ease = 1 - Math.pow(1 - camAnimT, 3);
  camera.position.lerpVectors(camAnimStart, camAnimEnd, ease);
  controls.target.lerpVectors(camLookStart, camLookEnd, ease);
  if (camAnimT >= 1) camAnimating = false;
}

// ——— Utility: interpolate trajectory at MET ———
function getPositionAtMET(met) {
  if (!trajectory.length) return { x: 0, y: 0, z: EARTH_R };
  const last = trajectory[trajectory.length - 1];
  if (met <= trajectory[0].met) return trajectory[0];
  if (met >= last.met) return last;

  let lo = 0, hi = trajectory.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (trajectory[mid].met <= met) lo = mid;
    else hi = mid;
  }
  const a = trajectory[lo], b = trajectory[hi];
  const t = (met - a.met) / (b.met - a.met);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    dist_earth: a.dist_earth + (b.dist_earth - a.dist_earth) * t,
    dist_moon: a.dist_moon + (b.dist_moon - a.dist_moon) * t,
    velocity: a.velocity + (b.velocity - a.velocity) * t,
    phase: a.phase,
  };
}

function formatMET(seconds) {
  const s = Math.floor(Math.abs(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `T+ ${String(d).padStart(3,'0')}:${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

function formatNum(n, decimals = 0) {
  return Math.round(n).toLocaleString('en-US');
}

// ——— Moon position (visual orbit) ———
function getMoonOrbitPosition(met) {
  const PERIOD = 27.3 * 86400;
  const angle = (met / PERIOD) * Math.PI * 2;
  return new THREE.Vector3(
    EARTH_MOON_DIST * Math.cos(angle),
    0,
    EARTH_MOON_DIST * Math.sin(angle)
  );
}

// ——— Update HUD ———
function updateHUD(point) {
  if (!point) return;
  hudMet.textContent = formatMET(currentMET);
  hudDistEarth.textContent = `${formatNum(point.dist_earth * 1000)} km`;
  hudDistMoon.textContent = `${formatNum(point.dist_moon * 1000)} km`;
  hudVelocity.textContent = `${formatNum(point.velocity)} km/h`;
  hudPhase.textContent = point.phase || '—';
  // Nota: los textos del HUD vienen del HTML traducido
  timelineMetDisplay.textContent = formatMET(currentMET);

  // Update slider progress gradient
  const pct = (currentMET / TOTAL_MET) * 100;
  timelineSlider.style.setProperty('--progress', `${pct}%`);
  timelineSlider.value = currentMET;
}

// ——— Events panel ———
function buildEventsPanel() {
  eventsList.innerHTML = '';
  events.forEach(ev => {
    const group = phaseGroup(ev.phase);
    const color = PHASE_COLORS[group];
    const label = PHASE_LABELS[group];
    const div = document.createElement('div');
    div.className = 'event-item';
    div.dataset.met = ev.met;
    div.dataset.phaseGroup = group;
    div.style.setProperty('--phase-color', color);
    const header = document.createElement('div');
    header.className = 'event-header';

    const icon = document.createElement('span');
    icon.className = 'event-icon';
    icon.textContent = ev.icon;

    const title = document.createElement('span');
    title.className = 'event-title';
    title.textContent = ev.title;

    const badge = document.createElement('span');
    badge.className = 'event-phase-badge';
    badge.textContent = label;

    header.appendChild(icon);
    header.appendChild(title);
    header.appendChild(badge);

    const metEl = document.createElement('div');
    metEl.className = 'event-met';
    metEl.textContent = `MET ${ev.metFormatted}`;

    const desc = document.createElement('div');
    desc.className = 'event-desc';
    desc.textContent = ev.description;

    div.appendChild(header);
    div.appendChild(metEl);
    div.appendChild(desc);
    div.addEventListener('click', () => {
      currentMET = ev.met;
      div.classList.toggle('expanded');
    });
    eventsList.appendChild(div);
  });
}

function updateEventsHighlight(met) {
  let closestIdx = 0;
  let closestDist = Infinity;
  events.forEach((ev, i) => {
    const d = Math.abs(ev.met - met);
    if (d < closestDist) { closestDist = d; closestIdx = i; }
  });

  const items = eventsList.querySelectorAll('.event-item');
  items.forEach((item, i) => {
    item.classList.remove('current', 'past');
    if (i === closestIdx) {
      item.classList.add('current');
    } else if (events[i].met < met) {
      item.classList.add('past');
    }
  });

  // Auto-scroll to current event
  const current = eventsList.querySelector('.event-item.current');
  if (current) {
    current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// ——— Build timeline markers ———
function buildTimelineMarkers() {
  const container = document.getElementById('timeline-events-markers');
  container.innerHTML = '';
  events.forEach(ev => {
    const pct = (ev.met / TOTAL_MET) * 100;
    const group = phaseGroup(ev.phase);
    const color = PHASE_COLORS[group];
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.style.left = `${pct}%`;
    marker.style.setProperty('--phase-color', color);
    marker.title = `${ev.title} · ${ev.phase}`;
    const dot = document.createElement('div');
    dot.className = 'timeline-marker-dot';

    const markerLabel = document.createElement('div');
    markerLabel.className = 'timeline-marker-label';
    markerLabel.textContent = ev.icon;

    marker.appendChild(dot);
    marker.appendChild(markerLabel);
    marker.addEventListener('click', () => { currentMET = ev.met; });
    container.appendChild(marker);
  });
}

// ——— Crew tooltip ———
function buildCrewTooltip() {
  const close = document.createElement('button');
  close.className = 'crew-close';
  close.textContent = '✕';
  close.title = 'Cerrar';
  close.onclick = () => crewTooltip.classList.remove('visible');
  crewTooltip.appendChild(close);

  crew.forEach(member => {
    const avatars = ['👨‍🚀', '👨🏾‍🚀', '👩‍🚀', '👨🏻‍🚀'];
    const idx = crew.indexOf(member);
    const div = document.createElement('div');
    div.className = 'crew-member';
    const avatar = document.createElement('div');
    avatar.className = 'crew-avatar';
    avatar.textContent = avatars[idx] || '🧑‍🚀';

    const info = document.createElement('div');
    info.className = 'crew-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'crew-name';
    nameEl.textContent = member.name;

    const roleEl = document.createElement('div');
    roleEl.className = 'crew-role';
    roleEl.textContent = member.role;

    const agencyEl = document.createElement('div');
    agencyEl.className = 'crew-agency';
    agencyEl.textContent = member.agency;

    const bioEl = document.createElement('div');
    bioEl.className = 'crew-bio';
    bioEl.textContent = member.bio;

    info.appendChild(nameEl);
    info.appendChild(roleEl);
    info.appendChild(agencyEl);
    info.appendChild(bioEl);

    div.appendChild(avatar);
    div.appendChild(info);
    crewListEl.appendChild(div);
  });
}

// ——— Click on Orion (raycasting) ———
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function onCanvasClick(event) {
  if (event.target !== renderer.domElement) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  if (!orionRef) return;

  const box = new THREE.Box3().setFromObject(orionRef);
  box.expandByScalar(2); // make click target larger

  if (raycaster.ray.intersectsBox(box)) {
    crewTooltip.classList.add('visible');
  }
}
document.addEventListener('click', onCanvasClick);

// ——— Scene objects (set after init) ———
let earthRef, moonRef, orionRef, trajectoryLines, starsRef;

// ——— Phase group helper ———
function phaseGroup(phase) {
  if (!phase) return 'transit';
  const p = phase.toUpperCase();
  if (['LANZAMIENTO', 'ASCENSO', 'ÓRBITA DE ESTACIONAMIENTO'].includes(p)) return 'launch';
  if (['VUELO DE IDA', 'VUELO DE CRUCERO', 'TRANS-LUNAR'].includes(p)) return 'transit';
  if ([
    'ESFERA DE INFLUENCIA LUNAR', 'OBSERVACIÓN LUNAR',
    'SOBREVUELO LUNAR', 'ADQUISICIÓN DE SEÑAL', 'ECLIPSE SOLAR',
  ].includes(p)) return 'lunar';
  if ([
    'VUELO DE REGRESO', 'APROXIMACIÓN FINAL',
    'REENTRADA', 'AMERIZAJE',
  ].includes(p)) return 'return';
  return 'transit';
}

const PHASE_COLORS = {
  launch:  'var(--phase-launch)',
  transit: 'var(--phase-transit)',
  lunar:   'var(--phase-lunar)',
  return:  'var(--phase-return)',
};

const PHASE_LABELS = {
  launch:  'ASCENSO',
  transit: 'TRÁNSITO',
  lunar:   'LUNAR',
  return:  'RETORNO',
};

// ——— MAIN INIT ———
async function init() {
  const loading = document.createElement('div');
  loading.id = 'loading-screen';
  loading.innerHTML = `
    <div class="loading-inner">
      <div class="loading-eyebrow">NASA · ESA · CSA · 2026</div>
      <h1 class="loading-title">ARTEMIS II</h1>
      <p class="loading-vehicle">ORION MULTI-PURPOSE CREW VEHICLE</p>
      <p class="loading-subtitle">SISTEMA DE SEGUIMIENTO DE MISIÓN</p>
      <div class="loading-divider"></div>
      <div class="loading-steps">
        <div class="loading-step step-active" id="step-conn">
          <span class="step-indicator"></span>
          <span class="step-label">CONECTANDO CON SERVIDORES</span>
          <span class="step-dots"></span>
          <span class="step-status">···</span>
        </div>
        <div class="loading-step" id="step-traj">
          <span class="step-indicator"></span>
          <span class="step-label">DATOS DE TRAYECTORIA</span>
          <span class="step-dots"></span>
          <span class="step-status">···</span>
        </div>
        <div class="loading-step" id="step-events">
          <span class="step-indicator"></span>
          <span class="step-label">EVENTOS DE MISIÓN</span>
          <span class="step-dots"></span>
          <span class="step-status">···</span>
        </div>
        <div class="loading-step" id="step-crew">
          <span class="step-indicator"></span>
          <span class="step-label">DATOS DE TRIPULACIÓN</span>
          <span class="step-dots"></span>
          <span class="step-status">···</span>
        </div>
        <div class="loading-step" id="step-scene">
          <span class="step-indicator"></span>
          <span class="step-label">ESCENA 3D</span>
          <span class="step-dots"></span>
          <span class="step-status">···</span>
        </div>
        <div class="loading-step" id="step-ui">
          <span class="step-indicator"></span>
          <span class="step-label">INTERFAZ DE CONTROL</span>
          <span class="step-dots"></span>
          <span class="step-status">···</span>
        </div>
      </div>
      <div class="loading-progress-row">
        <div class="loading-bar-wrap"><div class="loading-bar" id="load-bar"></div></div>
        <span class="loading-pct" id="load-pct">0%</span>
      </div>
      <div class="loading-pct-row">
        <span class="loading-date">MISIÓN INICIADA · 01 ABR 2026 · 06:50 UTC</span>
      </div>
    </div>
  `;
  document.body.appendChild(loading);

  const loadBar = document.getElementById('load-bar');
  const loadPct = document.getElementById('load-pct');

  const setProgress = (p) => {
    loadBar.style.width = `${p}%`;
    loadPct.textContent = `${Math.round(p)}%`;
  };

  const activateStep = (id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add('step-active');
  };

  const completeStep = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('step-active');
    el.classList.add('step-done');
    el.querySelector('.step-status').textContent = 'OK';
  };

  try {
    setProgress(5);
    completeStep('step-conn');
    activateStep('step-traj');
    setProgress(12);

    const [trajRes, eventsRes, crewRes] = await Promise.all([
      fetch('/api/trajectory'),
      fetch('/api/events'),
      fetch('/api/crew'),
    ]);

    trajectory = await trajRes.json();
    completeStep('step-traj');
    activateStep('step-events');
    setProgress(35);

    events = await eventsRes.json();
    completeStep('step-events');
    activateStep('step-crew');
    setProgress(50);

    crew = await crewRes.json();
    completeStep('step-crew');
    activateStep('step-scene');
    setProgress(62);

    starsRef = createStarfield();
    earthRef = createEarth();
    moonRef = createMoon();
    createSun();
    orionRef = createOrion();
    trajectoryLines = createTrajectoryLine(trajectory);
    completeStep('step-scene');
    activateStep('step-ui');
    setProgress(84);

    buildEventsPanel();
    buildTimelineMarkers();
    buildCrewTooltip();
    setupControls();
    setCameraPreset('overview');
    completeStep('step-ui');
    setProgress(100);

    setTimeout(() => {
      loading.classList.add('loading-fade-out');
      setTimeout(() => loading.remove(), 500);
    }, 700);

    requestAnimationFrame(animate);

  } catch (err) {
    const inner = loading.querySelector('.loading-inner');
    if (inner) {
      inner.textContent = '';

      const errTitle = document.createElement('div');
      errTitle.className = 'loading-error';
      errTitle.textContent = 'ERROR DE CONEXIÓN';

      const errMsg = document.createElement('div');
      errMsg.className = 'loading-error-msg';
      errMsg.textContent = err.message;

      const errHint = document.createElement('div');
      errHint.className = 'loading-error-hint';
      errHint.textContent = 'Verifica que el servidor esté activo en puerto 3000';

      inner.appendChild(errTitle);
      inner.appendChild(errMsg);
      inner.appendChild(errHint);
    }
  }
}

// ——— Controls setup ———
function setupControls() {
  // Timeline slider
  timelineSlider.addEventListener('input', () => {
    currentMET = parseFloat(timelineSlider.value);
  });

  // Play/Pause
  btnPlayPause.addEventListener('click', () => {
    isPlaying = !isPlaying;
    btnPlayPause.textContent = isPlaying ? '⏸' : '▶';
    btnPlayPause.classList.toggle('playing', isPlaying);
    lastTimestamp = null;
  });

  // Retroceder
  document.getElementById('btn-rewind').addEventListener('click', () => {
    currentMET = Math.max(0, currentMET - 3600 * 12); // retroceder 12h
  });

  // Avanzar
  document.getElementById('btn-forward').addEventListener('click', () => {
    currentMET = Math.min(TOTAL_MET, currentMET + 3600 * 12);
  });

  // Velocidad
  speedSelect.addEventListener('change', () => {
    playSpeed = parseInt(speedSelect.value);
  });

  // Botones de cámara
  document.querySelectorAll('.cam-btn').forEach(btn => {
    btn.addEventListener('click', () => setCameraPreset(btn.dataset.cam));
  });

  // ——— Panel de eventos: plegar / desplegar ———
  const eventsPanel = document.getElementById('events-panel');
  const eventsReopenTab = document.getElementById('events-reopen-tab');

  function setEventsPanelCollapsed(collapsed) {
    eventsPanel.classList.toggle('collapsed', collapsed);
    document.getElementById('events-toggle').textContent = collapsed ? '▶' : '◀';
    eventsReopenTab.classList.toggle('visible', collapsed);
  }

  document.getElementById('events-toggle').addEventListener('click', () => {
    setEventsPanelCollapsed(!eventsPanel.classList.contains('collapsed'));
  });

  eventsReopenTab.addEventListener('click', () => {
    setEventsPanelCollapsed(false);
  });

  // ——— Panel de información / ayuda ———
  const infoPanel = document.getElementById('info-panel');
  const infoOpenBtn = document.getElementById('info-open-btn');

  function setInfoPanelVisible(visible) {
    infoPanel.classList.toggle('hidden', !visible);
    infoOpenBtn.classList.toggle('visible', !visible);
  }

  document.getElementById('info-close').addEventListener('click', () => {
    setInfoPanelVisible(false);
  });

  infoOpenBtn.addEventListener('click', () => {
    setInfoPanelVisible(true);
  });

  // Window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ——— Main animation loop ———
let earthAngle = 0;
let moonAngle = 0;

function animate(timestamp) {
  requestAnimationFrame(animate);

  const dt = lastTimestamp ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) : 0;
  lastTimestamp = timestamp;

  // Advance MET
  if (isPlaying && currentMET < TOTAL_MET) {
    currentMET += dt * playSpeed;
    currentMET = Math.min(currentMET, TOTAL_MET);
  }

  // Get current position
  const point = getPositionAtMET(currentMET);
  orionPosition.set(point.x, point.y, point.z);

  // Update spacecraft position
  if (orionRef) {
    orionRef.position.copy(orionPosition);
    orionRef.rotation.y += 0.005;
    orionRef.rotation.x = 0.1;
  }

  // Rotate Earth
  if (earthRef) {
    earthRef.rotation.y += 0.0002;
  }

  // Update Moon visual orbit
  if (moonRef) {
    const moonPos = getMoonOrbitPosition(currentMET);
    moonRef.position.copy(moonPos);
    moonRef.rotation.y += 0.0001;
  }

  // Update trajectory lines
  if (trajectoryLines) {
    updateTrajectoryLines(trajectoryLines, trajectory, currentMET);
  }

  // Camera follow mode
  if (cameraMode === 'follow' && orionRef) {
    const orionPos = orionRef.position.clone();
    const camOffset = new THREE.Vector3(-8, 3, -12);
    camera.position.lerp(orionPos.clone().add(camOffset), 0.05);
    controls.target.lerp(orionPos, 0.05);
  }

  // Camera animation
  tickCameraAnimation(dt);

  // Update HUD
  updateHUD(point);
  updateEventsHighlight(currentMET);

  controls.update();
  renderer.render(scene, camera);
}

// ——— Boot ———
init();
