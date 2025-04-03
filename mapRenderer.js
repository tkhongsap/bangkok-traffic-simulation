import * as THREE from 'three';
import { mapData, ROAD_WIDTH, ROUNDABOUT_RADIUS, ROAD_COLOR, ISLAND_COLOR, MARKING_COLOR, BUILDING_COLOR, LANE_WIDTH } from './mapData.js';

// Materials (can be shared)
const roadMaterial = new THREE.MeshLambertMaterial({ color: ROAD_COLOR });
const islandMaterial = new THREE.MeshLambertMaterial({ color: ISLAND_COLOR });

// Create building materials with window patterns
function createBuildingMaterial(color = BUILDING_COLOR) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 512;

    // Base color
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw windows pattern
    context.fillStyle = '#444444';
    const windowSize = 40;
    const windowGap = 20;
    const doorWidth = 60;
    const doorHeight = 100;

    // Draw windows
    for (let y = windowGap; y < canvas.height - windowGap; y += windowSize + windowGap) {
        for (let x = windowGap; x < canvas.width - windowGap; x += windowSize + windowGap) {
            // Skip door area in the middle bottom
            if (!(y > canvas.height - doorHeight * 1.5 && 
                  x > (canvas.width - doorWidth) / 2 && 
                  x < (canvas.width + doorWidth) / 2)) {
                context.fillRect(x, y, windowSize, windowSize);
                
                // Window frame
                context.strokeStyle = '#666666';
                context.strokeRect(x, y, windowSize, windowSize);
            }
        }
    }

    // Draw door
    context.fillStyle = '#333333';
    context.fillRect(
        (canvas.width - doorWidth) / 2,
        canvas.height - doorHeight,
        doorWidth,
        doorHeight
    );

    // Door frame
    context.strokeStyle = '#666666';
    context.lineWidth = 2;
    context.strokeRect(
        (canvas.width - doorWidth) / 2,
        canvas.height - doorHeight,
        doorWidth,
        doorHeight
    );

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.FrontSide
    });
}

const buildingMaterial = createBuildingMaterial(BUILDING_COLOR);
const dashedLineMaterial = new THREE.LineDashedMaterial({
    color: MARKING_COLOR,
    linewidth: 1,
    scale: 1,
    dashSize: 1.5,
    gapSize: 1,
});
const solidLineMaterial = new THREE.LineBasicMaterial({ color: MARKING_COLOR });

/**
 * Creates and adds the 3D geometry for the map (roads, island, buildings) to the scene graph.
 * @param {THREE.Group} mapGroup - The group to add map meshes to.
 */
