import * as THREE from 'three';
import { Cloth } from './cloth.js';

import { setupMenuHandlers } from './menu.ts';

const Options = {
    gravity: -9.8,
    structK: 2000,  // Structural spring constant
    shearK: 1500,   // Shear spring constant
    bendK: 2000,    // Bending spring constant
    dampSpring: 15,
    dampAir: 3,
    clothWidth: 16,
    clothHeight: 16,
    mass: 1,
    tension: 1.2,
    timeStep: 0.08,
    wind: new Float32Array([0.0, 0.0, 0.0]),
    dynamicWind: true,
    pinned: { bottomLeft: false, bottomRight: false, topLeft: true, topRight: true },
};


// Set up Three.js scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.physicallyCorrectLights = true;
document.body.appendChild(renderer.domElement);

// Add lighting
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(0, 1, 1).normalize();
scene.add(light);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

// Set up cloth simulation
const cloth = new Cloth(Options);
cloth.wind = Options.wind;

const clothGeometry = new THREE.BufferGeometry();
const vertexCount = Options.clothWidth * Options.clothHeight;
const positions = new Float32Array(vertexCount * 3);
const normals = new Float32Array(vertexCount * 3);

const uvArray = new Float32Array(vertexCount * 2);
for (let i = 0; i < Options.clothHeight; i++) {
    for (let j = 0; j < Options.clothWidth; j++) {
        const index = (i * Options.clothWidth + j) * 2;
        uvArray[index] = j / (Options.clothWidth - 1);
        uvArray[index + 1] = i / (Options.clothHeight - 1);
    }
}




cloth.calcNormals();
cloth.populateVertexBuffer(new Float32Array(vertexCount * 8));

clothGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
clothGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
clothGeometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
clothGeometry.setAttribute('uv2', new THREE.BufferAttribute(uvArray, 2));

clothGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(cloth.tris), 1));


// Create material
const clothMaterial = new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.0,
    displacementScale: 0.5, 
    aoMapIntensity: 1.0,    
});



const textureLoader = new THREE.TextureLoader();
const baseColorPath = new URL('./textures/Leather_Padded_003_basecolor.png', import.meta.url).href;
const normalMapPath = new URL('./textures/Leather_Padded_003_normal.png', import.meta.url).href;
const roughnessMapPath = new URL('./textures/Leather_Padded_003_roughness.png', import.meta.url).href;
const heightMapPath = new URL('./textures/Leather_Padded_003_height.png', import.meta.url).href;
const aoMapPath = new URL('./textures/Leather_Padded_003_ambientOcclusion.png', import.meta.url).href;


//base
textureLoader.load(baseColorPath, (baseTexture) => {
    baseTexture.encoding = THREE.sRGBEncoding;
    baseTexture.wrapS = THREE.RepeatWrapping;
    baseTexture.wrapT = THREE.RepeatWrapping;
    clothMaterial.map = baseTexture;
    clothMaterial.needsUpdate = true;
});

//normal
textureLoader.load(normalMapPath, (normalMap) => {
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    clothMaterial.normalMap = normalMap;
    clothMaterial.needsUpdate = true;
});

//roughnessmap
textureLoader.load(roughnessMapPath, (roughnessMap) => {
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    clothMaterial.roughnessMap = roughnessMap;
    clothMaterial.needsUpdate = true;
});

//heightMap
textureLoader.load(heightMapPath, (heightMap) => {
    heightMap.wrapS = THREE.RepeatWrapping;
    heightMap.wrapT = THREE.RepeatWrapping;
    clothMaterial.displacementMap = heightMap;
    clothMaterial.displacementScale = 0.1;
    clothMaterial.needsUpdate = true;
});

//aoMapPath
textureLoader.load(aoMapPath, (aoMap) => {
    aoMap.wrapS = THREE.RepeatWrapping;
    aoMap.wrapT = THREE.RepeatWrapping;
    clothMaterial.aoMap = aoMap;
    clothMaterial.aoMapIntensity = 1.0; 
    clothMaterial.needsUpdate = true;
});


const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial);
scene.add(clothMesh);
setupMenuHandlers(Options);


function updateClothGeometry() {
    const tempBuffer = new Float32Array(vertexCount * 8);
    cloth.calcNormals();
    cloth.populateVertexBuffer(tempBuffer);

    for (let i = 0; i < vertexCount; i++) {
        positions[i * 3] = tempBuffer[i * 8];
        positions[i * 3 + 1] = tempBuffer[i * 8 + 1];
        positions[i * 3 + 2] = tempBuffer[i * 8 + 2];
        normals[i * 3] = tempBuffer[i * 8 + 3];
        normals[i * 3 + 1] = tempBuffer[i * 8 + 4];
        normals[i * 3 + 2] = tempBuffer[i * 8 + 5];
    }
    clothGeometry.attributes.position.needsUpdate = true;
    clothGeometry.attributes.normal.needsUpdate = true;
}


// Animation loop
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    
    if (Options.dynamicWind) {
        const time = now * 0.001;
        cloth.wind[0] = Math.sin(time);
        cloth.wind[1] = 1.0;
        cloth.wind[2] = Math.cos(time);
    }

    cloth.simulate(deltaTime);
    updateClothGeometry();
    renderer.render(scene, camera);
}

animate();
