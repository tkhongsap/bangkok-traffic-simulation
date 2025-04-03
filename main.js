import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Optional: For camera control
import { createMapGeometry } from './mapRenderer.js';
import { updateSimulation, getSimulationTime, getVehicles } from './simulation.js';

// --- Constants ---
const ROAD_WIDTH = 8;
const LANE_WIDTH = ROAD_WIDTH / 2; // Simple 2 lanes for now
const ROUNDABOUT_RADIUS = 30;
const APPROACH_ROAD_LENGTH = 60;
const ROAD_COLOR = 0x444444; // Dark grey
const ISLAND_COLOR = 0x228B22; // Forest green
const MARKING_COLOR = 0xFFFFFF; // White

// --- Basic Scene Setup ---
let scene, camera, renderer;
let simulationContainer;
let lastTimestamp = 0;
const mapGroup = new THREE.Group(); // Group to hold map meshes

// --- Simulation State ---
let simulationTime = new Date(); // We'll set this properly later
simulationTime.setHours(8, 0, 0, 0);
const startTime = 8 * 60 * 60 * 1000; // 08:00 in milliseconds
const endTime = 20 * 60 * 60 * 1000;   // 20:00 in milliseconds
const simulationSpeedMultiplier = 60; // e.g., 60x real-time

// --- UI Elements ---
let timeDisplayElement;
let vehicleCountElement;

// --- Simulation Objects ---
// FR1: Define map data structure (nodes, segments)
const mapData = {
    nodes: {
        // Roundabout center (not directly used for pathing)
        center: { id: 'center', x: 0, y: 0, z: 0 },
        // Roundabout entry/exit nodes (approximate)
        r1: { id: 'r1', x: ROUNDABOUT_RADIUS, y: 0, z: 0 }, // East
        r2: { id: 'r2', x: 0, y: 0, z: ROUNDABOUT_RADIUS }, // South
        r3: { id: 'r3', x: -ROUNDABOUT_RADIUS, y: 0, z: 0 }, // West
        r4: { id: 'r4', x: 0, y: 0, z: -ROUNDABOUT_RADIUS }, // North
        // Approach road start points (entry/exit)
        a1_start: { id: 'a1_start', x: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, y: 0, z: 0, isEntryPoint: true, isExitPoint: true }, // East
        a2_start: { id: 'a2_start', x: 0, y: 0, z: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, isEntryPoint: true, isExitPoint: true }, // South
        a3_start: { id: 'a3_start', x: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), y: 0, z: 0, isEntryPoint: true, isExitPoint: true }, // West
        a4_start: { id: 'a4_start', x: 0, y: 0, z: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), isEntryPoint: true, isExitPoint: true }, // North
    },
    segments: [
        // Approach Roads (connecting start points to roundabout entries)
        { id: 's_a1', from: 'a1_start', to: 'r1' },
        { id: 's_a2', from: 'a2_start', to: 'r2' },
        { id: 's_a3', from: 'a3_start', to: 'r3' },
        { id: 's_a4', from: 'a4_start', to: 'r4' },
        // Roundabout segments (clockwise for now)
        { id: 's_r1r2', from: 'r1', to: 'r2', isRoundabout: true },
        { id: 's_r2r3', from: 'r2', to: 'r3', isRoundabout: true },
        { id: 's_r3r4', from: 'r3', to: 'r4', isRoundabout: true },
        { id: 's_r4r1', from: 'r4', to: 'r1', isRoundabout: true },
    ],
    paths: [] // Will define vehicle paths later
};

// TODO: Store active vehicles - FR5.5, FR6.1
const vehicles = [];

