import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';

// --- CORE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(100, 80, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
const clock = new THREE.Clock();

// --- 1. MOODY SKYBOX [cite: 6] ---
const loader = new THREE.CubeTextureLoader();
scene.background = loader.setPath('assets/').load([
    'dark-s_px.jpg', 'dark-s_nx.jpg', 'dark-s_py.jpg', 
    'dark-s_ny.jpg', 'dark-s_pz.jpg', 'dark-s_nz.jpg'
]); // Using your dark-s assets

// --- 2. VIBRANT EMERALD ISLAND  ---
const islandGeometry = new THREE.CylinderGeometry(35, 40, 15, 64);
const islandMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x006400, // Deep Jungle Green
    roughness: 0.6,
    metalness: 0.1
});
const island = new THREE.Mesh(islandGeometry, islandMaterial);
island.position.y = 5;
island.receiveShadow = true;
scene.add(island);

// Procedural Lush Grass (High Density)
const grassMeshes = [];
const grassMat = new THREE.MeshBasicMaterial({ color: 0x32CD32, side: THREE.DoubleSide }); // Bright Lime Green
for(let i=0; i<1500; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2), grassMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 32;
    blade.position.set(Math.cos(angle)*radius, 12.5, Math.sin(angle)*radius);
    scene.add(blade);
    grassMeshes.push(blade);
}

// --- 3. COLORED NEON RAIN  ---
const rainCount = 25000;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(rainCount * 3);
for(let i=0; i < rainCount * 3; i+=3) {
    rainPos[i] = Math.random() * 1000 - 500;
    rainPos[i+1] = Math.random() * 800;
    rainPos[i+2] = Math.random() * 1000 - 500;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
// Colored the rain to a glowing Cyan/Blue
const rainMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.2, transparent: true, opacity: 0.6 });
const rain = new THREE.Points(rainGeo, rainMat);
scene.add(rain);

// --- 4. MOVING FIRE SYSTEM [cite: 14] ---
const fireParticles = new THREE.Group();
for(let i=0; i<50; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0xff4500 }));
    p.position.set(Math.random()-0.5, 13, Math.random()-0.5);
    fireParticles.add(p);
}
scene.add(fireParticles);
const fireLight = new THREE.PointLight(0xff4500, 50, 50); // Fire light effect [cite: 7]
fireLight.position.set(0, 15, 0);
scene.add(fireLight);

// --- 5. STORM WATER [cite: 5] ---
const water = new Water(new THREE.PlaneGeometry(10000, 10000), {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: new THREE.TextureLoader().load('assets/Water_1_M_Normal.jpg', (t) => t.wrapS = t.wrapT = THREE.RepeatWrapping),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 8.0, 
});
water.rotation.x = -Math.PI / 2;
scene.add(water);

// --- 6. LIGHTNING & FOG [cite: 11, 12] ---
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.002);
const thunderFlash = new THREE.PointLight(0xffffff, 0, 2000);
thunderFlash.position.set(100, 500, 100);
scene.add(thunderFlash);

// --- ANIMATION ---
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    // 1. Vibrant Grass Wind 
    grassMeshes.forEach((g, i) => {
        g.rotation.x = Math.sin(time * 2 + i) * 0.3;
    });

    // 2. Colored Rain Movement
    const rainPositions = rain.geometry.attributes.position.array;
    for(let i=1; i < rainPositions.length; i+=3) {
        rainPositions[i] -= 5.0; // Faster storm rain
        if(rainPositions[i] < 0) rainPositions[i] = 800;
    }
    rain.geometry.attributes.position.needsUpdate = true;

    // 3. Fire Flicker [cite: 14]
    fireParticles.children.forEach(p => {
        p.position.y += 0.1;
        if(p.position.y > 18) p.position.y = 13;
        p.scale.setScalar(Math.random());
    });
    fireLight.intensity = 40 + Math.random() * 20;

    // 4. Random Thunder 
    if (Math.random() > 0.99) {
        thunderFlash.intensity = 2000;
    } else {
        thunderFlash.intensity *= 0.95;
    }

    water.material.uniforms['time'].value += 1.0 / 60.0;
    controls.update();
    renderer.render(scene, camera);
}
animate();