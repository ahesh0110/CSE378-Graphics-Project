import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

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
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ============= GAME STATE =============
let gameStarted = false;
let gamePaused = false;
let playerBoat = null;
let hasCoin = false;
let selectedObject = null;
const interactiveObjects = [];
const AcquiredObjects = [];
const collisionBoxes = [];

// ============= SKYBOX (Day/Night) =============
const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath('./assets/');
let isNightMode = true;

const nightSky = cubeLoader.load([
    'dark-s_px.jpg', 'dark-s_nx.jpg',
    'dark-s_py.jpg', 'dark-s_ny.jpg',
    'dark-s_pz.jpg', 'dark-s_nz.jpg'
], () => { scene.background = nightSky; });

// Day sky (procedural gradient)
const daySkyCanvas = document.createElement('canvas');
daySkyCanvas.width = 512;
daySkyCanvas.height = 512;
const ctx = daySkyCanvas.getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 512);
gradient.addColorStop(0, '#1e90ff');
gradient.addColorStop(0.5, '#87ceeb');
gradient.addColorStop(1, '#b0e0e6');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 512, 512);
const daySkyTexture = new THREE.CanvasTexture(daySkyCanvas);

function toggleDayNight() {
    isNightMode = !isNightMode;
    if (isNightMode) {
        scene.background = nightSky;
        scene.fog = new THREE.FogExp2(0x0a0a2a, 0.0008);
        ambientLight.intensity = 2.5;
        moonLight.intensity = 3.0;
        moonLight.color.setHex(0xaabbff);
        rain.visible = true;
    } else {
        scene.background = daySkyTexture;
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.0003);
        ambientLight.intensity = 4.0;
        moonLight.intensity = 5.0;
        moonLight.color.setHex(0xffffee);
        rain.visible = false;
    }
}

// ============= FOG =============
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.0008);

// ============= LIGHTS =============
const ambientLight = new THREE.AmbientLight(0x5566aa, 2.5);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0xaabbff, 3.0);
moonLight.position.set(150, 250, 150);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 4096;
moonLight.shadow.mapSize.height = 4096;
moonLight.shadow.camera.left = -120;
moonLight.shadow.camera.right = 120;
moonLight.shadow.camera.top = 120;
moonLight.shadow.camera.bottom = -120;
scene.add(moonLight);

const fillLight = new THREE.HemisphereLight(0x4455bb, 0x222244, 1.5);
scene.add(fillLight);

// ============= Coin =============
let coin = null;
function createCoin() {
    const coinGeometry = new THREE.CylinderGeometry(1, 1, 3, 32);
    const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.3 });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);
    let x = Math.floor(Math.random() * 50) + 20;
    let z = Math.floor(Math.random() * 50) + 20;
    coin.position.set(x, 1, z);
    coin.castShadow = true;
    coin.userData.type = 'coin';
    scene.add(coin);
    interactiveObjects.push(coin);
    collisionBoxes.push(new THREE.Box3().setFromObject(coin));
    hasCoin = false;
    return coin;
}
// ============= ISLAND =============
const islandGeometry = new THREE.CylinderGeometry(35, 40, 15, 64);
const islandMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4d2d, roughness: 0.85 });
const island = new THREE.Mesh(islandGeometry, islandMaterial);
island.position.y = 7.5;
island.receiveShadow = true;
island.castShadow = true;
island.userData.type = 'island';
scene.add(island);
interactiveObjects.push(island);
collisionBoxes.push(new THREE.Box3().setFromObject(island));

// ============= GRASS =============
const grassMeshes = [];
const grassMat = new THREE.MeshStandardMaterial({ color: 0x3d6d3d, side: THREE.DoubleSide, roughness: 0.9 });
for (let i = 0; i < 1000; i++) {
    const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 2.5), grassMat);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 32;
    blade.position.set(Math.cos(angle) * radius, 15.3, Math.sin(angle) * radius);
    blade.rotation.y = Math.random() * Math.PI * 2;
    blade.castShadow = true;
    scene.add(blade);
    grassMeshes.push(blade);
}

