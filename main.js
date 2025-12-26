import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';

// ============= SCENE SETUP =============
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(80, 50, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05;
controls.target.set(0, 15, 0);

const clock = new THREE.Clock();

// ============= NIGHT SKYBOX =============
const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath('./assets/');

const nightSky = cubeLoader.load(
    [
        'dark-s_px.jpg', 'dark-s_nx.jpg',
        'dark-s_py.jpg', 'dark-s_ny.jpg',
        'dark-s_pz.jpg', 'dark-s_nz.jpg'
    ],
    () => {
        console.log('✓ Night skybox loaded successfully');
        scene.background = nightSky;
    },
    undefined,
    (err) => {
        console.error('✗ Skybox loading error:', err);
        scene.background = new THREE.Color(0x0a0a2a);
    }
);

// ============= FOG =============
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.0008);

// ============= LIGHTS =============
// Strong Ambient Light
const ambientLight = new THREE.AmbientLight(0x5566aa, 2.5);
scene.add(ambientLight);

// Moon Light (main directional - BRIGHT)
const moonLight = new THREE.DirectionalLight(0xaabbff, 3.0);
moonLight.position.set(150, 250, 150);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 4096;
moonLight.shadow.mapSize.height = 4096;
moonLight.shadow.camera.left = -120;
moonLight.shadow.camera.right = 120;
moonLight.shadow.camera.top = 120;
moonLight.shadow.camera.bottom = -120;
moonLight.shadow.camera.near = 50;
moonLight.shadow.camera.far = 500;
moonLight.shadow.bias = -0.0005;
moonLight.shadow.normalBias = 0.02;
scene.add(moonLight);

// Additional fill light
const fillLight = new THREE.HemisphereLight(0x4455bb, 0x222244, 1.5);
scene.add(fillLight);

// ============= ISLAND =============
const islandGeometry = new THREE.CylinderGeometry(35, 40, 15, 64);
const islandMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d4d2d,
    roughness: 0.85,
    metalness: 0.05
});
const island = new THREE.Mesh(islandGeometry, islandMaterial);
island.position.y = 7.5;
island.receiveShadow = true;
island.castShadow = true;
scene.add(island);

// ============= GRASS =============
const grassMeshes = [];
const grassMat = new THREE.MeshStandardMaterial({ 
    color: 0x3d6d3d,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0.0
});

for (let i = 0; i < 1000; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.5), grassMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 32;
    blade.position.set(Math.cos(angle) * radius, 15.3, Math.sin(angle) * radius);
    blade.rotation.y = Math.random() * Math.PI * 2;
    blade.castShadow = true;
    blade.receiveShadow = true;
    scene.add(blade);
    grassMeshes.push(blade);
}

// ============= TREES =============
function createTree(x, z) {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.6, 0.8, 7, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ 
        color: 0x4a3520, 
        roughness: 0.95 
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);
    
    // Leaves
    const leavesGeo = new THREE.ConeGeometry(3.5, 9, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ 
        color: 0x2a5a2a,
        roughness: 0.9
    });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 9;
    leaves.castShadow = true;
    leaves.receiveShadow = true;
    tree.add(leaves);
    
    tree.position.set(x, 15, z);
    return tree;
}

// Place trees
const trees = [];
for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 22 + Math.random() * 8;
    const tree = createTree(Math.cos(angle) * radius, Math.sin(angle) * radius);
    scene.add(tree);
    trees.push(tree);
}

// ============= ROCKS =============
function createRock(x, z) {
    const rockGeo = new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.5, 0);
    const rockMat = new THREE.MeshStandardMaterial({ 
        color: 0x606070,
        roughness: 0.95,
        metalness: 0.05
    });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.set(x, 15.8, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    return rock;
}

// Place rocks
const rocks = [];
for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 30;
    const rock = createRock(Math.cos(angle) * radius, Math.sin(angle) * radius);
    scene.add(rock);
    rocks.push(rock);
}

// ============= CAMPFIRE =============
const fireParticles = new THREE.Group();
for (let i = 0; i < 60; i++) {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.4 + Math.random() * 0.3),
        new THREE.MeshBasicMaterial({ 
            color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.2)
        })
    );
    p.position.set((Math.random() - 0.5) * 2.5, 14 + Math.random() * 1, (Math.random() - 0.5) * 2.5);
    p.userData.velocity = 0.08 + Math.random() * 0.06;
    p.userData.startY = p.position.y;
    fireParticles.add(p);
}
scene.add(fireParticles);

