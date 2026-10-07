import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./style.css";

const canvas = document.querySelector("#galaxy-canvas");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 7, 10);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x090a12, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 3;
controls.maxDistance = 19;
controls.maxPolarAngle = Math.PI * 0.78;

const defaults = {
  count: 24000,
  size: 0.018,
  radius: 5,
  branches: 4,
  spin: 1.2,
  randomness: 0.25,
  insideColor: "#ff6030",
  outsideColor: "#3b5bff",
};

const controlsById = Object.fromEntries(
  ["count", "size", "radius", "branches", "spin", "randomness", "inside-color", "outside-color"]
    .map((id) => [id, document.getElementById(id)]),
);

let galaxy;
let generationTimeout;

function getParameters() {
  return {
    count: Number(controlsById.count.value),
    size: Number(controlsById.size.value),
    radius: Number(controlsById.radius.value),
    branches: Number(controlsById.branches.value),
    spin: Number(controlsById.spin.value),
    randomness: Number(controlsById.randomness.value),
    insideColor: controlsById["inside-color"].value,
    outsideColor: controlsById["outside-color"].value,
  };
}

function formatValue(id, value) {
  if (id === "count") return Number(value).toLocaleString();
  if (id === "branches") return value;
  return Number(value).toFixed(id === "size" || id === "randomness" ? 3 : 1);
}

function updateReadouts() {
  const parameters = getParameters();
  for (const id of ["count", "size", "radius", "branches", "spin", "randomness"]) {
    document.getElementById(`${id}-value`).textContent = formatValue(id, parameters[id]);
  }
  document.getElementById("particle-count").textContent =
    `${parameters.count.toLocaleString()} particles in your galaxy`;
}

function createGalaxy(parameters) {
  const positions = new Float32Array(parameters.count * 3);
  const colors = new Float32Array(parameters.count * 3);
  const insideColor = new THREE.Color(parameters.insideColor);
  const outsideColor = new THREE.Color(parameters.outsideColor);

  for (let i = 0; i < parameters.count; i += 1) {
    const i3 = i * 3;
    const branchAngle = ((i % parameters.branches) / parameters.branches) * Math.PI * 2;
    const radius = Math.random() * parameters.radius;
    const spinAngle = radius * parameters.spin;
    const randomX = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomY = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;
    const randomZ = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * parameters.randomness * radius;

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + randomX;
    positions[i3 + 1] = randomY * 0.55;
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + randomZ;

    const mixedColor = insideColor.clone().lerp(outsideColor, radius / parameters.radius);
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: parameters.size,
    sizeAttenuation: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
  });

  if (galaxy) {
    scene.remove(galaxy);
    galaxy.geometry.dispose();
    galaxy.material.dispose();
  }

  galaxy = new THREE.Points(geometry, material);
  scene.add(galaxy);
}

function scheduleGeneration() {
  updateReadouts();
  window.clearTimeout(generationTimeout);
  generationTimeout = window.setTimeout(() => createGalaxy(getParameters()), 120);
}

for (const input of Object.values(controlsById)) {
  input.addEventListener("input", scheduleGeneration);
  input.addEventListener("change", scheduleGeneration);
}

document.getElementById("generate").addEventListener("click", () => {
  createGalaxy(getParameters());
  const caption = document.getElementById("caption-text");
  caption.textContent = "A new universe, built one particle at a time.";
});

document.getElementById("randomize").addEventListener("click", () => {
  const set = (id, value) => {
    controlsById[id].value = value;
  };
  set("count", Math.round((12000 + Math.random() * 36000) / 1000) * 1000);
  set("size", (0.01 + Math.random() * 0.035).toFixed(3));
  set("radius", (3 + Math.random() * 5).toFixed(1));
  set("branches", String(Math.floor(2 + Math.random() * 6)));
  set("spin", (-1.5 + Math.random() * 3).toFixed(1));
  set("randomness", (0.1 + Math.random() * 0.75).toFixed(2));
  set("inside-color", `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`);
  set("outside-color", `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")}`);
  createGalaxy(getParameters());
  updateReadouts();
});

document.getElementById("reset").addEventListener("click", () => {
  controlsById.count.value = defaults.count;
  controlsById.size.value = defaults.size;
  controlsById.radius.value = defaults.radius;
  controlsById.branches.value = defaults.branches;
  controlsById.spin.value = defaults.spin;
  controlsById.randomness.value = defaults.randomness;
  controlsById["inside-color"].value = defaults.insideColor;
  controlsById["outside-color"].value = defaults.outsideColor;
  updateReadouts();
  createGalaxy(getParameters());
  document.getElementById("caption-text").textContent =
    "A spiral galaxy, built one particle at a time.";
});

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

window.addEventListener("resize", resize);
resize();
updateReadouts();
createGalaxy(getParameters());

function animate() {
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
}

animate();
