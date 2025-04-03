import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Optional: For camera control
import { createMapGeometry } from './mapRenderer.js';
import * as simulation from './simulation.js';
import { mapData } from './mapData.js'; // Import mapData directly if needed for UI logic

// --- Constants --- 
// Removed map/vehicle constants, assuming they are handled in simulation/vehicle modules

// --- Basic Scene Setup ---
let scene, camera, renderer;
let simulationContainer;
let lastTimestamp = 0;
const mapGroup = new THREE.Group(); // Group to hold map meshes

// --- Simulation State ---
// Removed simulation time variables, assuming managed by simulation.js

// --- UI Elements ---
let timeDisplayElement;
let vehicleCountElement;
let peakIndicatorElement;

// --- Initialization Function --- 
function init() {
    // Get container and UI elements
    simulationContainer = document.getElementById('simulation-container');
    timeDisplayElement = document.getElementById('time-display');
    vehicleCountElement = document.getElementById('vehicle-count');
    peakIndicatorElement = document.getElementById('peak-indicator');

    // Set initial UI text directly
    timeDisplayElement.textContent = "Time: 08:00";
    vehicleCountElement.textContent = "Vehicles: 0";
    // Initial peak state might depend on simulation start time, let updateUI handle it or set default
    // peakIndicatorElement.textContent = "Peak Traffic (Morning)"; // Let updateUI handle initial state
    // peakIndicatorElement.classList.add("peak");

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Camera (Perspective) - FR2.3
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.position.set(0, 80, 120);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    simulationContainer.appendChild(renderer.domElement);

    // Lighting - FR2.6
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 25);
    scene.add(directionalLight);

    // Ground Plane (Placeholder)
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green grass
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // Add map group to scene
    scene.add(mapGroup);

    // Create Map Geometry (using imported function from mapRenderer.js)
    createMapGeometry(mapGroup); // Pass mapGroup to the renderer function

    // Optional: Orbit Controls for Camera
    // const controls = new OrbitControls(camera, renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start the animation loop
    lastTimestamp = performance.now();
    animate(lastTimestamp);
}

// --- Window Resize Handler --- 
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- UI Update Logic (FR3.2, FR6.1) --- 
function updateUI(simulationTime, vehicleCount) {
    // Update Time Display
    const hours = String(simulationTime.getHours()).padStart(2, '0');
    const minutes = String(simulationTime.getMinutes()).padStart(2, '0');
    timeDisplayElement.textContent = `Time: ${hours}:${minutes}`;

    // Update Peak Hour Indicator (FR4.3)
    // Use isPeakHour from the simulation module if needed, or pass status from simulation.update
    const isPeak = simulation.isPeakHour(simulationTime); // Assuming simulation module exports this
    
    if (isPeak) {
        const isMorning = simulationTime.getHours() < 12;
        peakIndicatorElement.textContent = isMorning ? 
            "Peak Traffic (Morning)" : "Peak Traffic (Evening)";
        peakIndicatorElement.classList.remove("normal");
        peakIndicatorElement.classList.add("peak");
    } else {
        peakIndicatorElement.textContent = "Normal Traffic";
        peakIndicatorElement.classList.remove("peak");
        peakIndicatorElement.classList.add("normal");
    }

    // Update Vehicle Count
    vehicleCountElement.textContent = `Vehicles: ${vehicleCount}`;
}


// --- Animation Loop --- (Calls simulation update)
function animate(timestamp) {
    requestAnimationFrame(animate); // Loop

    const deltaTime = (timestamp - lastTimestamp) / 1000; // Time delta in seconds
    lastTimestamp = timestamp;

    // Prevent large jumps if the tab was inactive (adjust threshold if needed)
    const dt = Math.min(deltaTime, 0.1); // Use clamped delta time for updates

    if (dt > 0) { // Only update if time has actually passed
        // Update simulation logic (imported function)
        // Assuming simulation.update returns the state needed for UI
        const simState = simulation.update(dt, scene);

        // Update UI elements using the returned state
        updateUI(simState.time, simState.vehicleCount);

        // Optional: Update controls if using OrbitControls with damping
        // controls.update();
    }

    // Render the scene
    renderer.render(scene, camera);
}

// --- Main Execution --- 
init();

// Removed Vehicle class, spawnVehicles, createVehicle, removeFinishedVehicles, isPeakHour, 
// mapData definition (use import), vehicles array, and related constants. 