// ============= TREES =============
function createTree(x, z) {
    const tree = new THREE.Group();
    tree.userData.type = 'tree';
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.8, 7, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.95 })
    );
    trunk.position.y = 3.5;
    trunk.castShadow = true;
    tree.add(trunk);

    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 9, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a5a2a, roughness: 0.9 })
    );
    leaves.position.y = 9;
    leaves.castShadow = true;
    tree.add(leaves);
    tree.position.set(x, 15, z);
    return tree;
}

const trees = [];
for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 22 + Math.random() * 8;
    const tree = createTree(Math.cos(angle) * radius, Math.sin(angle) * radius);
    scene.add(tree);
    trees.push(tree);
    interactiveObjects.push(tree);
    collisionBoxes.push(new THREE.Box3().setFromObject(tree));
}


// ============= ROCKS =============
const rocks = [];
for (let i = 0; i < 25; i++) {
    const rock = new THREE.Mesh(
        new THREE.DodecahedronGeometry(1.2 + Math.random() * 1.5, 0),
        new THREE.MeshStandardMaterial({ color: 0x606070, roughness: 0.95 })
    );
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 30;
    rock.position.set(Math.cos(angle) * radius, 15.8, Math.sin(angle) * radius);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.userData.type = 'rock';
    scene.add(rock);
    rocks.push(rock);
    interactiveObjects.push(rock);
}

// ============= HOUSES (Student 2) =============
function createHouse(x, z, rotation = 0) {
    const house = new THREE.Group();
    house.userData.type = 'house';

    // Base/walls
    const walls = new THREE.Mesh(
        new THREE.BoxGeometry(6, 5, 5),
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 })
    );
    walls.position.y = 2.5;
    walls.castShadow = true;
    walls.receiveShadow = true;
    house.add(walls);

    // Roof
    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(5, 3, 4),
        new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.9 })
    );
    roof.position.y = 6.5;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    house.add(roof);

    // Door
    const door = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 2.5, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x3d2817 })
    );
    door.position.set(0, 1.25, 2.55);
    house.add(door);

    // Window
    const window1 = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 0.1),
        new THREE.MeshStandardMaterial({ color: 0xffff99, emissive: 0xffff44, emissiveIntensity: 0.3 })
    );
    window1.position.set(2, 3, 2.55);
    house.add(window1);

    house.position.set(x, 15, z);
    house.rotation.y = rotation;
    return house;
}

const houses = [];
const housePositions = [
    { x: 15, z: 10, r: 0.5 },
    { x: -12, z: -15, r: 2.2 },
    { x: 8, z: -20, r: 1.1 }
];
housePositions.forEach(pos => {
    const house = createHouse(pos.x, pos.z, pos.r);
    scene.add(house);
    houses.push(house);
    interactiveObjects.push(house);
    collisionBoxes.push(new THREE.Box3().setFromObject(house));
});


// ============= BOATS (Student 2) =============
function createBoat(x, z, isPlayer = false) {
    const boat = new THREE.Group();
    boat.userData.type = 'boat';
    boat.userData.isPlayer = isPlayer;
    boat.userData.velocity = new THREE.Vector3();
    boat.userData.baseY = 1;

    // Hull
    const hullShape = new THREE.Shape();
    hullShape.moveTo(-3, 0);
    hullShape.lineTo(-2.5, -1.5);
    hullShape.lineTo(2.5, -1.5);
    hullShape.lineTo(3, 0);
    hullShape.lineTo(-3, 0);

    const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 2, bevelEnabled: false });
    const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({
        color: isPlayer ? 0x8B0000 : 0x4a3520, roughness: 0.7
    }));
    hull.rotation.x = Math.PI / 2;
    hull.position.y = 0.5;
    hull.castShadow = true;
    boat.add(hull);

    // Deck
    const deck = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.3, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x654321, roughness: 0.8 })
    );
    deck.position.y = 0.65;
    deck.castShadow = true;
    boat.add(deck);

    // Mast
    const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x3d2817 })
    );
    mast.position.y = 3.5;
    mast.castShadow = true;
    boat.add(mast);

    // Sail
    const sailGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([0, 1, 0, 0, 6, 0, 2.5, 3.5, 0.3]);
    sailGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    sailGeo.computeVertexNormals();
    const sail = new THREE.Mesh(sailGeo, new THREE.MeshStandardMaterial({
        color: 0xeeeeee, side: THREE.DoubleSide, roughness: 0.9
    }));
    sail.castShadow = true;
    boat.add(sail);

    boat.position.set(x, 1, z);
    return boat;
}