// --- Initialization Function ---
function init() {
    // Get container and UI elements
    simulationContainer = document.getElementById('simulation-container');
    timeDisplayElement = document.getElementById('time-display');
    vehicleCountElement = document.getElementById('vehicle-count');

    // ---> Set initial UI text directly <---
    timeDisplayElement.textContent = "Time: 08:00";
    vehicleCountElement.textContent = "Vehicles: 0";

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Camera (Perspective) - FR2.3
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    // Adjusted camera position for better view of the larger layout
    camera.position.set(0, 80, 120);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    simulationContainer.appendChild(renderer.domElement);

    // Lighting - FR2.6
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter ambient
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8); // Slightly less intense directional
    directionalLight.position.set(50, 100, 25);
    // Optional: Add shadow casting
    // directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Ground Plane (Placeholder)
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 }); // Light green grass
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -0.1; // Lower slightly to avoid z-fighting with roads
    // Optional: Receive shadows
    // ground.receiveShadow = true;
    scene.add(ground);

    // Add map group to scene
    scene.add(mapGroup);

    // Create Map Geometry (using imported function)
    createMapGeometry(mapGroup);

    // Optional: Orbit Controls for Camera
    // const controls = new OrbitControls(camera, renderer.domElement);
    // controls.enableDamping = true;
    // controls.dampingFactor = 0.05;
    // controls.screenSpacePanning = false;
    // controls.minDistance = 50;
    // controls.maxDistance = 300;
    // controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent looking from below ground

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
function updateUI() {
    const simTime = getSimulationTime();
    const vehicles = getVehicles();

    // Update Time Display
    const hours = String(simTime.getHours()).padStart(2, '0');
    const minutes = String(simTime.getMinutes()).padStart(2, '0');
    timeDisplayElement.textContent = `Time: ${hours}:${minutes}`;

    // Update Vehicle Count
    vehicleCountElement.textContent = `Vehicles: ${vehicles.length}`;
}

// --- FR4: Vehicle Spawning ---
const BASE_SPAWN_INTERVAL = 5; // Seconds between spawns (base rate)
const PEAK_HOUR_MULTIPLIER = 0.5; // Spawn interval multiplier during peak (lower = more spawns)
let timeSinceLastSpawn = {}; // Track time per entry point

function isPeakHour(simTime) {
    const hours = simTime.getHours();
    // Example peak hours: 8:00-9:30 and 17:00-19:00
    return (hours >= 8 && hours < 10) || (hours >= 17 && hours < 19);
}

function spawnVehicles(deltaTime) {
    const currentSpawnInterval = isPeakHour(simulationTime)
        ? BASE_SPAWN_INTERVAL * PEAK_HOUR_MULTIPLIER
        : BASE_SPAWN_INTERVAL;

    Object.values(mapData.nodes).filter(node => node.isEntryPoint).forEach(entryNode => {
        if (timeSinceLastSpawn[entryNode.id] === undefined) {
            timeSinceLastSpawn[entryNode.id] = currentSpawnInterval; // Initialize staggered
        }

        timeSinceLastSpawn[entryNode.id] += deltaTime;

        if (timeSinceLastSpawn[entryNode.id] >= currentSpawnInterval) {
            // Random chance to spawn even if interval met, prevents constant stream
            if (Math.random() < 0.7) { // 70% chance to spawn
                createVehicle(entryNode.id);
                timeSinceLastSpawn[entryNode.id] = 0; // Reset timer
            } else {
                 // Slightly delay next check if we decided not to spawn
                 timeSinceLastSpawn[entryNode.id] = currentSpawnInterval * 0.8;
            }
        }
    });
}

// --- FR5: Vehicle Representation & Movement ---
const VEHICLE_LENGTH = 4;
const VEHICLE_WIDTH = 2;
const VEHICLE_HEIGHT = 1.5;
const MAX_SPEED = 20; // meters per second
const ACCELERATION = 5; // meters per second^2
const DECELERATION = 8; // meters per second^2 (braking)
const SAFE_DISTANCE = VEHICLE_LENGTH * 1.5; // Safe following distance