export function createMapGeometry(mapGroup) {
    console.log("Creating map geometry from mapData...");
    mapGroup.clear(); // Clear previous geometry

    // --- Central Island ---
    const islandRadius = ROUNDABOUT_RADIUS - ROAD_WIDTH / 2; // Inner radius of roundabout road
    const islandGeometry = new THREE.CylinderGeometry(islandRadius, islandRadius, 0.2, 32);
    const islandMesh = new THREE.Mesh(islandGeometry, islandMaterial);
    islandMesh.position.y = 0.1;
    mapGroup.add(islandMesh);

    // --- Roads & Markings ---
    // Roundabout Road Surface (Torus)
    const roundaboutRoadGeometry = new THREE.TorusGeometry(ROUNDABOUT_RADIUS, ROAD_WIDTH / 2, 16, 64);
    const roundaboutRoadMesh = new THREE.Mesh(roundaboutRoadGeometry, roadMaterial);
    roundaboutRoadMesh.rotation.x = -Math.PI / 2;
    roundaboutRoadMesh.position.y = 0.05;
    mapGroup.add(roundaboutRoadMesh);

    // Roundabout Lane Markings (Multiple dashed circles - FR1.3 visual)
    const numMarkingSegments = 64;
    const numLanesRoundabout = mapData.segments.find(s => s.isRoundabout)?.lanes || 1;
    for (let laneIndex = 1; laneIndex < numLanesRoundabout; laneIndex++) {
        const markingRadius = ROUNDABOUT_RADIUS - (ROAD_WIDTH / 2) + (laneIndex * LANE_WIDTH);
        const markingPoints = [];
        for (let i = 0; i <= numMarkingSegments; i++) {
            const theta = (i / numMarkingSegments) * Math.PI * 2;
            markingPoints.push(new THREE.Vector3(Math.cos(theta) * markingRadius, 0.15, Math.sin(theta) * markingRadius));
        }
        const markingGeometry = new THREE.BufferGeometry().setFromPoints(markingPoints);
        const dashedLineMesh = new THREE.LineSegments(markingGeometry, dashedLineMaterial.clone()); // Clone material if needed later
        dashedLineMesh.computeLineDistances();
        mapGroup.add(dashedLineMesh);
    }

    // Approach Roads Surfaces (Planes) & Markings
    mapData.segments.forEach(segment => {
        if (!segment.isRoundabout) {
            const startNode = mapData.nodes[segment.from];
            const endNode = mapData.nodes[segment.to];
            if (!startNode || !endNode) {
                console.error(`Missing node for segment ${segment.id}`);
                return;
            }

            const startVec = new THREE.Vector3(startNode.x, 0, startNode.z);
            const endVec = new THREE.Vector3(endNode.x, 0, endNode.z);

            const length = startVec.distanceTo(endVec);
            if (length < 0.01) return; // Skip zero-length segments

            const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
            const angle = Math.atan2(direction.x, direction.z); // Angle in XZ plane

            // Road Surface
            const roadGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, length);
            const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
            roadMesh.position.copy(startVec).add(endVec).multiplyScalar(0.5);
            roadMesh.position.y = 0.05;
            roadMesh.rotation.x = -Math.PI / 2;
            roadMesh.rotation.z = angle;
            mapGroup.add(roadMesh);

            // Lane Markings (Multiple dashed lines - FR1.3 visual)
            const numLanesApproach = segment.lanes || 1;
            const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x); // Perpendicular vector in XZ plane

            for (let laneIndex = 1; laneIndex < numLanesApproach; laneIndex++) {
                const offset = perpendicular.clone().multiplyScalar(-(ROAD_WIDTH / 2) + (laneIndex * LANE_WIDTH));
                const lineStart = startVec.clone().add(offset);
                const lineEnd = endVec.clone().add(offset);
                lineStart.y = lineEnd.y = 0.15; // Elevate slightly

                const lineGeometry = new THREE.BufferGeometry().setFromPoints([lineStart, lineEnd]);
                const lineMesh = new THREE.LineSegments(lineGeometry, dashedLineMaterial.clone());
                lineMesh.computeLineDistances();
                mapGroup.add(lineMesh);
            }
        }
    });

    // --- Buildings (FR1.1 / FR2.2) ---
    mapData.buildings.forEach(buildingData => {
        const geom = new THREE.BoxGeometry(buildingData.width, buildingData.height, buildingData.depth);
        
        // Calculate UV repeat based on building size
        const repeatX = Math.max(1, Math.round(buildingData.width / 10));
        const repeatY = Math.max(1, Math.round(buildingData.height / 10));
        
        // Update UV mapping for proper texture scaling
        geom.attributes.uv.array = new Float32Array([
            // Front
            0, repeatY, repeatX, repeatY, 0, 0, repeatX, 0,
            // Back
            0, repeatY, repeatX, repeatY, 0, 0, repeatX, 0,
            // Top
            0, 1, 1, 1, 0, 0, 1, 0,
            // Bottom
            0, 1, 1, 1, 0, 0, 1, 0,
            // Right
            0, repeatY, repeatX, repeatY, 0, 0, repeatX, 0,
            // Left
            0, repeatY, repeatX, repeatY, 0, 0, repeatX, 0
        ]);

        const mesh = new THREE.Mesh(geom, buildingMaterial);
        mesh.position.set(buildingData.x, buildingData.height / 2, buildingData.z);
        mapGroup.add(mesh);
    });

    console.log("Map geometry created.");
} 