const fireLight = new THREE.PointLight(0xff5522, 200, 100);
fireLight.position.set(0, 17, 0);
fireLight.castShadow = true;
fireLight.shadow.mapSize.width = 1024;
fireLight.shadow.mapSize.height = 1024;
scene.add(fireLight);

// ============= WATER (FIXED) =============
const waterGeometry = new THREE.PlaneGeometry(10000, 10000, 100, 100);
const textureLoader = new THREE.TextureLoader();

// Load water normals properly
let waterNormals = textureLoader.load(
    './assets/Water_1_M_Normal.jpg',
    (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        console.log('✓ Water normals loaded');
    },
    undefined,
    (err) => {
        console.warn('✗ Water normals not found');
    }
);
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

const water = new Water(waterGeometry, {
    textureWidth: 1024,
    textureHeight: 1024,
    waterNormals: waterNormals,
    sunDirection: new THREE.Vector3(0.7, 0.5, 0.3).normalize(),
    sunColor: 0xffffff,
    waterColor: 0x002244,
    distortionScale: 4.5,
    fog: true,
    alpha: 0.95
});
water.rotation.x = -Math.PI / 2;
water.position.y = 0;
water.material.transparent = true;
scene.add(water);

// ============= REALISTIC CLOUDS (FIXED) =============
const cloudGroup = new THREE.Group();

// Create volumetric-looking clouds using spheres
function createVolumetricCloud(x, y, z, size) {
    const cloud = new THREE.Group();
    const cloudMat = new THREE.MeshStandardMaterial({
        color: 0x8899bb,
        transparent: true,
        opacity: 0.4,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.DoubleSide
    });

    // Multiple spheres to create volume
    const spheres = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < spheres; i++) {
        const sphereGeo = new THREE.SphereGeometry(size * (0.5 + Math.random() * 0.8), 8, 8);
        const sphere = new THREE.Mesh(sphereGeo, cloudMat.clone());
        sphere.position.set(
            (Math.random() - 0.5) * size * 2,
            (Math.random() - 0.5) * size * 0.5,
            (Math.random() - 0.5) * size * 2
        );
        cloud.add(sphere);
    }
    
    cloud.position.set(x, y, z);
    cloud.userData.speed = 0.03 + Math.random() * 0.05;
    cloud.userData.wobble = Math.random() * Math.PI * 2;
    return cloud;
}

// Create clouds at various distances and heights
for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2 + Math.random();
    const distance = 150 + Math.random() * 250;
    const height = 80 + Math.random() * 40;
    const size = 8 + Math.random() * 12;
    
    const cloud = createVolumetricCloud(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance,
        size
    );
    cloudGroup.add(cloud);
}

scene.add(cloudGroup);

// ============= RAIN =============
const rainCount = 18000;
const rainGeo = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
const rainVelocities = new Float32Array(rainCount);

for (let i = 0; i < rainCount; i++) {
    const i3 = i * 3;
    rainPositions[i3] = (Math.random() - 0.5) * 1000;
    rainPositions[i3 + 1] = Math.random() * 800;
    rainPositions[i3 + 2] = (Math.random() - 0.5) * 1000;
    rainVelocities[i] = 4 + Math.random() * 2.5;
}

rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rainMat = new THREE.PointsMaterial({
    color: 0x99bbff,
    size: 0.5,
    transparent: true,
    opacity: 0.5
});
const rain = new THREE.Points(rainGeo, rainMat);
scene.add(rain);

// ============= LIGHTNING =============
const thunderFlash = new THREE.PointLight(0xffffff, 0, 2500);
thunderFlash.position.set(200, 600, 200);
scene.add(thunderFlash);

// ============= AUDIO =============
const listener = new THREE.AudioListener();
camera.add(listener);
const sound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

