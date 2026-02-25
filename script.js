gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById("webgl");
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 140);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.set(0, 0.8, 10.5);

scene.add(new THREE.AmbientLight(0xa9d4ff, 0.62));
const key = new THREE.DirectionalLight(0x8ecfff, 1.0);
key.position.set(5, 6, 4);
scene.add(key);
const fill = new THREE.PointLight(0x7dffbc, 1.2, 40);
fill.position.set(-4, 2, -3);
scene.add(fill);

const starsGeo = new THREE.BufferGeometry();
const starCount = 1100;
const starPos = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i += 3) {
  starPos[i] = (Math.random() - 0.5) * 70;
  starPos[i + 1] = (Math.random() - 0.5) * 70;
  starPos[i + 2] = (Math.random() - 0.5) * 70;
}
starsGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x89b8ff, size: 0.028, transparent: true, opacity: 0.85 }));
scene.add(stars);

const root = new THREE.Group();
scene.add(root);

function makeMat(color, emissive) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emissive,
    roughness: 0.32,
    metalness: 0.48
  });
}

function createNodeVisual(kind, color, baseEmissive) {
  const group = new THREE.Group();
  const mats = [];
  const add = (geo, pos, rot, scale) => {
    const mat = makeMat(color, baseEmissive);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.rotation.set(rot.x, rot.y, rot.z);
    mesh.scale.copy(scale);
    mats.push(mat);
    group.add(mesh);
  };

  if (kind === "core") {
    add(new THREE.IcosahedronGeometry(0.85, 1), new THREE.Vector3(0, 0, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 1));
    add(new THREE.TorusGeometry(1.15, 0.05, 18, 90), new THREE.Vector3(0, 0, 0), new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(1, 1, 1));
  } else if (kind === "profile") {
    add(new THREE.SphereGeometry(0.55, 30, 30), new THREE.Vector3(0, 0, 0), new THREE.Euler(), new THREE.Vector3(1, 1.05, 1));
    add(new THREE.TorusGeometry(0.88, 0.08, 14, 60), new THREE.Vector3(0, -0.05, 0), new THREE.Euler(Math.PI / 2, 0, 0.4), new THREE.Vector3(1, 1, 1));
  } else if (kind === "cloud") {
    add(new THREE.SphereGeometry(0.42, 24, 24), new THREE.Vector3(-0.45, 0, 0), new THREE.Euler(), new THREE.Vector3(1.1, 0.95, 1));
    add(new THREE.SphereGeometry(0.52, 24, 24), new THREE.Vector3(0.05, 0.12, 0), new THREE.Euler(), new THREE.Vector3(1.2, 1.05, 1));
    add(new THREE.SphereGeometry(0.38, 24, 24), new THREE.Vector3(0.56, 0.03, 0), new THREE.Euler(), new THREE.Vector3(1.05, 0.95, 1));
    add(new THREE.SphereGeometry(0.5, 24, 24), new THREE.Vector3(0.05, -0.2, 0), new THREE.Euler(), new THREE.Vector3(1.9, 0.55, 1.25));
  } else if (kind === "shield") {
    add(new THREE.CylinderGeometry(0.45, 0.7, 0.9, 6), new THREE.Vector3(0, -0.1, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 1));
    add(new THREE.ConeGeometry(0.42, 0.56, 6), new THREE.Vector3(0, -0.82, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 1));
    add(new THREE.TorusGeometry(0.66, 0.06, 14, 54), new THREE.Vector3(0, 0.08, 0), new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(1, 1, 1));
  } else if (kind === "workflow") {
    add(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.Vector3(-0.55, 0.15, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 1));
    add(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.Vector3(0.05, -0.05, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 1));
    add(new THREE.BoxGeometry(0.42, 0.42, 0.42), new THREE.Vector3(0.65, -0.26, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 1));
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 10), new THREE.Vector3(-0.24, 0.05, 0), new THREE.Euler(0, 0, 1.2), new THREE.Vector3(1, 1, 1));
    add(new THREE.CylinderGeometry(0.06, 0.06, 0.62, 10), new THREE.Vector3(0.35, -0.16, 0), new THREE.Euler(0, 0, 1.2), new THREE.Vector3(1, 1, 1));
  } else if (kind === "connect") {
    add(new THREE.TorusGeometry(0.52, 0.12, 16, 58), new THREE.Vector3(-0.28, 0, 0), new THREE.Euler(0.85, 0.35, 0.2), new THREE.Vector3(1, 1, 1));
    add(new THREE.TorusGeometry(0.52, 0.12, 16, 58), new THREE.Vector3(0.28, 0, 0), new THREE.Euler(-0.85, -0.35, 0.2), new THREE.Vector3(1, 1, 1));
  } else if (kind === "compass") {
    add(new THREE.TorusGeometry(0.82, 0.06, 16, 70), new THREE.Vector3(0, 0, 0), new THREE.Euler(Math.PI / 2, 0, 0), new THREE.Vector3(1, 1, 1));
    add(new THREE.ConeGeometry(0.2, 0.75, 12), new THREE.Vector3(0, 0.36, 0), new THREE.Euler(0, 0, Math.PI), new THREE.Vector3(1, 1, 1));
    add(new THREE.ConeGeometry(0.16, 0.55, 12), new THREE.Vector3(0, -0.28, 0), new THREE.Euler(), new THREE.Vector3(1, 1, 1));
  }

  return { group, mats };
}