class Vehicle {
    constructor(startNodeId) {
        this.id = THREE.MathUtils.generateUUID();
        this.geometry = new THREE.BoxGeometry(VEHICLE_LENGTH, VEHICLE_HEIGHT, VEHICLE_WIDTH);
        // Initial color (FR6.2) - Green for moving
        this.material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        // this.mesh.castShadow = true; // Optional shadows

        const startNode = mapData.nodes[startNodeId];
        this.mesh.position.set(startNode.x, VEHICLE_HEIGHT / 2, startNode.z);

        // Assign a random path (simple for now: enter, go around once, exit opposite)
        this.path = this.generateSimplePath(startNodeId);
        this.currentSegmentIndex = 0;
        this.progressOnSegment = 0; // 0 to 1
        this.currentSpeed = 0; // Current speed m/s

        console.log(`Vehicle ${this.id} created at ${startNodeId}, path: ${this.path.map(s => s.id).join('->')}`);
        scene.add(this.mesh); // Add mesh to the main scene
    }

    // Generates a simple path: enter, one full loop, exit opposite side
    generateSimplePath(entryNodeId) {
        const entrySegment = mapData.segments.find(s => s.from === entryNodeId || s.to === entryNodeId);
        if (!entrySegment) return [];

        const entryRoundaboutNodeId = (entrySegment.from === entryNodeId) ? entrySegment.to : entrySegment.from;
        const roundaboutSegments = mapData.segments.filter(s => s.isRoundabout);

        // Find the starting segment on the roundabout
        let currentRoundaboutNodeId = entryRoundaboutNodeId;
        const pathSegments = [entrySegment];

        // Add all roundabout segments in order
        for (let i = 0; i < roundaboutSegments.length; i++) {
             const nextSegment = roundaboutSegments.find(s => s.from === currentRoundaboutNodeId);
             if(nextSegment){
                pathSegments.push(nextSegment);
                currentRoundaboutNodeId = nextSegment.to;
             } else {
                 console.error("Could not find next roundabout segment from", currentRoundaboutNodeId);
                 break; // Should not happen in simple circular case
             }
        }

        // Find exit segment (opposite the entry roundabout node)
         // Determine opposite node roughly (e.g., r1 -> r3, r2 -> r4)
         let targetExitRoundaboutNodeId = '';
         if (entryRoundaboutNodeId === 'r1') targetExitRoundaboutNodeId = 'r3';
         else if (entryRoundaboutNodeId === 'r2') targetExitRoundaboutNodeId = 'r4';
         else if (entryRoundaboutNodeId === 'r3') targetExitRoundaboutNodeId = 'r1';
         else if (entryRoundaboutNodeId === 'r4') targetExitRoundaboutNodeId = 'r2';

         // Add roundabout segments until the target exit node is reached
         currentRoundaboutNodeId = entryRoundaboutNodeId; // Restart from entry to find exit path
         const exitPathSegments = [entrySegment]; // Start with the entry segment for context if needed

         for (let i = 0; i < roundaboutSegments.length; i++) {
             const nextSegment = roundaboutSegments.find(s => s.from === currentRoundaboutNodeId);
             if(nextSegment){
                 exitPathSegments.push(nextSegment);
                 currentRoundaboutNodeId = nextSegment.to;
                 if (currentRoundaboutNodeId === targetExitRoundaboutNodeId) {
                     const exitSegment = mapData.segments.find(s => s.to === currentRoundaboutNodeId && s.from !== entrySegment.from && s.from !== entrySegment.to && !s.isRoundabout);
                     if (exitSegment) {
                         exitPathSegments.push(exitSegment);
                         return exitPathSegments; // Found complete path
                     } else {
                         console.error("Could not find exit approach segment from", currentRoundaboutNodeId);
                         return exitPathSegments; // Return path up to exit node anyway
                     }
                 }
             } else {
                  console.error("Could not find next roundabout segment from", currentRoundaboutNodeId);
                  break;
             }
        }

        console.warn("Could not generate a full exit path for vehicle starting at", entryNodeId);
        return pathSegments; // Fallback: just return the entry + one loop

    }