// Create UI indicator
const audioUI = document.createElement('div');
audioUI.style.position = 'absolute';
audioUI.style.top = '20px';
audioUI.style.left = '20px';
audioUI.style.padding = '15px 25px';
audioUI.style.background = 'rgba(0, 0, 0, 0.7)';
audioUI.style.color = 'white';
audioUI.style.fontFamily = 'Arial, sans-serif';
audioUI.style.fontSize = '16px';
audioUI.style.borderRadius = '8px';
audioUI.style.cursor = 'pointer';
audioUI.style.userSelect = 'none';
audioUI.style.zIndex = '1000';
audioUI.innerHTML = '🔊 Click to Enable Sound';
document.body.appendChild(audioUI);

let audioReady = false;

// Try multiple possible filenames
const possibleAudioFiles = [
    './assets/rain-and-thund.mp3',
    './assets/rain-and-thunder.mp3',
    './assets/rain.mp3',
    './assets/thunder.mp3'
];

let currentFileIndex = 0;

function tryLoadAudio() {
    if (currentFileIndex >= possibleAudioFiles.length) {
        console.warn('✗ No audio file found. Tried:', possibleAudioFiles);
        audioUI.innerHTML = '🔇 Audio Not Found';
        audioUI.style.background = 'rgba(100, 0, 0, 0.7)';
        return;
    }

    const audioFile = possibleAudioFiles[currentFileIndex];
    console.log('Trying to load:', audioFile);
    
    audioLoader.load(
        audioFile,
        (buffer) => {
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(0.4);
            audioReady = true;
            audioUI.innerHTML = '🔊 Click to Play Sound';
            audioUI.style.background = 'rgba(0, 100, 0, 0.7)';
            console.log('✓ Audio loaded successfully:', audioFile);
        },
        undefined,
        (err) => {
            console.warn('Failed to load:', audioFile);
            currentFileIndex++;
            tryLoadAudio();
        }
    );
}

tryLoadAudio();

// Click handler
audioUI.addEventListener('click', () => {
    if (audioReady && !sound.isPlaying) {
        sound.play();
        audioUI.innerHTML = '🔊 Sound Playing';
        audioUI.style.background = 'rgba(0, 150, 0, 0.8)';
        console.log('♪ Audio playing');
    } else if (sound.isPlaying) {
        sound.pause();
        audioUI.innerHTML = '🔊 Click to Resume';
        audioUI.style.background = 'rgba(100, 100, 0, 0.7)';
    }
});

// ============= ANIMATION LOOP =============
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();

    // Animate grass
    grassMeshes.forEach((blade, i) => {
        blade.rotation.x = Math.sin(time * 1.2 + i * 0.1) * 0.2;
    });

    // Animate trees
    trees.forEach((tree, i) => {
        tree.rotation.z = Math.sin(time * 0.5 + i) * 0.04;
    });

    // Animate clouds smoothly
    cloudGroup.children.forEach(cloud => {
        cloud.position.x += cloud.userData.speed;
        cloud.position.y += Math.sin(time * 0.3 + cloud.userData.wobble) * 0.02;
        if (cloud.position.x > 500) {
            cloud.position.x = -500;
        }
    });

    // Water animation
    water.material.uniforms['time'].value += 1.0 / 60.0;

    // Rain
    const pos = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
        const i3 = i * 3;
        pos[i3 + 1] -= rainVelocities[i];
        if (pos[i3 + 1] < 0) {
            pos[i3 + 1] = 800;
        }
    }
    rain.geometry.attributes.position.needsUpdate = true;

    // Fire animation
    fireParticles.children.forEach(p => {
        p.position.y += p.userData.velocity;
        if (p.position.y > p.userData.startY + 7) {
            p.position.y = 14;
            p.position.x = (Math.random() - 0.5) * 2.5;
            p.position.z = (Math.random() - 0.5) * 2.5;
        }
        p.material.opacity = 1 - (p.position.y - 14) / 7;
        p.scale.setScalar(0.6 + Math.random() * 0.4);
    });
    fireLight.intensity = 170 + Math.sin(time * 12) * 30;

    // Lightning
    if (Math.random() > 0.987) {
        thunderFlash.intensity = 3000 + Math.random() * 2000;
    } else {
        thunderFlash.intensity *= 0.88;
    }

    controls.update();
    renderer.render(scene, camera);
}

animate();

// ============= WINDOW RESIZE =============
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('=== CSE378 Night Storm Scene ===');
console.log('Scene ready! Click to start audio');