// Player boat
playerBoat = createBoat(60, 60, true);
scene.add(playerBoat);
interactiveObjects.push(playerBoat);

// NPC boats
const boats = [playerBoat];
const npcBoatData = [
    { x: -70, z: 50, angle: 0, speed: 0.15 },
    { x: 80, z: -40, angle: Math.PI, speed: 0.12 },
    { x: -50, z: -70, angle: Math.PI / 2, speed: 0.1 }
];
npcBoatData.forEach(data => {
    const boat = createBoat(data.x, data.z);
    boat.rotation.y = data.angle;
    boat.userData.patrolAngle = data.angle;
    boat.userData.patrolSpeed = data.speed;
    boat.userData.patrolRadius = 60 + Math.random() * 30;
    boat.userData.patrolCenter = new THREE.Vector3(data.x, 0, data.z);
    scene.add(boat);
    boats.push(boat);
    interactiveObjects.push(boat);
});


// ============= PEOPLE (Student 2) =============
function createPerson(x, z) {
    const person = new THREE.Group();
    person.userData.type = 'person';
    person.userData.walkPhase = Math.random() * Math.PI * 2;
    person.userData.walkSpeed = 0.3 + Math.random() * 0.2;
    person.userData.walkRadius = 3 + Math.random() * 5;
    person.userData.centerX = x;
    person.userData.centerZ = z;

    // Body
    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 1.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x2244aa })
    );
    body.position.y = 1.4;
    body.castShadow = true;
    person.add(body);

    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc99 })
    );
    head.position.y = 2.3;
    head.castShadow = true;
    person.add(head);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x333344 });
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), legMat);
    leftLeg.position.set(-0.15, 0.4, 0);
    person.add(leftLeg);
    person.userData.leftLeg = leftLeg;

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 6), legMat);
    rightLeg.position.set(0.15, 0.4, 0);
    person.add(rightLeg);
    person.userData.rightLeg = rightLeg;

    // Arms
    const armMat = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), armMat);
    leftArm.position.set(-0.5, 1.5, 0);
    leftArm.rotation.z = 0.3;
    person.add(leftArm);
    person.userData.leftArm = leftArm;

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), armMat);
    rightArm.position.set(0.5, 1.5, 0);
    rightArm.rotation.z = -0.3;
    person.add(rightArm);
    person.userData.rightArm = rightArm;

    person.position.set(x, 15, z);
    return person;
}

const people = [];
const peoplePositions = [
    { x: 5, z: 5 }, { x: -8, z: 12 }, { x: 12, z: -8 }, { x: -15, z: -5 }
];
peoplePositions.forEach(pos => {
    const person = createPerson(pos.x, pos.z);
    scene.add(person);
    people.push(person);
    interactiveObjects.push(person);
});


// ============= ANIMALS (Student 2) =============
function createAnimal(x, z, type = 'dog') {
    const animal = new THREE.Group();
    animal.userData.type = 'animal';
    animal.userData.animalType = type;
    animal.userData.movePhase = Math.random() * Math.PI * 2;
    animal.userData.moveSpeed = 0.4 + Math.random() * 0.3;
    animal.userData.moveRadius = 4 + Math.random() * 6;
    animal.userData.centerX = x;
    animal.userData.centerZ = z;

    const bodyColor = type === 'dog' ? 0x8B4513 : 0x333333;

    // Body
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
        new THREE.MeshStandardMaterial({ color: bodyColor })
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.5;
    body.castShadow = true;
    animal.add(body);

    // Head
    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        new THREE.MeshStandardMaterial({ color: bodyColor })
    );
    head.position.set(0.6, 0.6, 0);
    head.castShadow = true;
    animal.add(head);

    // Legs
    const legMat = new THREE.MeshStandardMaterial({ color: bodyColor });
    const legPositions = [[-0.3, 0, 0.2], [-0.3, 0, -0.2], [0.3, 0, 0.2], [0.3, 0, -0.2]];
    animal.userData.legs = [];
    legPositions.forEach((pos, i) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), legMat);
        leg.position.set(pos[0], pos[1] + 0.2, pos[2]);
        animal.add(leg);
        animal.userData.legs.push(leg);
    });

    // Tail
    const tail = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.06, 0.4, 6),
        new THREE.MeshStandardMaterial({ color: bodyColor })
    );
    tail.position.set(-0.7, 0.6, 0);
    tail.rotation.z = Math.PI / 3;
    animal.add(tail);
    animal.userData.tail = tail;

    animal.position.set(x, 15, z);
    return animal;
}

