import * as THREE from 'three';
import { mapData, ROUNDABOUT_RADIUS, LANE_WIDTH, ROAD_WIDTH } from './mapData.js';
import { isPeakHour, getSimulationTime } from './simulation.js'; // Import peak hour logic

// --- Vehicle Constants ---
export const VEHICLE_LENGTH = 4;
export const VEHICLE_WIDTH = 2;
// Adjusted height for body/cabin split
const BODY_HEIGHT = 0.8;
const CABIN_HEIGHT = 0.7;
const CABIN_WIDTH = VEHICLE_WIDTH * 0.8;
const CABIN_LENGTH = VEHICLE_LENGTH * 0.6;
const CABIN_OFFSET_Z = -VEHICLE_LENGTH * 0.1; // Offset cabin slightly back

export const MAX_SPEED = 25; // m/s (~90 kph)
export const MAX_SPEED_PEAK = MAX_SPEED * 0.7; // Reduced speed during peak hours (~63 kph)
export const ACCELERATION = 5; // m/s^2
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

        // FR2.3: Representation as simple 3D geometric shapes (boxes) - Body and Cabin
        this.vehicleGroup = new THREE.Group();

        // Vehicle Body
        const bodyGeometry = new THREE.BoxGeometry(VEHICLE_LENGTH, BODY_HEIGHT, VEHICLE_WIDTH);
        // FR6.2: Initial color - Green for moving (applied to body)
        this.bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const bodyMesh = new THREE.Mesh(bodyGeometry, this.bodyMaterial);
        bodyMesh.position.y = BODY_HEIGHT / 2; // Position body geometry base at y=0

        // Vehicle Cabin
        const cabinGeometry = new THREE.BoxGeometry(CABIN_LENGTH, CABIN_HEIGHT, CABIN_WIDTH);
        const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 }); // Dark grey cabin
        const cabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
        // Position cabin on top of the body, slightly offset back
        cabinMesh.position.set(CABIN_OFFSET_Z, BODY_HEIGHT + CABIN_HEIGHT / 2, 0);

        this.vehicleGroup.add(bodyMesh);
        this.vehicleGroup.add(cabinMesh);

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

        // Set initial position for the group
        this.vehicleGroup.position.set(startNode.x, 0, startNode.z); // Group base at y=0

        // FR4.4: Assign a random valid path
        this.path = this.generateSimplePath(startNodeId);
        this.currentSegmentIndex = 0;
        this.progressOnSegment = 0; // Normalized progress (0 to 1)
        this.currentSpeed = 0; // Current speed m/s
        this.targetSpeed = MAX_SPEED;
        this.markForRemoval = false; // Flag for cleanup
        this.isYielding = false; // FR5.4: Flag for yielding state

        if (this.path && this.path.length > 0) {
            this.scene.add(this.vehicleGroup); // Add group to the scene
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
        const currentSimTime = getSimulationTime();
        const inPeakHour = isPeakHour(currentSimTime);
        let currentMaxSpeed = inPeakHour ? MAX_SPEED_PEAK : MAX_SPEED;
        
        this.targetSpeed = currentMaxSpeed; // Default target speed for the current time period

        if (this.isYielding) {
            this.targetSpeed = 0; // Stop if yielding
        } else if (vehicleAhead) {
            // Adjust speed based on distance to vehicle ahead (simple linear model)
            const requiredStoppingDistance = SAFE_DISTANCE + (this.currentSpeed * this.currentSpeed) / (2 * DECELERATION);
            if (distanceToVehicleAhead < requiredStoppingDistance) {
                // Need to slow down or stop
                // Target speed should not exceed the vehicle ahead's speed or the current period's max speed
                this.targetSpeed = Math.min(currentMaxSpeed, Math.max(0, vehicleAhead.currentSpeed - 1)); 
            } else {
                this.targetSpeed = currentMaxSpeed; // Safe distance, aim for the period's max speed
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
                0,
                Math.sin(currentAngle) * radius
            );
            direction.set(-Math.sin(currentAngle), 0, Math.cos(currentAngle)).normalize();
            perpendicular.set(-Math.cos(currentAngle), 0, -Math.sin(currentAngle)).normalize();
        } else {
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
            targetCenterPosition.y = 0;
            direction.subVectors(endVec, startVec).normalize();
            perpendicular.set(-direction.z, 0, direction.x).normalize();
        }

        const numLanes = segment.lanes || 1;
        const laneOffset = -(ROAD_WIDTH / 2) + LANE_WIDTH * (this.laneIndex + 0.5);
        const offsetVector = perpendicular.clone().multiplyScalar(laneOffset);
        finalTargetPosition = targetCenterPosition.clone().add(offsetVector);

        // Update mesh position
        this.vehicleGroup.position.copy(finalTargetPosition);

        // Update mesh rotation
        if (direction && direction.lengthSq() > 0.001) {
            const angle = Math.atan2(direction.x, direction.z);
            this.vehicleGroup.rotation.y = angle;
        }

        // --- FR6.2: Update color based on speed --- 
        if (this.currentSpeed < MIN_SPEED) {
            this.bodyMaterial.color.setHex(0xff0000); // Red for stopped/slow
        } else if (this.currentSpeed < MAX_SPEED * 0.7) {
            this.bodyMaterial.color.setHex(0xffff00); // Yellow for medium speed
        } else {
            this.bodyMaterial.color.setHex(0x00ff00); // Green for fast
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

    // FR5.1: Update vehicle position and orientation based on progress
    updatePositionForCurrentProgress() {
        if (!this.path || this.currentSegmentIndex >= this.path.length) return;

        const segment = this.path[this.currentSegmentIndex];
        const startNode = mapData.nodes[segment.from];
        const endNode = mapData.nodes[segment.to];

        if (!startNode || !endNode) return; // Already handled in update

        const startVec = new THREE.Vector3(startNode.x, 0, startNode.z);
        const endVec = new THREE.Vector3(endNode.x, 0, endNode.z);
        let targetCenterPosition;
        let direction = new THREE.Vector3();
        let perpendicular = new THREE.Vector3();

        // Lane offset calculation
        const numLanes = segment.lanes || 1;
        // Calculate offset from centerline based on lane index
        // Lane 0 = innermost/rightmost, Lane N-1 = outermost/leftmost
        const laneOffsetDistance = -(ROAD_WIDTH / 2) + (LANE_WIDTH / 2) + (this.laneIndex * LANE_WIDTH);


        if (segment.isRoundabout) {
            const radius = ROUNDABOUT_RADIUS; // Assuming center at origin
            const angleStart = Math.atan2(startVec.z, startVec.x);
            let angleEnd = Math.atan2(endVec.z, endVec.x);

            // Handle angle wrap around (e.g., crossing from +PI to -PI)
             // Ensure angleEnd is always greater than angleStart for clockwise motion
            while (angleEnd <= angleStart) {
                 angleEnd += Math.PI * 2;
            }

            const angleTotal = angleEnd - angleStart;
            const currentAngle = angleStart + angleTotal * this.progressOnSegment;

            // Center position on the roundabout arc
            const centerRadius = radius; // Centerline radius
            targetCenterPosition = new THREE.Vector3(
                Math.cos(currentAngle) * centerRadius,
                0,
                Math.sin(currentAngle) * centerRadius
            );

            // Direction tangent to the circle
            direction.set(
                -Math.sin(currentAngle),
                0,
                Math.cos(currentAngle)
            ).normalize();

            // Perpendicular towards the center (for lane offset)
            perpendicular.set(
                -Math.cos(currentAngle),
                 0,
                 -Math.sin(currentAngle)
            ).normalize();

        } else { // Straight segment
            direction.subVectors(endVec, startVec).normalize();
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);

            // Perpendicular vector for lane offset
            perpendicular.set(-direction.z, 0, direction.x); // Rotate 90 degrees in XZ plane
        }

        // Apply lane offset
        const laneOffsetVector = perpendicular.multiplyScalar(laneOffsetDistance);
        const targetPosition = targetCenterPosition.add(laneOffsetVector);


        // Set vehicle position (group base is at y=0)
        this.vehicleGroup.position.set(targetPosition.x, 0, targetPosition.z);

        // Set vehicle orientation
        const lookAtPosition = targetPosition.clone().add(direction); // Point one unit along the direction vector
        this.vehicleGroup.lookAt(lookAtPosition.x, 0, lookAtPosition.z);
    }

    // FR5.5: Clean up resources
    dispose() {
        if (this.vehicleGroup && this.scene) {
            this.scene.remove(this.vehicleGroup);
        }
        // Dispose geometries and materials if they are unique per vehicle
        // If shared, disposal might be handled elsewhere
        this.bodyMaterial?.dispose();
        // Dispose geometries if needed (assuming they are created per vehicle)
        this.vehicleGroup?.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.geometry?.dispose();
                // Dispose cabin material if it's unique
                if (child.material !== this.bodyMaterial) {
                     child.material?.dispose();
                }
            }
        });
        this.path = null; // Release path data
        console.log(`Vehicle ${this.id} disposed.`);
    }
} 