    update(deltaTime) {
        if (this.currentSegmentIndex >= this.path.length) {
            this.markForRemoval = true; // Reached end of path
            return;
        }

        const segment = this.path[this.currentSegmentIndex];
        const startNode = mapData.nodes[segment.from];
        const endNode = mapData.nodes[segment.to];
        const startVec = new THREE.Vector3(startNode.x, 0, startNode.z);
        const endVec = new THREE.Vector3(endNode.x, 0, endNode.z);

        let segmentLength;
        let targetPosition;
        let direction;

        if (segment.isRoundabout) {
            // Movement along the roundabout arc
             const angleStart = Math.atan2(startVec.z, startVec.x);
             let angleEnd = Math.atan2(endVec.z, endVec.x);

             // Handle angle wrap-around (e.g., from +pi to -pi)
             // Assuming clockwise movement: if end angle is smaller, add 2*PI
             if (angleEnd < angleStart) {
                angleEnd += Math.PI * 2;
             }

             segmentLength = (angleEnd - angleStart) * ROUNDABOUT_RADIUS;
             if (segmentLength <= 0) segmentLength = 0.01; // Avoid division by zero if nodes are identical

              // Accelerate towards max speed
             this.currentSpeed = Math.min(MAX_SPEED, this.currentSpeed + ACCELERATION * deltaTime);

             const distanceToTravel = this.currentSpeed * deltaTime;
             this.progressOnSegment += distanceToTravel / segmentLength;


             const currentAngle = angleStart + (angleEnd - angleStart) * this.progressOnSegment;
             targetPosition = new THREE.Vector3(
                 Math.cos(currentAngle) * ROUNDABOUT_RADIUS,
                 VEHICLE_HEIGHT / 2,
                 Math.sin(currentAngle) * ROUNDABOUT_RADIUS
             );
             // Direction tangent to the circle
              direction = new THREE.Vector3(-Math.sin(currentAngle), 0, Math.cos(currentAngle)).normalize();

        } else {
            // Movement along a straight approach road
            segmentLength = startVec.distanceTo(endVec);
             if (segmentLength <= 0) segmentLength = 0.01; // Avoid division by zero

             // Accelerate towards max speed
             this.currentSpeed = Math.min(MAX_SPEED, this.currentSpeed + ACCELERATION * deltaTime);

             const distanceToTravel = this.currentSpeed * deltaTime;
             this.progressOnSegment += distanceToTravel / segmentLength;

             targetPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
             targetPosition.y = VEHICLE_HEIGHT / 2; // Ensure correct height
              direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
        }


         // Update mesh position
         this.mesh.position.copy(targetPosition);

         // Update mesh rotation to face direction of travel
         if (direction && direction.lengthSq() > 0.001) {
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;
         }


        // --- FR6.2: Update color based on speed ---
        const speedRatio = this.currentSpeed / MAX_SPEED;
        if (speedRatio < 0.1) {
            this.material.color.setHex(0xff0000); // Red (stopped/slow)
        } else if (speedRatio < 0.6) {
            this.material.color.setHex(0xffff00); // Yellow (medium)
        } else {
            this.material.color.setHex(0x00ff00); // Green (fast)
        }


        // Move to next segment if progress exceeds 1
        if (this.progressOnSegment >= 1.0) {
            this.currentSegmentIndex++;
            this.progressOnSegment = 0; // Reset progress for the new segment
            // Small correction to place exactly at node if overshot significantly? Maybe not needed.
             if (this.currentSegmentIndex < this.path.length) {
                 const nextStartNode = mapData.nodes[this.path[this.currentSegmentIndex].from];
                 this.mesh.position.set(nextStartNode.x, VEHICLE_HEIGHT / 2, nextStartNode.z);
             }
        }
    }

    dispose() {
        scene.remove(this.mesh);
        this.geometry.dispose();
        this.material.dispose();
    }
}

function createVehicle(startNodeId) {
    const vehicle = new Vehicle(startNodeId);
    vehicles.push(vehicle);
}

// FR5.5: Remove vehicles that have finished their path
function removeFinishedVehicles() {
    for (let i = vehicles.length - 1; i >= 0; i--) {
        if (vehicles[i].markForRemoval) {
            vehicles[i].dispose();
            vehicles.splice(i, 1);
            // console.log("Removed vehicle");
        }
    }
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
        updateSimulation(dt, scene);

        // Update UI elements
        updateUI();

        // Optional: Update controls if using OrbitControls with damping
        // controls.update();
    }

    // Render the scene
    renderer.render(scene, camera);
}

// --- Main Execution ---
init(); 