const animals = [];
const animalPositions = [
    { x: -5, z: 8, type: 'dog' },
    { x: 10, z: -5, type: 'dog' },
    { x: -10, z: -10, type: 'cat' }
];
animalPositions.forEach(pos => {
    const animal = createAnimal(pos.x, pos.z, pos.type);
    scene.add(animal);
    animals.push(animal);
    interactiveObjects.push(animal);
});


// ============= CAMPFIRE =============
const fireParticles = new THREE.Group();
fireParticles.userData.type = 'fire';
for (let i = 0; i < 60; i++) {
    const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.4 + Math.random() * 0.3),
        new THREE.MeshBasicMaterial({
            color: new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.2),
            transparent: true
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
scene.add(fireLight);
interactiveObjects.push(fireParticles);

// ============= SMOKE EFFECT (Student 1 bonus) =============
const smokeParticles = new THREE.Group();
smokeParticles.userData.type = 'smoke';
const smokeMat = new THREE.MeshBasicMaterial({
    color: 0x555555, transparent: true, opacity: 0.3, side: THREE.DoubleSide
});
for (let i = 0; i < 40; i++) {
    const smoke = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), smokeMat.clone());
    smoke.position.set((Math.random() - 0.5) * 2, 18 + Math.random() * 5, (Math.random() - 0.5) * 2);
    smoke.userData.velocity = 0.03 + Math.random() * 0.02;
    smoke.userData.rotSpeed = (Math.random() - 0.5) * 0.02;
    smoke.userData.startY = smoke.position.y;
    smoke.userData.drift = (Math.random() - 0.5) * 0.01;
    smokeParticles.add(smoke);
}
scene.add(smokeParticles);
interactiveObjects.push(smokeParticles);

// ============= WATER =============
const waterGeometry = new THREE.PlaneGeometry(10000, 10000, 100, 100);
const textureLoader = new THREE.TextureLoader();
let waterNormals = textureLoader.load('./assets/Water_1_M_Normal.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
});
waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;

const water = new Water(waterGeometry, {
    textureWidth: 1024, textureHeight: 1024,
    waterNormals: waterNormals,
    sunDirection: new THREE.Vector3(0.7, 0.5, 0.3).normalize(),
    sunColor: 0xffffff, waterColor: 0x002244,
    distortionScale: 4.5, fog: true, alpha: 0.95
});
water.rotation.x = -Math.PI / 2;
water.userData.type = 'water';
scene.add(water);
interactiveObjects.push(water);


// ============= CLOUDS =============
const cloudGroup = new THREE.Group();
function createVolumetricCloud(x, y, z, size) {
    const cloud = new THREE.Group();
    cloud.userData.type = 'cloud';
    const cloudMat = new THREE.MeshStandardMaterial({
        color: 0x8899bb, transparent: true, opacity: 0.4, roughness: 1.0, side: THREE.DoubleSide
    });
    for (let i = 0; i < 8 + Math.floor(Math.random() * 6); i++) {
        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(size * (0.5 + Math.random() * 0.8), 8, 8),
            cloudMat.clone()
        );
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

for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2 + Math.random();
    const distance = 150 + Math.random() * 250;
    const cloud = createVolumetricCloud(
        Math.cos(angle) * distance, 80 + Math.random() * 40, Math.sin(angle) * distance,
        8 + Math.random() * 12
    );
    cloudGroup.add(cloud);
    interactiveObjects.push(cloud);
}
scene.add(cloudGroup);

// ============= RAIN =============
const rainCount = 18000;
const rainGeo = new THREE.BufferGeometry();
const rainPositions = new Float32Array(rainCount * 3);
const rainVelocities = new Float32Array(rainCount);
for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 1000;
    rainPositions[i * 3 + 1] = Math.random() * 800;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 1000;
    rainVelocities[i] = 4 + Math.random() * 2.5;
}
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({
    color: 0x99bbff, size: 0.5, transparent: true, opacity: 0.5
}));
scene.add(rain);

