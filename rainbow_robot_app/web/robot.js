import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

let scene, camera, renderer, controls;
let robotJoints = [];
let jointData = [0, 0, 0, 0, 0, 0];
let isDancing = false;
let danceStep = 0;
let envModel = null;

const jointLimits = [
    { min: -3.14, max: 3.14 },
    { min: -3.14, max: 3.14 },
    { min: -3.14, max: 3.14 },
    { min: -3.14, max: 3.14 },
    { min: -3.14, max: 3.14 },
    { min: -3.14, max: 3.14 }
];

const danceMoves = [
    [0, 45, -90, 0, 45, 0],
    [45, 0, 0, 45, 0, 45],
    [0, -45, 90, 0, -45, 0],
    [-45, 0, 0, -45, 0, -45],
    [0, 0, 0, 0, 0, 0]
];

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(2, 2, 2);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.5, 0);
    controls.update();

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const grid = new THREE.GridHelper(10, 10);
    scene.add(grid);

    loadRobot();

    window.addEventListener('resize', onWindowResize);
    
    // Status polling
    setInterval(updateStatus, 50);

    // Export functions to window
    window.robotDance = function() {
        isDancing = !isDancing;
        const btn = document.getElementById('danceBtn');
        if (isDancing) {
            btn.innerText = "Stop Dance Mode";
            btn.style.background = "#dc3545";
            startDanceLoop();
        } else {
            btn.innerText = "Start Dance Mode";
            btn.style.background = "#28a745";
        }
    };

    window.refreshEnvModel = function() {
        handleEnvUpdate();
    };

    // Handle file input
    document.getElementById('modelInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            const contents = event.target.result;
            const extension = file.name.split('.').pop().toLowerCase();
            loadUserFile(contents, extension);
        };
        if (file.name.endsWith('.obj')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

function loadUserFile(contents, extension) {
    if (envModel) scene.remove(envModel);
    
    if (extension === 'obj') {
        const loader = new OBJLoader();
        envModel = loader.parse(contents);
        setupEnvModel(envModel);
    } else if (extension === 'stl') {
        const loader = new STLLoader();
        const geometry = loader.parse(contents);
        const material = new THREE.MeshPhongMaterial({ color: 0xAAAAAA });
        envModel = new THREE.Mesh(geometry, material);
        setupEnvModel(envModel);
    }
}

function setupEnvModel(model) {
    scene.add(model);
    handleEnvUpdate();
}

function handleEnvUpdate() {
    if (!envModel) return;
    const x = parseFloat(document.getElementById('envX').value);
    const y = parseFloat(document.getElementById('envY').value);
    const z = parseFloat(document.getElementById('envZ').value);
    const rx = parseFloat(document.getElementById('envRX').value) * Math.PI / 180;
    const ry = parseFloat(document.getElementById('envRY').value) * Math.PI / 180;
    const rz = parseFloat(document.getElementById('envRZ').value) * Math.PI / 180;

    envModel.position.set(x, y, z);
    envModel.rotation.set(rx, ry, rz);
}

function startDanceLoop() {
    if (!isDancing) return;

    const move = danceMoves[danceStep];
    fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ joints: move })
    }).then(() => {
        danceStep = (danceStep + 1) % danceMoves.length;
        setTimeout(startDanceLoop, 2000); // 2 seconds per move
    });
}

function checkLimits(joints) {
    let limitReached = false;
    for (let i = 0; i < 6; i++) {
        if (joints[i] < jointLimits[i].min || joints[i] > jointLimits[i].max) {
            limitReached = true;
            break;
        }
    }
    const warning = document.getElementById('warning');
    const checkEnabled = document.getElementById('limitCheck').checked;
    if (checkEnabled && limitReached) {
        warning.style.display = 'block';
    } else {
        warning.style.display = 'none';
    }
}

