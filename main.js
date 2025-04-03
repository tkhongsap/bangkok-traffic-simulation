import * as THREE from 'three';
// import { OrbitControls } from 'three/addons/controls/OrbitControls.js'; // Optional: For camera control

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

// --- Simulation State ---
let simulationTime = new Date(); // We'll set this properly later
simulationTime.setHours(8, 0, 0, 0);
const startTime = 8 * 60 * 60 * 1000; // 08:00 in milliseconds
const endTime = 20 * 60 * 60 * 1000;   // 20:00 in milliseconds
const simulationSpeedMultiplier = 60; // e.g., 60x real-time
let lastTimestamp = 0;

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
// Group to hold map meshes for easier management
const mapGroup = new THREE.Group();

function init() {
    // Get container and UI elements
    simulationContainer = document.getElementById('simulation-container');
    timeDisplayElement = document.getElementById('time-display');
    vehicleCountElement = document.getElementById('vehicle-count');

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

    // FR1.2, FR2.1, FR2.2: Create Map Geometry
    createMapGeometry();

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

// FR1.2, FR2.1, FR2.2: Render the defined map data as 3D geometry
function createMapGeometry() {
    console.log("Creating map geometry from mapData...");
    mapGroup.clear(); // Clear previous geometry if any

    const roadMaterial = new THREE.MeshLambertMaterial({ color: ROAD_COLOR });
    const islandMaterial = new THREE.MeshLambertMaterial({ color: ISLAND_COLOR });
    const markingMaterial = new THREE.LineBasicMaterial({ color: MARKING_COLOR, linewidth: 1 }); // Note: linewidth might not work on all platforms

    // Central Island (circular)
    const islandRadius = ROUNDABOUT_RADIUS - ROAD_WIDTH / 2; // Inner radius of roundabout road
    const islandGeometry = new THREE.CylinderGeometry(islandRadius, islandRadius, 0.2, 32); // radiusTop, radiusBottom, height, radialSegments
    const islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
    islandMesh.position.y = 0.1; // Slightly above ground
    // islandMesh.receiveShadow = true;
    mapGroup.add(islandMesh);

    // Roundabout Road (using a Torus)
    const roundaboutRoadGeometry = new THREE.TorusGeometry(ROUNDABOUT_RADIUS, ROAD_WIDTH / 2, 16, 64); // radius, tubeRadius, radialSegments, tubularSegments
    const roundaboutRoadMesh = new THREE.Mesh(roundaboutRoadGeometry, roadMaterial);
    roundaboutRoadMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat
    roundaboutRoadMesh.position.y = 0.05; // Slightly above ground plane
    // roundaboutRoadMesh.receiveShadow = true;
    mapGroup.add(roundaboutRoadMesh);

    // Roundabout Lane Markings (dashed circle) - Approximation
    const numMarkingSegments = 64;
    const markingRadius = ROUNDABOUT_RADIUS; // Center line
    const markingPoints = [];
    for (let i = 0; i <= numMarkingSegments; i++) {
        const theta = (i / numMarkingSegments) * Math.PI * 2;
        markingPoints.push(new THREE.Vector3(Math.cos(theta) * markingRadius, 0.15, Math.sin(theta) * markingRadius));
    }
    const markingGeometry = new THREE.BufferGeometry().setFromPoints(markingPoints);
    const centerLine = new THREE.LineLoop(markingGeometry, markingMaterial); // Use LineLoop for closed circle
    centerLine.computeLineDistances(); // Required for dashed lines
    const dashedCenterLine = new THREE.LineDashedMaterial({
        color: MARKING_COLOR,
        linewidth: 1,
        scale: 1,
        dashSize: 1.5, // Length of dashes
        gapSize: 1,   // Length of gaps
    });
    const dashedLineMesh = new THREE.LineSegments(markingGeometry, dashedCenterLine); // Use LineSegments for dashed
    dashedLineMesh.computeLineDistances();
    mapGroup.add(dashedLineMesh);


    // Approach Roads (simple planes for now)
    mapData.segments.forEach(segment => {
        if (!segment.isRoundabout) {
            const startNode = mapData.nodes[segment.from];
            const endNode = mapData.nodes[segment.to];

            const startVec = new THREE.Vector3(startNode.x, 0, startNode.z);
            const endVec = new THREE.Vector3(endNode.x, 0, endNode.z);

            const length = startVec.distanceTo(endVec);
            const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
            const angle = Math.atan2(direction.x, direction.z); // Angle in XZ plane

            const roadGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, length);
            const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);

            // Position plane halfway between start and end nodes
            roadMesh.position.copy(startVec).add(endVec).multiplyScalar(0.5);
            roadMesh.position.y = 0.05; // Position slightly above ground

            // Orient the plane
            roadMesh.rotation.x = -Math.PI / 2; // Lay flat
            roadMesh.rotation.z = angle;        // Rotate to align with direction

            // roadMesh.receiveShadow = true;
            mapGroup.add(roadMesh);

             // Center Line Marking for Approach Roads
             const linePoints = [startVec.clone(), endVec.clone()];
             linePoints[0].y = 0.15; // Elevate slightly
             linePoints[1].y = 0.15;
             const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
             const lineMesh = new THREE.LineSegments(lineGeometry, dashedCenterLine); // Reuse dashed material
             lineMesh.computeLineDistances();
             mapGroup.add(lineMesh);
        }
    });

     // TODO: Add basic 3D building shapes (FR2.2) based on image layout (placeholder examples)
    const buildingMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc });
    const buildingGeometry1 = new THREE.BoxGeometry(15, 30, 15);
    const building1 = new THREE.Mesh(buildingGeometry1, buildingMaterial);
    building1.position.set(ROUNDABOUT_RADIUS + 30, 15, ROUNDABOUT_RADIUS + 30);
    // building1.castShadow = true;
    mapGroup.add(building1);

    const buildingGeometry2 = new THREE.BoxGeometry(20, 45, 10);
    const building2 = new THREE.Mesh(buildingGeometry2, buildingMaterial);
    building2.position.set(-(ROUNDABOUT_RADIUS + 25), 22.5, -(ROUNDABOUT_RADIUS + 20));
    // building2.castShadow = true;
    mapGroup.add(building2);

    console.log("Map geometry created.");
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateSimulation(deltaTime) {
    // --- Time Update (FR3.1) ---
    const elapsedMillis = deltaTime * simulationSpeedMultiplier;
    simulationTime.setTime(simulationTime.getTime() + elapsedMillis);

    // Reset or stop if simulation time exceeds end time
    if (simulationTime.getTime() > endTime) {
        simulationTime.setTime(startTime); // Loop back for now
        // Or potentially stop the simulation
    }

    // --- FR4: Vehicle Spawning ---
    spawnVehicles(deltaTime);

    // --- FR5: Vehicle Movement ---
    vehicles.forEach(vehicle => vehicle.update(deltaTime));

    // --- FR5.5: Remove Finished Vehicles ---
    removeFinishedVehicles();
}

function updateUI() {
    // Update Time Display (FR3.2)
    const hours = String(simulationTime.getHours()).padStart(2, '0');
    const minutes = String(simulationTime.getMinutes()).padStart(2, '0');
    timeDisplayElement.textContent = `Time: ${hours}:${minutes}`;

    // Update Vehicle Count (FR6.1)
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


function animate(timestamp) {
    requestAnimationFrame(animate); // Loop

    const deltaTime = (timestamp - lastTimestamp) / 1000; // Time delta in seconds
    lastTimestamp = timestamp;

    // Prevent large jumps if the tab was inactive (adjust threshold if needed)
    const dt = Math.min(deltaTime, 0.1); // Use clamped delta time for updates

    if (dt > 0) { // Only update if time has actually passed
        // Update simulation logic
        updateSimulation(dt);

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