// ============= LIGHTNING =============
const thunderFlash = new THREE.PointLight(0xffffff, 0, 2500);
thunderFlash.position.set(200, 600, 200);
scene.add(thunderFlash);


// ============= AUDIO SYSTEM =============
const listener = new THREE.AudioListener();
camera.add(listener);

// Environment sound
const ambientSound = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();

// Interactive sounds (Student 2)
let waterSplashGain = null;
let footstepOsc = null;
let footstepGain = null;

// Fire crackling (generated)
const fireCtx = listener.context;
let fireNoiseNode = null;

function createFireSound() {
    const bufferSize = fireCtx.sampleRate * 2;
    const buffer = fireCtx.createBuffer(1, bufferSize, fireCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.98 ? 1 : 0.1);
    }
    const source = fireCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const fireGain = fireCtx.createGain();
    fireGain.gain.value = 0.15;
    const fireFilter = fireCtx.createBiquadFilter();
    fireFilter.type = 'lowpass';
    fireFilter.frequency.value = 1000;
    source.connect(fireFilter);
    fireFilter.connect(fireGain);
    fireGain.connect(fireCtx.destination);
    return source;
}

// Water splash sound (generated noise bursts)
function createWaterSplashSound(ctx) {
    const bufferSize = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.exp(-i / (ctx.sampleRate * 0.1));
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.5;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    return gain;
}

let audioStarted = false;
function startAudioContext() {
    if (audioStarted) return;
    audioStarted = true;

    // Start fire sound
    fireNoiseNode = createFireSound();
    fireNoiseNode.start();

    // Setup water splash
    waterSplashGain = createWaterSplashSound(fireCtx);

    // Load ambient sound
    audioLoader.load('./assets/rain-and-thunder.mp3', (buffer) => {
        ambientSound.setBuffer(buffer);
        ambientSound.setLoop(true);
        ambientSound.setVolume(0.4);
        ambientSound.play();
    }, undefined, () => { });
}


// ============= UI SYSTEM (Student 2) =============
const uiContainer = document.createElement('div');
uiContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;font-family:Arial,sans-serif;';
document.body.appendChild(uiContainer);

// Start screen
const startScreen = document.createElement('div');
startScreen.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);padding:40px;border-radius:15px;text-align:center;pointer-events:auto;color:white;';
startScreen.innerHTML = `
    <h1 style="color:#4af;margin:0 0 20px 0;font-size:32px;">Island Storm</h1>
    <p style="color:#aaa;margin:10px 0;">Explore the mysterious island during a thunderstorm</p>
    <div style="margin:20px 0;padding:15px;background:rgba(255,255,255,0.1);border-radius:8px;text-align:left;">
        <p style="margin:5px 0;color:#8cf;">Controls:</p>
        <p style="margin:3px 0;color:#ccc;font-size:14px;">W/A/S/D - Move boat</p>
        <p style="margin:3px 0;color:#ccc;font-size:14px;">Mouse - Look around</p>
        <p style="margin:3px 0;color:#ccc;font-size:14px;">Click - Select objects</p>
        <p style="margin:3px 0;color:#ccc;font-size:14px;">P - Pause game</p>
        <p style="margin:3px 0;color:#ccc;font-size:14px;">C - Toggle camera mode</p>
        <p style="margin:3px 0;color:#ccc;font-size:14px;">N - Toggle day/night</p>
    </div>
    <p style="color:#fa4;margin:15px 0;">Objective: Navigate to the island</p>
    <button id="startBtn" style="background:#4a4;border:none;color:white;padding:15px 40px;font-size:18px;border-radius:8px;cursor:pointer;margin-top:10px;">Start Game</button>
`;
uiContainer.appendChild(startScreen);

