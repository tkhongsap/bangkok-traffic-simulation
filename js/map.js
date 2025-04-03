import * as THREE from 'three';
import {
    state,
    ISLAND_RADIUS, ISLAND_HEIGHT, ISLAND_COLOR,
    ROAD_INNER_RADIUS, ROAD_OUTER_RADIUS, ROAD_COLOR,
    APPROACH_ROAD_WIDTH, APPROACH_ROAD_LENGTH, LINE_THICKNESS, LINE_COLOR,
    NUM_ROUNDABOUT_NODES
} from './constants.js';

let centralIslandMesh, roundaboutRoadMesh;

// Helper to add nodes (updates shared state)
function addNode(x, y, z, type = 'junction') {
    const id = state.nodeIdCounter++;
    const position = new THREE.Vector3(x, y, z);
    state.nodes.push({ id, position, type });
    if (type === 'entry') state.entryNodeIds.push(id);
    if (type === 'exit') state.exitNodeIds.push(id);
    return id;
}

export function createMapGeometry(scene) {
    // Materials
    const islandMaterial = new THREE.MeshStandardMaterial({ color: ISLAND_COLOR });
    const roadMaterial = new THREE.MeshStandardMaterial({ color: ROAD_COLOR, side: THREE.DoubleSide });
    const yellowLineMaterial = new THREE.MeshStandardMaterial({ color: LINE_COLOR });

    // Central Island (Cylinder)
    const islandGeometry = new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS, ISLAND_HEIGHT, 32);
    centralIslandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
    centralIslandMesh.position.set(0, ISLAND_HEIGHT / 2 - 0.5, 0); // Position base on ground plane
    centralIslandMesh.castShadow = true;
    scene.add(centralIslandMesh);

    // Roundabout Road Surface (Ring)
    const roadSegments = 64;
    const roadGeometry = new THREE.RingGeometry(ROAD_INNER_RADIUS, ROAD_OUTER_RADIUS, roadSegments);
    roundaboutRoadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roundaboutRoadMesh.rotation.x = -Math.PI / 2; // Rotate to lay flat
    roundaboutRoadMesh.position.y = -0.4; // Position slightly above ground plane
    roundaboutRoadMesh.receiveShadow = true;
    scene.add(roundaboutRoadMesh);

    // Approach Roads (Planes)
    const approachRoadGeometry = new THREE.PlaneGeometry(APPROACH_ROAD_WIDTH, APPROACH_ROAD_LENGTH);
    const approachLineGeometry = new THREE.PlaneGeometry(LINE_THICKNESS, APPROACH_ROAD_LENGTH);

    // Define angles for road connections (radians, counter-clockwise from positive X)
    const roadAngles = {
        N: Math.PI / 2,    // North = 90 deg
        E: 0,              // East = 0 deg
        SE: -Math.PI / 4,  // SE = -45 deg
        W: Math.PI         // West = 180 deg
    };

    // Create roads based on angles
    for (const dir in roadAngles) {
        const angle = roadAngles[dir];

        // Calculate direction vector (away from center)
        const dirX = Math.cos(angle);
        const dirZ = Math.sin(angle);

        // Calculate connection point at outer radius
        const connectX = dirX * ROAD_OUTER_RADIUS;
        const connectZ = dirZ * ROAD_OUTER_RADIUS;

        // Calculate center position of the road plane
        // Move half length along the direction vector from the connection point
        const centerX = connectX + dirX * (APPROACH_ROAD_LENGTH / 2);
        const centerZ = connectZ + dirZ * (APPROACH_ROAD_LENGTH / 2);

        // Calculate rotation needed to align plane length with the direction
        const rotationY = -angle + Math.PI / 2;

        // Create Road Mesh
        const roadMesh = new THREE.Mesh(approachRoadGeometry, roadMaterial);
        roadMesh.rotation.x = -Math.PI / 2; // Lay flat
        roadMesh.rotation.y = rotationY;    // Align direction
        roadMesh.position.set(centerX, -0.4, centerZ); // Position center
        roadMesh.receiveShadow = true;
        scene.add(roadMesh);

        // Create Line Mesh
        const lineMesh = new THREE.Mesh(approachLineGeometry, yellowLineMaterial);
        lineMesh.rotation.x = -Math.PI / 2; // Lay flat
        lineMesh.rotation.y = rotationY;    // Align direction
        lineMesh.position.set(centerX, -0.3, centerZ); // Position center (slightly higher)
        scene.add(lineMesh);
    }

    definePathNodes();
    definePaths();

    console.log("Map geometry and paths created.");
    console.log("Nodes:", state.nodes);
    console.log("Paths:", state.paths);
}

