import * as THREE from 'three';
import { createMapGeometry } from './mapRenderer.js';
import * as simulation from './simulation.js';

let scene;
let camera;
let renderer;
let simulationContainer;
let lastTimestamp = 0;
let ambientLight;
const mapGroup = new THREE.Group();

let timeDisplayElement;
let vehicleCountElement;
let peakIndicatorElement;
let intensityElement;
let roundaboutElement;
let queueElement;
let incidentElement;

function init() {
    simulationContainer = document.getElementById('simulation-container');
    timeDisplayElement = document.getElementById('time-display');
    vehicleCountElement = document.getElementById('vehicle-count');
    peakIndicatorElement = document.getElementById('peak-indicator');
    intensityElement = document.getElementById('intensity-indicator');
    roundaboutElement = document.getElementById('roundabout-density');
    queueElement = document.getElementById('queue-indicator');
    incidentElement = document.getElementById('incident-status');
    peakIndicatorElement.classList.add('normal');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xaed8ff);
    scene.fog = new THREE.Fog(0xbfdcff, 150, 420);

    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 800);
    camera.position.set(140, 120, 180);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    simulationContainer.appendChild(renderer.domElement);

    ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff0d0, 0.9);
    sunLight.position.set(120, 180, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.left = -250;
    sunLight.shadow.camera.right = 250;
    sunLight.shadow.camera.top = 250;
    sunLight.shadow.camera.bottom = -250;
    scene.add(sunLight);

    const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xcdeccd });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    createMapGeometry(mapGroup);
    mapGroup.traverse(child => {
        if (child.isMesh) {
            child.castShadow = child.geometry.type === 'BoxGeometry';
            child.receiveShadow = true;
        }
    });
    scene.add(mapGroup);

    const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const clouds = [];
    function createCloud(x, y, z, scale = 1) {
        const group = new THREE.Group();
        const sizes = [3, 2.4, 2.8, 2.1];
        const offsets = [
            [0, 0, 0],
            [-2.2, 0.3, 0.8],
            [2.1, -0.2, -0.6],
            [0.8, 0.4, -0.4]
        ];
        sizes.forEach((size, index) => {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(size * scale, 12, 12), cloudMaterial);
            puff.position.set(
                offsets[index][0] * scale,
                offsets[index][1] * scale,
                offsets[index][2] * scale
            );
            group.add(puff);
        });
        group.position.set(x, y, z);
        clouds.push(group);
        scene.add(group);
        return group;
    }

    createCloud(-80, 70, -110, 1.4);
    createCloud(70, 65, -130, 1.1);
    createCloud(-40, 75, 90, 1.2);
    createCloud(90, 60, 120, 1.3);

    window.addEventListener('resize', onWindowResize);

    lastTimestamp = performance.now();
    animate(lastTimestamp, clouds);

    window.bangkokSimulation = window.bangkokSimulation || {};
    window.bangkokSimulation.setTime = (hour, minute = 0, second = 0) => {
        simulation.setSimulationTime(hour, minute, second);
    };
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateUI(simState) {
    const { time: simulationTime, vehicleCount, isPeak, intensity, roundaboutCount, roundaboutDensity, maxApproachQueue, incident } = simState;

    const hours = String(simulationTime.getHours()).padStart(2, '0');
    const minutes = String(simulationTime.getMinutes()).padStart(2, '0');
    timeDisplayElement.textContent = `Time: ${hours}:${minutes}`;

    if (isPeak) {
        const isMorning = simulationTime.getHours() < 12;
        peakIndicatorElement.textContent = isMorning ? 'Peak Traffic (Morning)' : 'Peak Traffic (Evening)';
        peakIndicatorElement.classList.remove('normal');
        peakIndicatorElement.classList.add('peak');
    } else {
        peakIndicatorElement.textContent = 'Normal Traffic';
        peakIndicatorElement.classList.remove('peak');
        peakIndicatorElement.classList.add('normal');
    }

    vehicleCountElement.textContent = `Vehicles: ${vehicleCount}`;
    intensityElement.textContent = `Demand Index: ${intensity.toFixed(2)}`;

    const densityPercent = Math.round(Math.min(1, roundaboutDensity) * 100);
    roundaboutElement.textContent = `Roundabout: ${roundaboutCount} vehicles (${densityPercent}% load)`;
    queueElement.textContent = `Heaviest Queue: ${maxApproachQueue} vehicles`;

    if (incident) {
        const minutesRemaining = Math.max(1, Math.ceil(incident.remainingMinutes));
        incidentElement.textContent = `Active Incident: ${incident.reason} near ${incident.label} (~${minutesRemaining} min)`;
        incidentElement.classList.add('active');
    } else {
        incidentElement.textContent = 'No active incidents';
        incidentElement.classList.remove('active');
    }
}

function animate(timestamp, clouds) {
    requestAnimationFrame(nextTimestamp => animate(nextTimestamp, clouds));

    const deltaTime = (timestamp - lastTimestamp) / 1000;
    lastTimestamp = timestamp;
    const dt = Math.min(deltaTime, 0.1);

    clouds.forEach((cloud, index) => {
        cloud.position.x += Math.sin(timestamp * 0.00005 + index) * 0.02;
        cloud.position.z += Math.cos(timestamp * 0.00004 + index) * 0.015;
    });

    if (dt > 0) {
        const simState = simulation.update(dt, scene);
        ambientLight.intensity = 0.65;
        updateUI(simState);
    }

    const orbitRadius = 220;
    const orbitSpeed = 0.00006;
    const cameraAngle = timestamp * orbitSpeed;
    camera.position.x = Math.cos(cameraAngle) * orbitRadius;
    camera.position.z = Math.sin(cameraAngle) * orbitRadius;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    renderer.render(scene, camera);
}

init();