// HUD
const hud = document.createElement('div');
hud.style.cssText = 'position:absolute;top:20px;left:20px;color:white;display:none;';
hud.innerHTML = `
    <div style="background:rgba(0,0,0,0.6);padding:10px 15px;border-radius:8px;margin-bottom:10px;">
        <span id="objective" style="color:#4af;">Objective: Navigate to the island</span>
    </div>
    <div id="selectionInfo" style="background:rgba(0,0,0,0.6);padding:10px 15px;border-radius:8px;display:none;margin-bottom:10px;">
        <span style="color:#fa4;">Selected: </span><span id="selectedName">-</span>
    </div>
    <div style="background:rgba(0,0,0,0.6);padding:10px 15px;border-radius:8px;font-size:12px;">
        <p style="margin:0 0 5px 0;color:#8cf;">Controls:</p>
        <p style="margin:2px 0;color:#aaa;">W/A/S/D - Move</p>
        <p style="margin:2px 0;color:#aaa;">P - Pause</p>
        <p style="margin:2px 0;color:#aaa;">C - Camera</p>
        <p style="margin:2px 0;color:#aaa;">N - Day/Night</p>
        <p style="margin:2px 0;color:#aaa;">Click - Select</p>
    </div>
`;
uiContainer.appendChild(hud);

// Pause screen
const pauseScreen = document.createElement('div');
pauseScreen.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);padding:30px;border-radius:10px;text-align:center;color:white;display:none;pointer-events:auto;';
pauseScreen.innerHTML = `
    <h2 style="color:#fa4;margin:0 0 20px 0;">PAUSED</h2>
    <p style="color:#aaa;">Press P to resume</p>
    <button id="resumeBtn" style="background:#44a;border:none;color:white;padding:10px 30px;font-size:16px;border-radius:5px;cursor:pointer;margin-top:15px;">Resume</button>
`;
uiContainer.appendChild(pauseScreen);

// Win screen
const winScreen = document.createElement('div');
winScreen.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,50,0,0.95);padding:40px;border-radius:15px;text-align:center;color:white;display:none;pointer-events:auto;';
winScreen.innerHTML = `
    <h1 style="color:#4f4;margin:0 0 20px 0;">You Made It!</h1>
    <p style="color:#afa;">You successfully reached the island!</p>
    <button id="restartBtn" style="background:#4a4;border:none;color:white;padding:12px 35px;font-size:16px;border-radius:8px;cursor:pointer;margin-top:20px;">Play Again</button>
`;
uiContainer.appendChild(winScreen);


// ============= GAME CONTROLS (Student 2) =============
const keys = { w: false, a: false, s: false, d: false };
let cameraFollow = true;

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // P works even when paused
    if (key === 'p' && gameStarted) {
        togglePause();
        return;
    }

    if (!gameStarted || gamePaused) return;

    if (keys.hasOwnProperty(key)) keys[key] = true;
    if (key === 'c') {
        cameraFollow = !cameraFollow;
        controls.enabled = !cameraFollow;
    }
    if (key === 'n') toggleDayNight();
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(key)) keys[key] = false;
});

document.addEventListener('click', (e) => {
    if (!gameStarted || gamePaused) return;
    startAudioContext();

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(interactiveObjects, true);
    if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj.parent && !obj.userData.type) obj = obj.parent;

        if (obj.userData.type) {
            selectedObject = obj;
            document.getElementById('selectionInfo').style.display = 'block';

            const typeLabels = {
                'boat': obj.userData.isPlayer ? 'Your Boat' : 'NPC Boat',
                'house': 'House',
                'person': 'Villager',
                'animal': obj.userData.animalType === 'dog' ? 'Dog' : 'Cat',
                'tree': 'Tree',
                'rock': 'Rock',
                'fire': 'Campfire',
                'smoke': 'Smoke',
                'cloud': 'Cloud',
                'water': 'Sea Water',
                'island': 'Island',
                'coin': 'Coin'
            };
            document.getElementById('selectedName').textContent = typeLabels[obj.userData.type] || obj.userData.type;
        }
    } else {
        selectedObject = null;
        document.getElementById('selectionInfo').style.display = 'none';
    }
});

function togglePause() {
    gamePaused = !gamePaused;
    pauseScreen.style.display = gamePaused ? 'block' : 'none';
}

function startGame() {
    coin = createCoin();
    gameStarted = true;
    startScreen.style.display = 'none';
    hud.style.display = 'block';
    startAudioContext();
}


let hasWon = false;