function loadRobot() {
    const loader = new ColladaLoader();
    const meshPath = 'meshes/rb5_850e/visual/';
    
    const robotGroup = new THREE.Group();
    scene.add(robotGroup);

    // Link 0
    const link0 = new THREE.Group();
    robotGroup.add(link0);
    loader.load(meshPath + 'link0.dae', (collada) => {
        link0.add(collada.scene);
    });

    // Joint 1: base (link0 -> link1)
    const j1 = new THREE.Group();
    j1.position.set(0, 0.1692, 0);
    link0.add(j1);
    robotJoints.push(j1);

    // Link 1
    const link1 = new THREE.Group();
    j1.add(link1);
    loader.load(meshPath + 'link1.dae', (collada) => {
        link1.add(collada.scene);
    });

    // Joint 2: shoulder (link1 -> link2)
    const j2 = new THREE.Group();
    j2.position.set(0, 0, 0);
    link1.add(j2);
    robotJoints.push(j2);

    // Link 2
    const link2 = new THREE.Group();
    j2.add(link2);
    loader.load(meshPath + 'link2.dae', (collada) => {
        link2.add(collada.scene);
    });

    // Joint 3: elbow (link2 -> link3)
    const j3 = new THREE.Group();
    j3.position.set(0, 0.425, 0);
    link2.add(j3);
    robotJoints.push(j3);

    // Link 3
    const link3 = new THREE.Group();
    j3.add(link3);
    loader.load(meshPath + 'link3.dae', (collada) => {
        link3.add(collada.scene);
    });

    // Joint 4: wrist1 (link3 -> link4)
    const j4 = new THREE.Group();
    j4.position.set(0, 0.392, 0);
    link3.add(j4);
    robotJoints.push(j4);

    // Link 4
    const link4 = new THREE.Group();
    j4.add(link4);
    loader.load(meshPath + 'link4.dae', (collada) => {
        link4.add(collada.scene);
    });

    // Joint 5: wrist2 (link4 -> link5)
    const j5 = new THREE.Group();
    // URDF xyz="0 -0.1107 0.1107"
    // Mapping (URDF -> Three.js): X->X, Y->-Z, Z->Y
    // xyz -> (0, 0.1107, 0.1107)
    j5.position.set(0, 0.1107, 0.1107);
    link4.add(j5);
    robotJoints.push(j5);

    // Link 5
    const link5 = new THREE.Group();
    j5.add(link5);
    loader.load(meshPath + 'link5.dae', (collada) => {
        link5.add(collada.scene);
    });

    // Joint 6: wrist3 (link5 -> link6)
    const j6 = new THREE.Group();
    j6.position.set(0, 0, 0);
    link5.add(j6);
    robotJoints.push(j6);

    // Link 6
    const link6 = new THREE.Group();
    j6.add(link6);
    loader.load(meshPath + 'link6.dae', (collada) => {
        link6.add(collada.scene);
    });
}


function updateStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            jointData = data.joints;
            // Update UI
            document.getElementById(`cur_j1`).innerText = (jointData[0] * 180 / Math.PI).toFixed(1);
            document.getElementById(`cur_j2`).innerText = (jointData[1] * 180 / Math.PI).toFixed(1);
            document.getElementById(`cur_j3`).innerText = (jointData[2] * 180 / Math.PI).toFixed(1);
            document.getElementById(`cur_j4`).innerText = (jointData[3] * 180 / Math.PI).toFixed(1);
            document.getElementById(`cur_j5`).innerText = (jointData[4] * 180 / Math.PI).toFixed(1);
            document.getElementById(`cur_j6`).innerText = (jointData[5] * 180 / Math.PI).toFixed(1);
            
            checkLimits(jointData);

            // Update Robot Rotations
            if (robotJoints.length === 6) {
                // URDF Axis mapping to Three.js
                // base: Z (0,0,1) -> Three Y
                // shoulder: Y (0,1,0) -> Three -Z
                // elbow: Y (0,1,0) -> Three -Z
                // wrist1: Y (0,1,0) -> Three -Z
                // wrist2: Z (0,0,1) -> Three Y
                // wrist3: Y (0,1,0) -> Three -Z
                
                robotJoints[0].rotation.y = jointData[0];
                robotJoints[1].rotation.z = -jointData[1];
                robotJoints[2].rotation.z = -jointData[2];
                robotJoints[3].rotation.z = -jointData[3];
                robotJoints[4].rotation.y = jointData[4];
                robotJoints[5].rotation.z = -jointData[5];
            }
        });
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