const sectionData = [
  { id: "hero", title: "Portfolio Core", desc: "Interactive 3D portfolio narrative", color: 0x7de8ff, kind: "core", pos: [0, 0.2, 0] },
  { id: "about", title: "About", desc: "AI & Cloud engineering profile", color: 0x81ffbe, kind: "profile", pos: [-2.9, 1.4, -1.2] },
  { id: "stack", title: "Stack", desc: "Three.js, GSAP, AWS, Python, Node", color: 0xffd182, kind: "cloud", pos: [2.8, 1.2, -1.1] },
  { id: "philosophy", title: "Philosophy", desc: "RiO, security-first, prevention design", color: 0xff8ca1, kind: "shield", pos: [-2.8, -1.3, 0.2] },
  { id: "projects", title: "Projects", desc: "Automation and ML delivery systems", color: 0x9f9fff, kind: "workflow", pos: [2.9, -1.3, -0.2] },
  { id: "socials", title: "Connect", desc: "GitHub, LinkedIn, email and portfolio", color: 0x84ffef, kind: "connect", pos: [0.2, 2.7, -2.1] },
  { id: "journey", title: "Journey", desc: "Architecture and distributed systems growth", color: 0xc8ff7f, kind: "compass", pos: [0, -2.8, -2.0] }
];

const nodes = [];
const clickable = [];
const sectionMap = {};

sectionData.forEach((item, i) => {
  const baseEmissive = i === 0 ? 0.7 : 0.28;
  const visual = createNodeVisual(item.kind, item.color, baseEmissive);
  const mesh = visual.group;
  mesh.position.set(item.pos[0], item.pos[1], item.pos[2]);
  mesh.scale.setScalar(i === 0 ? 1 : 0.001);
  mesh.userData = { ...item, nodeId: item.id, baseEmissive, spin: 0.003 + i * 0.0006, basePos: mesh.position.clone(), mats: visual.mats };

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.16, 0.024, 12, 72),
    new THREE.MeshBasicMaterial({ color: item.color, transparent: true, opacity: i === 0 ? 0.52 : 0.02 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.copy(mesh.position);
  ring.scale.setScalar(i === 0 ? 1 : 0.001);

  root.add(mesh, ring);
  nodes.push({ mesh, ring, section: item.id });
  clickable.push(mesh);
  sectionMap[item.id] = { mesh, ring, data: item };
});

const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hovered = null;
let cinematic = true;
let parallax = { x: 0, y: 0 };

const infoCard = document.getElementById("infoCard");
const cardTitle = document.getElementById("cardTitle");
const cardBody = document.getElementById("cardBody");
const statusTitle = document.getElementById("statusTitle");
const statusDesc = document.getElementById("statusDesc");

function setActiveNav(id) {
  document.querySelectorAll(".dot-nav button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === id);
  });
}

function setNodeEmissive(nodeGroup, value) {
  nodeGroup.userData.mats.forEach((mat) => {
    mat.emissiveIntensity = value;
  });
}

function getNodeGroup(object) {
  let ref = object;
  while (ref) {
    if (ref.userData && ref.userData.nodeId) {
      return ref;
    }
    ref = ref.parent;
  }
  return null;
}