function checkWinCondition() {
    if (!playerBoat || hasWon) return;
    const dist = Math.sqrt(playerBoat.position.x ** 2 + playerBoat.position.z ** 2);
    if (dist < 45) {
        if (hasCoin) {
            hasWon = true;
            gameStarted = false;
            winScreen.style.display = 'block';
        } else {
            document.getElementById('objective').textContent = 'Objective: Find the coin on the island';
            restartGame()
        }

    }
}

function restartGame() {
    playerBoat.position.set(60, 1, 60);
    playerBoat.rotation.y = 0;
    winScreen.style.display = 'none';
    hasWon = false;
    gameStarted = true;
    hasCoin = false;
    document.getElementById('objective').textContent = 'Objective: Navigate to the island';
    if (!interactiveObjects.includes(coin)) { 
        coin = createCoin();
    }
}

// Button events
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('resumeBtn').addEventListener('click', togglePause);
document.getElementById('restartBtn').addEventListener('click', restartGame);


// ============= PHYSICS & MOVEMENT (Student 2) =============
function getWaveHeight(x, z, time) {
    return Math.sin(x * 0.05 + time) * 0.5 + Math.sin(z * 0.07 + time * 1.3) * 0.3;
}

function updatePlayerBoat(time, delta) {
    if (!playerBoat || !gameStarted || gamePaused) return;

    const speed = 0.5;
    const rotSpeed = 0.03;
    let moving = false;

    if (keys.w) {
        playerBoat.position.x -= Math.sin(playerBoat.rotation.y) * speed;
        playerBoat.position.z -= Math.cos(playerBoat.rotation.y) * speed;
        moving = true;
    }
    if (keys.s) {
        playerBoat.position.x += Math.sin(playerBoat.rotation.y) * speed * 0.5;
        playerBoat.position.z += Math.cos(playerBoat.rotation.y) * speed * 0.5;
        moving = true;
    }
    if (keys.a) playerBoat.rotation.y += rotSpeed;
    if (keys.d) playerBoat.rotation.y -= rotSpeed;

    // Wave physics
    const waveY = getWaveHeight(playerBoat.position.x, playerBoat.position.z, time);
    playerBoat.position.y = 1 + waveY;
    playerBoat.rotation.x = Math.sin(time * 2) * 0.05;
    playerBoat.rotation.z = Math.cos(time * 1.5) * 0.03;

    // Water splash sound when moving
    if (waterSplashGain) {
        waterSplashGain.gain.value = moving ? 0.15 : 0;
    }

    // Camera follow
    if (cameraFollow) {
        const camOffset = new THREE.Vector3(0, 25, 40);
        camOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerBoat.rotation.y);
        camera.position.lerp(playerBoat.position.clone().add(camOffset), 0.05);
        controls.target.lerp(playerBoat.position, 0.1);
    }

    if (playerBoat.position.x - coin.position.x < 5 &&
        playerBoat.position.x - coin.position.x > -5 &&
        playerBoat.position.z - coin.position.z < 5 &&
        playerBoat.position.z - coin.position.z > -5 &&
        !hasCoin) {
            console.log("Coin collected");
            hasCoin = true;
            scene.remove(coin);
            const interactiveIndex = interactiveObjects.indexOf(coin);
            if (interactiveIndex > -1) {
                interactiveObjects.splice(interactiveIndex, 1);
            }
            const coinBox = collisionBoxes.find(box => box.intersectsBox(new THREE.Box3().setFromObject(coin)));
            if (coinBox) {
                const boxIndex = collisionBoxes.indexOf(coinBox);
                if (boxIndex > -1) {
                    collisionBoxes.splice(boxIndex, 1);
                }
            }
            document.getElementById('objective').textContent = 'Objective: Return to the island with the coin';
    };
    checkWinCondition();
}

function updateNPCBoats(time) {
    boats.forEach((boat, i) => {
        if (boat.userData.isPlayer) return;

        boat.userData.patrolAngle += boat.userData.patrolSpeed * 0.01;
        const angle = boat.userData.patrolAngle;
        const radius = boat.userData.patrolRadius;

        boat.position.x = Math.cos(angle) * radius;
        boat.position.z = Math.sin(angle) * radius;
        boat.rotation.y = -angle + Math.PI / 2;

        const waveY = getWaveHeight(boat.position.x, boat.position.z, time);
        boat.position.y = 1 + waveY;
        boat.rotation.x = Math.sin(time * 2 + i) * 0.05;
        boat.rotation.z = Math.cos(time * 1.5 + i) * 0.03;
    });
}