function definePathNodes() {
    const nodeY = 0; // Place nodes on the road surface plane
    const pathRadius = (ROAD_INNER_RADIUS + ROAD_OUTER_RADIUS) / 2;
    const roundaboutNodeIds = [];

    // Roundabout Nodes (Counter-Clockwise)
    for (let i = 0; i < NUM_ROUNDABOUT_NODES; i++) {
        const angle = (i / NUM_ROUNDABOUT_NODES) * 2 * Math.PI;
        const x = pathRadius * Math.cos(angle);
        const z = pathRadius * Math.sin(angle);
        const id = addNode(x, nodeY, z, 'roundabout');
        roundaboutNodeIds.push(id);
    }
    state.roundaboutNodeIds = roundaboutNodeIds; // Store for path generation

    // Entry/Exit Nodes
    const approachLengthEnd = ROAD_OUTER_RADIUS + APPROACH_ROAD_LENGTH;
    const entryOffset = APPROACH_ROAD_WIDTH * 0.25;

    // Node indices for connections (approximate)
    state.nConnectIndex = Math.round(NUM_ROUNDABOUT_NODES * 0.75); // ~North (3 PI/2)
    state.eConnectIndex = 0;                                     // East   (0)
    // state.sConnectIndex = Math.round(NUM_ROUNDABOUT_NODES * 0.25); // Removed South
    state.wConnectIndex = Math.round(NUM_ROUNDABOUT_NODES * 0.50); // West   (PI)
    state.seConnectIndex = Math.round(NUM_ROUNDABOUT_NODES * 0.125); // ~SE (PI/4)

    // North (Negative Z)
    state.nEntry = addNode(-entryOffset, nodeY, -approachLengthEnd, 'entry');
    state.nExit = addNode(entryOffset, nodeY, -approachLengthEnd, 'exit');
    // East (Positive X)
    state.eEntry = addNode(approachLengthEnd, nodeY, entryOffset, 'entry');
    state.eExit = addNode(approachLengthEnd, nodeY, -entryOffset, 'exit');
    // South (Positive Z)
    // state.sEntry = addNode(entryOffset, nodeY, approachLengthEnd, 'entry'); // Removed South
    // state.sExit = addNode(-entryOffset, nodeY, approachLengthEnd, 'exit'); // Removed South
    // West (Negative X)
    state.wEntry = addNode(-approachLengthEnd, nodeY, -entryOffset, 'entry');
    state.wExit = addNode(-approachLengthEnd, nodeY, entryOffset, 'exit');

    // SE (approx 45 deg)
    const seAngleRad = Math.PI / 4;
    const seDirX = Math.cos(seAngleRad);
    const seDirZ = Math.sin(seAngleRad);
    // Calculate end point
    const seEndX = seDirX * approachLengthEnd;
    const seEndZ = seDirZ * approachLengthEnd;
    // Calculate offset perpendicular to SE direction for entry/exit lanes
    const perpX = -seDirZ * entryOffset;
    const perpZ = seDirX * entryOffset;
    state.seEntry = addNode(seEndX + perpX, nodeY, seEndZ + perpZ, 'entry');
    state.seExit = addNode(seEndX - perpX, nodeY, seEndZ - perpZ, 'exit');
}

function definePaths() {
    const { roundaboutNodeIds, nConnectIndex, eConnectIndex, seConnectIndex, wConnectIndex,
            nEntry, nExit, eEntry, eExit, seEntry, seExit, wEntry, wExit } = state;

    function addPathInternal(nodeSequence) {
        if (nodeSequence.length >= 2) {
            state.paths.push({
                startNodeId: nodeSequence[0],
                endNodeId: nodeSequence[nodeSequence.length - 1],
                nodeIds: nodeSequence
            });
        }
    }

    function getRoundaboutSequence(startIndex, endIndex) {
        const sequence = [];
        let currentIndex = startIndex;
        if (!roundaboutNodeIds || roundaboutNodeIds.length === 0) return sequence;
        while (true) {
            sequence.push(roundaboutNodeIds[currentIndex]);
            if (currentIndex === endIndex) break;
            currentIndex = (currentIndex + 1) % NUM_ROUNDABOUT_NODES;
            if (sequence.length > NUM_ROUNDABOUT_NODES * 2) break; // Safety break
        }
        return sequence;
    }

    // Define exit connection points (node *before* the one closest to exit direction)
    const nExitConnect = (nConnectIndex - 1 + NUM_ROUNDABOUT_NODES) % NUM_ROUNDABOUT_NODES;
    const eExitConnect = (eConnectIndex - 1 + NUM_ROUNDABOUT_NODES) % NUM_ROUNDABOUT_NODES;
    const seExitConnect = (seConnectIndex - 1 + NUM_ROUNDABOUT_NODES) % NUM_ROUNDABOUT_NODES;
    const wExitConnect = (wConnectIndex - 1 + NUM_ROUNDABOUT_NODES) % NUM_ROUNDABOUT_NODES;

    // N -> E, SE, W
    addPathInternal([nEntry, ...getRoundaboutSequence(nConnectIndex, eExitConnect), eExit]);
    addPathInternal([nEntry, ...getRoundaboutSequence(nConnectIndex, seExitConnect), seExit]);
    addPathInternal([nEntry, ...getRoundaboutSequence(nConnectIndex, wExitConnect), wExit]);

    // E -> SE, W, N
    addPathInternal([eEntry, ...getRoundaboutSequence(eConnectIndex, seExitConnect), seExit]);
    addPathInternal([eEntry, ...getRoundaboutSequence(eConnectIndex, wExitConnect), wExit]);
    addPathInternal([eEntry, ...getRoundaboutSequence(eConnectIndex, nExitConnect), nExit]);

    // SE -> W, N, E
    addPathInternal([seEntry, ...getRoundaboutSequence(seConnectIndex, wExitConnect), wExit]);
    addPathInternal([seEntry, ...getRoundaboutSequence(seConnectIndex, nExitConnect), nExit]);
    addPathInternal([seEntry, ...getRoundaboutSequence(seConnectIndex, eExitConnect), eExit]);

    // W -> N, E, SE
    addPathInternal([wEntry, ...getRoundaboutSequence(wConnectIndex, nExitConnect), nExit]);
    addPathInternal([wEntry, ...getRoundaboutSequence(wConnectIndex, eExitConnect), eExit]);
    addPathInternal([wEntry, ...getRoundaboutSequence(wConnectIndex, seExitConnect), seExit]);
} 