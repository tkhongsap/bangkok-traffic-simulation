import * as THREE from 'three';
import { mapData, ROUNDABOUT_RADIUS, LANE_WIDTH, ROAD_WIDTH } from './mapData.js';

// --- Vehicle Constants ---
export const VEHICLE_LENGTH = 4;
export const VEHICLE_WIDTH = 2;
export const VEHICLE_HEIGHT = 1.5;
export const MAX_SPEED = 15; // m/s (~54 kph)
export const ACCELERATION = 3; // m/s^2
export const DECELERATION = 8; // m/s^2 (braking)
export const SAFE_DISTANCE = VEHICLE_LENGTH * 1.5; // Base safe following distance
const MIN_SPEED = 0.5; // Speed below which vehicle is considered stopped for yielding/following
const YIELD_CHECK_DISTANCE = 20; // How far ahead to check for yielding
const FOLLOWING_CHECK_DISTANCE = MAX_SPEED * 2; // How far ahead to check for following vehicle

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
        const entrySegment = mapData.segments.find(s => s.from === startNodeId || s.to === startNodeId);
        const numLanes = entrySegment?.lanes || 1;
        this.laneIndex = Math.floor(Math.random() * numLanes);

        this.mesh.position.set(startNode.x, VEHICLE_HEIGHT / 2, startNode.z);

        // FR4.4: Assign a random valid path
        this.path = this.generateSimplePath(startNodeId);
        this.currentSegmentIndex = 0;
        this.progressOnSegment = 0; // Normalized progress (0 to 1)
        this.currentSpeed = 0; // Current speed m/s
        this.targetSpeed = MAX_SPEED;
        this.markForRemoval = false; // Flag for cleanup
        this.isYielding = false; // FR5.4: Flag for yielding state

        if (this.path && this.path.length > 0) {
            this.scene.add(this.mesh); // Add mesh to the scene
        } else {
            console.warn(`Vehicle ${this.id} created at ${startNodeId} but could not generate a valid path. Marking for removal.`);
            this.markForRemoval = true;
        }
    }

    // FR4.4 / FR5.2 (Pathfinding): Generates a path for the vehicle
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

        // FR4.4: Add randomness to exit selection instead of always choosing opposite
        const exitNodes = new Set();
        mapData.segments.forEach(segment => {
            if (!segment.isRoundabout) {
                if (segment.from.startsWith('r')) exitNodes.add(segment.from);
                if (segment.to.startsWith('r')) exitNodes.add(segment.to);
            }
        });
        exitNodes.delete(roundaboutEntryNodeId);
        
        let targetExitRoundaboutNodeId = '';
        if (exitNodes.size > 0) {
            const exitNodesArray = Array.from(exitNodes);
            if (Math.random() < 0.5) {
                const randomIndex = Math.floor(Math.random() * exitNodesArray.length);
                targetExitRoundaboutNodeId = exitNodesArray[randomIndex];
            } else {
                if (roundaboutEntryNodeId === 'r1') targetExitRoundaboutNodeId = 'r3';
                else if (roundaboutEntryNodeId === 'r2') targetExitRoundaboutNodeId = 'r4';
                else if (roundaboutEntryNodeId === 'r3') targetExitRoundaboutNodeId = 'r1';
                else if (roundaboutEntryNodeId === 'r4') targetExitRoundaboutNodeId = 'r2';
            }
        } else {
            if (roundaboutEntryNodeId === 'r1') targetExitRoundaboutNodeId = 'r3';
            else if (roundaboutEntryNodeId === 'r2') targetExitRoundaboutNodeId = 'r4';
            else if (roundaboutEntryNodeId === 'r3') targetExitRoundaboutNodeId = 'r1';
            else if (roundaboutEntryNodeId === 'r4') targetExitRoundaboutNodeId = 'r2';
        }

        const pathSegments = [];
        if(travelsTowardsRoundabout){
             pathSegments.push({ ...entrySegment, from: entryNodeId, to: roundaboutEntryNodeId, reversed: true });
        } else {
            pathSegments.push(entrySegment);
        }

        const extraLoops = Math.random() < 0.3 ? Math.floor(Math.random() * 2) + 1 : 0;
        let currentRoundaboutNodeId = roundaboutEntryNodeId;
        let loopCount = 0;
        const maxLoops = roundaboutSegments.length * (extraLoops + 1) + 1;
        
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

    // FR5: Update vehicle position, speed, and behavior (yielding, following)
    update(deltaTime, allVehicles) {
        if (this.markForRemoval || !this.path || this.currentSegmentIndex >= this.path.length) {
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

        // --- Calculate segment length and properties --- 
        if (segment.isRoundabout) {
            const radius = ROUNDABOUT_RADIUS; // Assuming center is at origin
            const angleStart = Math.atan2(startVec.z, startVec.x);
            let angleEnd = Math.atan2(endVec.z, endVec.x);
            if (angleEnd < angleStart) angleEnd += Math.PI * 2;
            const angleTotal = angleEnd - angleStart;
            segmentLength = Math.abs(angleTotal) * radius;
        } else {
            segmentLength = startVec.distanceTo(endVec);
        }
        if (segmentLength < 0.01) segmentLength = 0.01; // Avoid division by zero

        // --- FR5.4: Yielding Logic --- 
        this.isYielding = false; // Reset yielding flag
        const nextSegmentIndex = this.currentSegmentIndex + 1;
        // Check if approaching a roundabout segment from a non-roundabout segment
        if (!segment.isRoundabout && nextSegmentIndex < this.path.length && this.path[nextSegmentIndex].isRoundabout) {
            const distanceToEndOfSegment = (1.0 - this.progressOnSegment) * segmentLength;
            if (distanceToEndOfSegment < YIELD_CHECK_DISTANCE) { // Only check when close to intersection
                const targetRoundaboutSegment = this.path[nextSegmentIndex];
                const targetLaneIndex = this.laneIndex; // Assume entering same lane index
                
                for (const otherVehicle of allVehicles) {
                    if (otherVehicle === this || otherVehicle.markForRemoval) continue;
                    
                    // Check if other vehicle is ON the target roundabout segment we want to enter
                    if (otherVehicle.path[otherVehicle.currentSegmentIndex]?.id === targetRoundaboutSegment.id && 
                        otherVehicle.laneIndex === targetLaneIndex) { 
                        // Simple check: If a vehicle is on the target segment, yield
                        // More complex check could involve distance/time to intersection
                        this.isYielding = true;
                        break; 
                    }
                }
            }
        }

        // --- FR5.3: Following Distance Logic --- 
        let vehicleAhead = null;
        let distanceToVehicleAhead = Infinity;

        for (const otherVehicle of allVehicles) {
            if (otherVehicle === this || otherVehicle.markForRemoval) continue;

            // Check if the other vehicle is on the same segment AND same lane
            if (otherVehicle.path[otherVehicle.currentSegmentIndex]?.id === segment.id &&
                otherVehicle.laneIndex === this.laneIndex &&
                otherVehicle.progressOnSegment > this.progressOnSegment) { // Must be ahead
                
                const dist = (otherVehicle.progressOnSegment - this.progressOnSegment) * segmentLength;
                if (dist < distanceToVehicleAhead && dist < FOLLOWING_CHECK_DISTANCE) {
                    distanceToVehicleAhead = dist;
                    vehicleAhead = otherVehicle;
                }
            }
        }

        // --- Calculate Target Speed --- 
        this.targetSpeed = MAX_SPEED; // Default target speed

        if (this.isYielding) {
            this.targetSpeed = 0; // Stop if yielding
        } else if (vehicleAhead) {
            // Adjust speed based on distance to vehicle ahead (simple linear model)
            const requiredStoppingDistance = SAFE_DISTANCE + (this.currentSpeed * this.currentSpeed) / (2 * DECELERATION);
            if (distanceToVehicleAhead < requiredStoppingDistance) {
                // Need to slow down or stop
                this.targetSpeed = Math.max(0, vehicleAhead.currentSpeed - 1); // Try to match speed or stop
            } else {
                this.targetSpeed = MAX_SPEED; // Safe distance, aim for max speed
            }
        }

        // --- Update Current Speed (Acceleration/Deceleration) --- 
        if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + ACCELERATION * deltaTime);
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed = Math.max(this.targetSpeed, this.currentSpeed - DECELERATION * deltaTime);
        }
        // Ensure speed doesn't go below zero, except when stopping
        this.currentSpeed = Math.max(0, this.currentSpeed);


        // --- Update Position & Progress --- 
        const distanceToTravel = this.currentSpeed * deltaTime;
        this.progressOnSegment += distanceToTravel / segmentLength;

        // --- Calculate Current Position with Lane Offset --- 
        let finalTargetPosition;
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
            direction.set(-Math.sin(currentAngle), 0, Math.cos(currentAngle)).normalize();
            perpendicular.set(-Math.cos(currentAngle), 0, -Math.sin(currentAngle)).normalize();
        } else {
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
            targetCenterPosition.y = VEHICLE_HEIGHT / 2;
            direction.subVectors(endVec, startVec).normalize();
            perpendicular.set(-direction.z, 0, direction.x).normalize();
        }

        const numLanes = segment.lanes || 1;
        const laneOffset = -(ROAD_WIDTH / 2) + LANE_WIDTH * (this.laneIndex + 0.5);
        const offsetVector = perpendicular.clone().multiplyScalar(laneOffset);
        finalTargetPosition = targetCenterPosition.clone().add(offsetVector);

        // Update mesh position
        this.mesh.position.copy(finalTargetPosition);

        // Update mesh rotation
        if (direction && direction.lengthSq() > 0.001) {
            const angle = Math.atan2(direction.x, direction.z);
            this.mesh.rotation.y = angle;
        }

        // --- FR6.2: Update color based on speed --- 
        const speedRatio = this.currentSpeed / MAX_SPEED;
        if (this.isYielding || this.currentSpeed < MIN_SPEED) {
            this.material.color.setHex(0xff0000); // Red (stopped/yielding)
        } else if (speedRatio < 0.6) {
            this.material.color.setHex(0xffff00); // Yellow (medium)
        } else {
            this.material.color.setHex(0x00ff00); // Green (fast)
        }

        // --- Move to Next Segment --- 
        if (this.progressOnSegment >= 1.0) {
            const remainingProgress = this.progressOnSegment - 1.0;
            this.currentSegmentIndex++;
            this.progressOnSegment = 0; // Reset progress

            if (this.currentSegmentIndex >= this.path.length) {
                this.markForRemoval = true;
            } else {
                // Carry over excess progress to the next segment if needed
                const nextSegment = this.path[this.currentSegmentIndex];
                const nextStartNode = mapData.nodes[nextSegment.from];
                const nextEndNode = mapData.nodes[nextSegment.to];
                if (nextStartNode && nextEndNode) {
                    let nextSegmentLength;
                    if (nextSegment.isRoundabout) {
                        const ns_startVec = new THREE.Vector3(nextStartNode.x, 0, nextStartNode.z);
                        const ns_endVec = new THREE.Vector3(nextEndNode.x, 0, nextEndNode.z);
                        const ns_angleStart = Math.atan2(ns_startVec.z, ns_startVec.x);
                        let ns_angleEnd = Math.atan2(ns_endVec.z, ns_endVec.x);
                        if (ns_angleEnd < ns_angleStart) ns_angleEnd += Math.PI * 2;
                        nextSegmentLength = Math.abs(ns_angleEnd - ns_angleStart) * ROUNDABOUT_RADIUS;
                    } else {
                        nextSegmentLength = new THREE.Vector3(nextStartNode.x, 0, nextStartNode.z).distanceTo(new THREE.Vector3(nextEndNode.x, 0, nextEndNode.z));
                    }
                    if (nextSegmentLength > 0.01) {
                        this.progressOnSegment = (remainingProgress * segmentLength) / nextSegmentLength;
                    }
                }
                 // Snap position to the start of the new segment's lane to avoid visual jump
                 this.updatePositionForCurrentProgress(); 
            }
        }
    }

    // Helper to recalculate and set position based on current segment/progress/lane
    updatePositionForCurrentProgress() {
         if (this.markForRemoval || !this.path || this.currentSegmentIndex >= this.path.length) {
             return;
         }
         const segment = this.path[this.currentSegmentIndex];
         const startNode = mapData.nodes[segment.from];
         const endNode = mapData.nodes[segment.to];
         if (!startNode || !endNode) return;

         const startVec = new THREE.Vector3(startNode.x, 0, startNode.z);
         const endVec = new THREE.Vector3(endNode.x, 0, endNode.z);
         let targetCenterPosition;
         let perpendicular = new THREE.Vector3();

        if (segment.isRoundabout) {
            const radius = ROUNDABOUT_RADIUS;
            const angleStart = Math.atan2(startVec.z, startVec.x);
            let angleEnd = Math.atan2(endVec.z, endVec.x);
            if (angleEnd < angleStart) angleEnd += Math.PI * 2;
            const angleTotal = angleEnd - angleStart;
            const currentAngle = angleStart + angleTotal * this.progressOnSegment;
            targetCenterPosition = new THREE.Vector3(Math.cos(currentAngle) * radius, VEHICLE_HEIGHT / 2, Math.sin(currentAngle) * radius);
            perpendicular.set(-Math.cos(currentAngle), 0, -Math.sin(currentAngle)).normalize();
        } else {
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
            targetCenterPosition.y = VEHICLE_HEIGHT / 2;
            const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
            perpendicular.set(-direction.z, 0, direction.x).normalize();
        }

        const numLanes = segment.lanes || 1;
        const laneOffset = -(ROAD_WIDTH / 2) + LANE_WIDTH * (this.laneIndex + 0.5);
        const offsetVector = perpendicular.clone().multiplyScalar(laneOffset);
        const finalPosition = targetCenterPosition.clone().add(offsetVector);
        this.mesh.position.copy(finalPosition);
    }


    dispose() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
        this.geometry?.dispose();
        this.material?.dispose();
        // console.log(`Vehicle ${this.id} disposed.`);
    }
} 