function updatePeople(time) {
    people.forEach((person, i) => {
        person.userData.walkPhase += person.userData.walkSpeed * 0.02;
        const phase = person.userData.walkPhase;

        person.position.x = person.userData.centerX + Math.sin(phase) * person.userData.walkRadius;
        person.position.z = person.userData.centerZ + Math.cos(phase) * person.userData.walkRadius;
        person.rotation.y = phase + Math.PI;

        // Walking animation
        const legSwing = Math.sin(time * 8 + i) * 0.4;
        person.userData.leftLeg.rotation.x = legSwing;
        person.userData.rightLeg.rotation.x = -legSwing;
        person.userData.leftArm.rotation.x = -legSwing * 0.5;
        person.userData.rightArm.rotation.x = legSwing * 0.5;
    });
}

function updateAnimals(time) {
    animals.forEach((animal, i) => {
        animal.userData.movePhase += animal.userData.moveSpeed * 0.015;
        const phase = animal.userData.movePhase;

        animal.position.x = animal.userData.centerX + Math.sin(phase) * animal.userData.moveRadius;
        animal.position.z = animal.userData.centerZ + Math.cos(phase * 0.7) * animal.userData.moveRadius;
        animal.rotation.y = Math.atan2(
            Math.cos(phase) * animal.userData.moveRadius,
            -Math.sin(phase * 0.7) * animal.userData.moveRadius
        );

        // Leg animation
        const legSwing = Math.sin(time * 12 + i) * 0.3;
        animal.userData.legs.forEach((leg, j) => {
            leg.rotation.x = j % 2 === 0 ? legSwing : -legSwing;
        });
        animal.userData.tail.rotation.x = Math.sin(time * 6) * 0.3;
    });
}


// ============= ANIMATION LOOP =============
function animate() {
    requestAnimationFrame(animate);
    const time = clock.getElapsedTime();
    const delta = clock.getDelta();

    if (gamePaused) {
        renderer.render(scene, camera);
        return;
    }

    // Grass animation
    grassMeshes.forEach((blade, i) => {
        blade.rotation.x = Math.sin(time * 1.2 + i * 0.1) * 0.2;
    });

    // Tree sway
    trees.forEach((tree, i) => {
        tree.rotation.z = Math.sin(time * 0.5 + i) * 0.04;
    });

    // Cloud movement
    cloudGroup.children.forEach(cloud => {
        cloud.position.x += cloud.userData.speed;
        cloud.position.y += Math.sin(time * 0.3 + cloud.userData.wobble) * 0.02;
        if (cloud.position.x > 500) cloud.position.x = -500;
    });

    // Water animation
    water.material.uniforms['time'].value += 1.0 / 60.0;

    // Rain
    const pos = rain.geometry.attributes.position.array;
    for (let i = 0; i < rainCount; i++) {
        pos[i * 3 + 1] -= rainVelocities[i];
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 800;
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

    // Smoke animation
    smokeParticles.children.forEach(smoke => {
        smoke.position.y += smoke.userData.velocity;
        smoke.position.x += smoke.userData.drift;
        smoke.rotation.z += smoke.userData.rotSpeed;
        smoke.material.opacity = 0.3 * (1 - (smoke.position.y - smoke.userData.startY) / 15);
        smoke.scale.setScalar(1 + (smoke.position.y - smoke.userData.startY) * 0.1);

        if (smoke.position.y > smoke.userData.startY + 15) {
            smoke.position.y = smoke.userData.startY;
            smoke.position.x = (Math.random() - 0.5) * 2;
            smoke.material.opacity = 0.3;
            smoke.scale.setScalar(1);
        }
    });

    // Lightning
    if (Math.random() > 0.987) {
        thunderFlash.intensity = 3000 + Math.random() * 2000;
    } else {
        thunderFlash.intensity *= 0.88;
    }

    // Game updates
    updatePlayerBoat(time, delta);
    updateNPCBoats(time);
    updatePeople(time);
    updateAnimals(time);

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

console.log('=== Island Storm Game Ready ===');
