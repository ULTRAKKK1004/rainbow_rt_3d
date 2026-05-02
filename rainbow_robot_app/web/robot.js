import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';

let scene, camera, renderer, controls;
let robotJoints = [];
let jointData = [0, 0, 0, 0, 0, 0];

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
}

function loadRobot() {
    const loader = new ColladaLoader();
    const meshPath = 'meshes/rb5_850e/visual/';
    
    // We'll create a hierarchy manually based on URDF
    const group0 = new THREE.Group(); // Base Link0
    scene.add(group0);

    loader.load(meshPath + 'link0.dae', (collada) => {
        group0.add(collada.scene);
    });

    const j1 = new THREE.Group(); j1.position.set(0, 0.1692, 0); // Joint 1 origin
    group0.add(j1);
    robotJoints.push(j1);

    loader.load(meshPath + 'link1.dae', (collada) => {
        const link = collada.scene;
        link.position.set(0, -0.1692, 0); // Offset link mesh back to align with joint
        j1.add(link);
    });

    const j2 = new THREE.Group(); j2.position.set(0, 0, 0); // Joint 2 origin
    j1.add(j2);
    robotJoints.push(j2);

    loader.load(meshPath + 'link2.dae', (collada) => {
        const link = collada.scene;
        j2.add(link);
    });

    const j3 = new THREE.Group(); j3.position.set(0, 0.425, 0); // Joint 3 origin
    j2.add(j3);
    robotJoints.push(j3);

    loader.load(meshPath + 'link3.dae', (collada) => {
        const link = collada.scene;
        link.position.set(0, -0.425, 0);
        j3.add(link);
    });

    const j4 = new THREE.Group(); j4.position.set(0, 0.392, 0); // Joint 4 origin
    j3.add(j4);
    robotJoints.push(j4);

    loader.load(meshPath + 'link4.dae', (collada) => {
        const link = collada.scene;
        link.position.set(0, -0.392, 0);
        j4.add(link);
    });

    const j5 = new THREE.Group(); j5.position.set(0, 0.1107, -0.1107); // Joint 5 origin (note: coordinate swap for Three.js Y-up)
    j4.add(j5);
    robotJoints.push(j5);

    loader.load(meshPath + 'link5.dae', (collada) => {
        const link = collada.scene;
        link.position.set(0, -0.1107, 0.1107);
        j5.add(link);
    });

    const j6 = new THREE.Group(); j6.position.set(0, 0, 0); // Joint 6 origin
    j5.add(j6);
    robotJoints.push(j6);

    loader.load(meshPath + 'link6.dae', (collada) => {
        const link = collada.scene;
        j6.add(link);
    });
}

function updateStatus() {
    fetch('/api/status')
        .then(response => response.json())
        .then(data => {
            jointData = data.joints;
            // Update UI
            for (let i = 0; i < 6; i++) {
                const deg = (jointData[i] * 180 / Math.PI).toFixed(2);
                document.getElementById(`cur_j1`).innerText = (jointData[0] * 180 / Math.PI).toFixed(1);
                document.getElementById(`cur_j2`).innerText = (jointData[1] * 180 / Math.PI).toFixed(1);
                document.getElementById(`cur_j3`).innerText = (jointData[2] * 180 / Math.PI).toFixed(1);
                document.getElementById(`cur_j4`).innerText = (jointData[3] * 180 / Math.PI).toFixed(1);
                document.getElementById(`cur_j5`).innerText = (jointData[4] * 180 / Math.PI).toFixed(1);
                document.getElementById(`cur_j6`).innerText = (jointData[5] * 180 / Math.PI).toFixed(1);
            }
            
            // Update Robot Rotations
            if (robotJoints.length === 6) {
                // Mapping URDF axes to Three.js
                // base (Z): rotation.y in Three.js (if whole scene rotated)
                // shoulder (Y): rotation.x or z?
                // Let's assume a standard mapping.
                robotJoints[0].rotation.y = jointData[0]; // Base
                robotJoints[1].rotation.x = jointData[1]; // Shoulder
                robotJoints[2].rotation.x = jointData[2]; // Elbow
                robotJoints[3].rotation.x = jointData[3]; // Wrist1
                robotJoints[4].rotation.y = jointData[4]; // Wrist2
                robotJoints[5].rotation.x = jointData[5]; // Wrist3
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