function focusSection(id) {
  const node = sectionMap[id];
  if (!node) {
    return;
  }

  statusTitle.textContent = node.data.title;
  statusDesc.textContent = node.data.desc;
  setActiveNav(id);

  node.mesh.userData.mats.forEach((mat) => {
    gsap.to(mat, { emissiveIntensity: 1.1, duration: 0.25, yoyo: true, repeat: 1 });
  });
}

document.querySelectorAll(".dot-nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById(btn.dataset.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  parallax = { x: pointer.x * 0.18, y: pointer.y * 0.12 };
});

window.addEventListener("click", () => {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, true)[0];
  if (!hit) {
    infoCard.classList.add("hidden");
    return;
  }

  const nodeGroup = getNodeGroup(hit.object);
  if (!nodeGroup) {
    return;
  }
  const id = nodeGroup.userData.id;
  cardTitle.textContent = nodeGroup.userData.title;
  cardBody.textContent = nodeGroup.userData.desc;
  infoCard.classList.remove("hidden");

  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "v") {
    cinematic = !cinematic;
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const camTimeline = gsap.timeline({
  scrollTrigger: {
    trigger: "main",
    start: "top top",
    end: "bottom bottom",
    scrub: true
  }
});

camTimeline
  .to(camera.position, { x: -1.6, y: 1.5, z: 8.8, duration: 1 })
  .to(camera.position, { x: 1.9, y: 1.1, z: 7.8, duration: 1 })
  .to(camera.position, { x: 2.7, y: -0.8, z: 7.1, duration: 1 })
  .to(camera.position, { x: -2.5, y: -1.4, z: 7.3, duration: 1 })
  .to(camera.position, { x: 0, y: 0.3, z: 6.6, duration: 1.2 });

sectionData.forEach((item, idx) => {
  const node = sectionMap[item.id];

  ScrollTrigger.create({
    trigger: `#${item.id}`,
    start: "top 70%",
    onEnter: () => {
      focusSection(item.id);
      gsap.to(node.mesh.scale, { x: 1, y: 1, z: 1, duration: 0.95, ease: "back.out(1.6)" });
      gsap.to(node.ring.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: "power3.out" });
      gsap.to(node.ring.material, { opacity: 0.56, duration: 0.4 });
    },
    onLeaveBack: () => {
      if (idx === 0) {
        return;
      }
      gsap.to(node.mesh.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35 });
      gsap.to(node.ring.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.35 });
      gsap.to(node.ring.material, { opacity: 0.02, duration: 0.25 });
    }
  });

  ScrollTrigger.create({
    trigger: `#${item.id}`,
    start: "top 55%",
    end: "bottom 45%",
    scrub: true,
    onUpdate: (self) => {
      setNodeEmissive(node.mesh, node.mesh.userData.baseEmissive + self.progress * 0.78);
      node.ring.material.opacity = 0.2 + self.progress * 0.52;
    }
  });
});

if (window.location.hash === "#debug") {
  scene.add(new THREE.AxesHelper(4));
}

const clock = new THREE.Clock();

function animate() {
  const t = clock.getElapsedTime();

  root.rotation.y = t * 0.055;
  stars.rotation.y = t * 0.012;
  stars.rotation.x = t * 0.008;

  nodes.forEach((node, i) => {
    const mesh = node.mesh;
    mesh.rotation.x += mesh.userData.spin * 0.6;
    mesh.rotation.y += mesh.userData.spin * 1.32;
    const bob = Math.sin(t * 1.2 + i * 0.95) * 0.08;
    mesh.position.y = mesh.userData.basePos.y + bob;
    node.ring.position.y = mesh.position.y;
  });

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(clickable, true)[0];
  document.body.style.cursor = hit ? "pointer" : "default";

  if (hovered && (!hit || hovered !== hit.object)) {
    const oldNode = getNodeGroup(hovered);
    if (oldNode) {
      setNodeEmissive(oldNode, oldNode.userData.baseEmissive);
    }
    hovered = null;
  }
  if (hit) {
    const hoverNode = getNodeGroup(hit.object);
    hovered = hit.object;
    if (hoverNode) {
      setNodeEmissive(hoverNode, 1.25);
    }
  }

  if (cinematic) {
    camera.lookAt(parallax.x, parallax.y, 0);
  } else {
    camera.lookAt(pointer.x * 2.5, pointer.y * 1.8, 0);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

focusSection("hero");
animate();
