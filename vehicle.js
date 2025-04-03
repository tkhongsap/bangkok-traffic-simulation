import * as THREE from 'three';
import { mapData, ROUNDABOUT_RADIUS, LANE_WIDTH, ROAD_WIDTH } from './mapData.js';

// --- Vehicle Constants ---
export const VEHICLE_LENGTH = 4;
export const VEHICLE_WIDTH = 2;
export const VEHICLE_HEIGHT = 1.5;
export const MAX_SPEED = 15; // m/s (~54 kph)
export const ACCELERATION = 3; // m/s^2
export const DECELERATION = 5; // m/s^2 (braking) - TODO: Implement usage
export const SAFE_DISTANCE = VEHICLE_LENGTH * 1.5; // TODO: Implement usage (FR5.3)

// --- Vehicle Class (FR5 / FR2.3 / FR6.2) ---
export class Vehicle {
    constructor(startNodeId, scene) {
        this.id = THREE.MathUtils.generateUUID();
        this.scene = scene; // Store scene reference for adding/removing mesh

        // FR2.3: Representation as simple 3D geometric shapes (boxes)
        this.geometry = new THREE.BoxGeometry(VEHICLE_LENGTH, VEHICLE_HEIGHT, VEHICLE_WIDTH);
        // FR6.2: Initial color - Green for moving
        this.material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        const startNode = mapData.nodes[startNodeId];
        if (!startNode) {
            console.error(`Invalid startNodeId provided to Vehicle constructor: ${startNodeId}`);
            this.markForRemoval = true;
            return;
        }

        // FR1.3: Assign a random lane (assuming lanes are 0, 1, 2, ... from inside to outside)
        // Find the entry segment to know how many lanes are available
        const entrySegment = mapData.segments.find(s => s.from === startNodeId || s.to === startNodeId);
        const numLanes = entrySegment?.lanes || 1;
        this.laneIndex = Math.floor(Math.random() * numLanes);

        this.mesh.position.set(startNode.x, VEHICLE_HEIGHT / 2, startNode.z);
        // TODO: Adjust initial position slightly based on laneIndex?

        // FR4.4: Assign a random valid path
        this.path = this.generateSimplePath(startNodeId);
        this.currentSegmentIndex = 0;
        this.progressOnSegment = 0; // Normalized progress (0 to 1)
        this.currentSpeed = 0; // Current speed m/s
        this.markForRemoval = false; // Flag for cleanup

        if (this.path && this.path.length > 0) {
            // console.log(`Vehicle ${this.id} created at ${startNodeId}, path: ${this.path.map(s => s.id).join('->')}`);
            this.scene.add(this.mesh); // Add mesh to the scene
        } else {
            console.warn(`Vehicle ${this.id} created at ${startNodeId} but could not generate a valid path. Marking for removal.`);
            this.markForRemoval = true;
        }
    }

    // FR4.4 / FR5.2 (Pathfinding): Generates a simple path
    generateSimplePath(entryNodeId) {
        const entrySegment = mapData.segments.find(s => s.from === entryNodeId || s.to === entryNodeId);
        if (!entrySegment) {
             console.error("Could not find entry segment for node:", entryNodeId);
             return [];
        }

        const travelsTowardsRoundabout = entrySegment.to === entryNodeId;
        const roundaboutEntryNodeId = travelsTowardsRoundabout ? entrySegment.from : entrySegment.to;

        const roundaboutSegments = mapData.segments.filter(s => s.isRoundabout);
        if (roundaboutSegments.length === 0) {
            console.error("No segments marked as 'isRoundabout: true' found in mapData.");
            return [entrySegment];
        }

        let targetExitRoundaboutNodeId = '';
        if (roundaboutEntryNodeId === 'r1') targetExitRoundaboutNodeId = 'r3';
        else if (roundaboutEntryNodeId === 'r2') targetExitRoundaboutNodeId = 'r4';
        else if (roundaboutEntryNodeId === 'r3') targetExitRoundaboutNodeId = 'r1';
        else if (roundaboutEntryNodeId === 'r4') targetExitRoundaboutNodeId = 'r2';
        else {
            console.error("Unknown roundabout entry node ID:", roundaboutEntryNodeId);
            return [entrySegment];
        }

        const pathSegments = [];
        if(travelsTowardsRoundabout){
             pathSegments.push({ ...entrySegment, from: entryNodeId, to: roundaboutEntryNodeId, reversed: true });
        } else {
            pathSegments.push(entrySegment);
        }

        let currentRoundaboutNodeId = roundaboutEntryNodeId;
        let loopCount = 0;
        const maxLoops = roundaboutSegments.length + 1;

        while(currentRoundaboutNodeId !== targetExitRoundaboutNodeId && loopCount < maxLoops) {
            const nextSegment = roundaboutSegments.find(s => s.from === currentRoundaboutNodeId);
            if (nextSegment) {
                pathSegments.push(nextSegment);
                currentRoundaboutNodeId = nextSegment.to;
            } else {
                console.error("Path generation failed: Could not find next roundabout segment from", currentRoundaboutNodeId);
                return pathSegments;
            }
            loopCount++;
        }

         if (loopCount >= maxLoops) {
             console.warn("Path generation exceeded max loops. Exiting at:", currentRoundaboutNodeId);
         }

        const exitSegment = mapData.segments.find(s => s.from === targetExitRoundaboutNodeId && mapData.nodes[s.to]?.isExitPoint);
        if (exitSegment) {
            pathSegments.push(exitSegment);
        } else {
             const reverseExitSegment = mapData.segments.find(s => s.to === targetExitRoundaboutNodeId && mapData.nodes[s.from]?.isExitPoint);
             if(reverseExitSegment){
                 pathSegments.push({ ...reverseExitSegment, from: targetExitRoundaboutNodeId, to: reverseExitSegment.from, reversed: true });
             } else {
                console.warn("Path generation failed: Could not find exit segment from", targetExitRoundaboutNodeId);
             }
        }
        return pathSegments;
    }

    // FR5.1: Update vehicle position along path (with lane offset)
    update(deltaTime) {
        if (this.markForRemoval || this.currentSegmentIndex >= this.path.length) {
            this.markForRemoval = true;
            return;
        }

        const segment = this.path[this.currentSegmentIndex];
        const startNode = mapData.nodes[segment.from];
        const endNode = mapData.nodes[segment.to];

         if (!startNode || !endNode) {
             console.error(`Invalid node IDs in segment ${segment.id}: from ${segment.from}, to ${segment.to}`);
             this.markForRemoval = true;
             return;
         }

        const startVec = new THREE.Vector3(startNode.x, 0, startNode.z);
        const endVec = new THREE.Vector3(endNode.x, 0, endNode.z);

        let segmentLength;
        let targetCenterPosition; // Position along the centerline
        let direction = new THREE.Vector3();
        let perpendicular = new THREE.Vector3(); // Perpendicular for lane offset

        // --- Calculate segment length and centerline target position --- 
        if (segment.isRoundabout) {
            const center = new THREE.Vector3(0, 0, 0); // Assuming center is at origin
            const radius = ROUNDABOUT_RADIUS;

            const angleStart = Math.atan2(startVec.z, startVec.x);
            let angleEnd = Math.atan2(endVec.z, endVec.x);
            if (angleEnd < angleStart) angleEnd += Math.PI * 2;
            const angleTotal = angleEnd - angleStart;

            segmentLength = Math.abs(angleTotal) * radius;
            if (segmentLength < 0.01) segmentLength = 0.01;

             // Calculate target position on the CENTER of the roundabout road
             const currentAngle = angleStart + angleTotal * this.progressOnSegment;
             targetCenterPosition = new THREE.Vector3(
                 Math.cos(currentAngle) * radius,
                 VEHICLE_HEIGHT / 2,
                 Math.sin(currentAngle) * radius
             );
             // Direction tangent to the circle
             direction.set(-Math.sin(currentAngle), 0, Math.cos(currentAngle)).normalize();
             // Perpendicular vector points towards the center for offset calculation
             perpendicular.set(-Math.cos(currentAngle), 0, -Math.sin(currentAngle)).normalize();

        } else {
            // Movement along a straight segment
            segmentLength = startVec.distanceTo(endVec);
            if (segmentLength < 0.01) segmentLength = 0.01;

            // Calculate target position on the CENTERLINE
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
            targetCenterPosition.y = VEHICLE_HEIGHT / 2; // Ensure correct height
            direction.subVectors(endVec, startVec).normalize();
            // Perpendicular vector for lane offset
            perpendicular.set(-direction.z, 0, direction.x).normalize();
        }

        // --- Update Speed --- 
        // TODO: Implement deceleration
        this.currentSpeed = Math.min(MAX_SPEED, this.currentSpeed + ACCELERATION * deltaTime);
        const distanceToTravel = this.currentSpeed * deltaTime;
        let remainingDistanceOnSegment = (1.0 - this.progressOnSegment) * segmentLength;

        // --- Calculate Lane Offset (FR1.3 implementation) ---
        const numLanes = segment.lanes || 1;
        // Calculate offset from the centerline. Lane 0 is innermost.
        // Offset = -(Half Road Width) + (Lane Center Offset)
        // Lane Center Offset = LANE_WIDTH * (laneIndex + 0.5)
        const laneOffset = -(ROAD_WIDTH / 2) + LANE_WIDTH * (this.laneIndex + 0.5);
        const offsetVector = perpendicular.clone().multiplyScalar(laneOffset);

        // --- Update Position & Progress ---
        let finalTargetPosition;
        if (distanceToTravel >= remainingDistanceOnSegment && this.currentSegmentIndex < this.path.length -1) {
            // Move exactly to the end of the current segment's lane offset
            this.progressOnSegment = 1.0;

            // Calculate end position on centerline first
             let endCenterPos;
             if (segment.isRoundabout) {
                 const endAngle = Math.atan2(endVec.z, endVec.x);
                  endCenterPos = new THREE.Vector3(
                      Math.cos(endAngle) * ROUNDABOUT_RADIUS,
                      VEHICLE_HEIGHT / 2,
                      Math.sin(endAngle) * ROUNDABOUT_RADIUS
                  );
             } else {
                  endCenterPos = endVec.clone();
                  endCenterPos.y = VEHICLE_HEIGHT / 2;
             }
            // Apply lane offset to the end centerline position
            finalTargetPosition = endCenterPos.add(offsetVector);
            this.mesh.position.copy(finalTargetPosition);

            // Advance to next segment
            this.currentSegmentIndex++;
            this.progressOnSegment = 0;

            // If path finished after advancing, mark for removal
             if (this.currentSegmentIndex >= this.path.length) {
                 this.markForRemoval = true;
                 return;
             }

        } else {
             // Move along the current segment
             // Prevent progress exceeding 1 if it's the last segment
             const progressDelta = distanceToTravel / segmentLength;
             this.progressOnSegment = (this.currentSegmentIndex === this.path.length - 1)
                 ? Math.min(1.0, this.progressOnSegment + progressDelta)
                 : this.progressOnSegment + progressDelta;
             this.progressOnSegment = Math.min(this.progressOnSegment, 1.0); // Clamp progress

             // Recalculate centerline position based on new progress
             if (segment.isRoundabout) {
                 const radius = ROUNDABOUT_RADIUS;
                 const angleStart = Math.atan2(startVec.z, startVec.x);
                 let angleEnd = Math.atan2(endVec.z, endVec.x);
                 if (angleEnd < angleStart) angleEnd += Math.PI * 2;
                 const angleTotal = angleEnd - angleStart;
                 const currentAngle = angleStart + angleTotal * this.progressOnSegment;
                 targetCenterPosition = new THREE.Vector3(
                     Math.cos(currentAngle) * radius,
                     VEHICLE_HEIGHT / 2,
                     Math.sin(currentAngle) * radius
                 );
                 // Update direction & perpendicular for rotation and offset
                 direction.set(-Math.sin(currentAngle), 0, Math.cos(currentAngle)).normalize();
                 perpendicular.set(-Math.cos(currentAngle), 0, -Math.sin(currentAngle)).normalize();
             } else {
                 targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
                 targetCenterPosition.y = VEHICLE_HEIGHT / 2;
                 // Direction & perpendicular remain the same for straight segment
             }

             // Apply lane offset to the calculated centerline position
             const laneOffsetRecalc = perpendicular.clone().multiplyScalar(laneOffset); // Recalculate offsetVector based on current perpendicular
             finalTargetPosition = targetCenterPosition.add(laneOffsetRecalc);
             this.mesh.position.copy(finalTargetPosition);
        }

        // --- Update Rotation (FR2.4) ---
        if (direction.lengthSq() > 0.001) {
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;
        }

        // --- Update Color (FR6.2) ---
        const speedRatio = this.currentSpeed / MAX_SPEED;
        if (speedRatio < 0.1) this.material.color.setHex(0xff0000);
        else if (speedRatio < 0.6) this.material.color.setHex(0xffff00);
        else this.material.color.setHex(0x00ff00);

         // Mark for removal if progress reaches 1 on the *last* segment
         if (this.progressOnSegment >= 1.0 && this.currentSegmentIndex >= this.path.length - 1) {
             this.markForRemoval = true;
         }
    }

    // Cleanup resources
    dispose() {
        if (this.mesh) this.scene.remove(this.mesh);
        this.geometry?.dispose();
        this.material?.dispose();
        // console.log(`Disposed vehicle ${this.id}`);
    }
} 