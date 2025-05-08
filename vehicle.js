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
    constructor(nodeId, scene, direction = 'inbound') {
        this.id = THREE.MathUtils.generateUUID();
        this.scene = scene;
        this.direction = direction; // 'inbound' (to roundabout) or 'outbound' (from roundabout)

        // Create 3D representation
        this.geometry = new THREE.BoxGeometry(VEHICLE_LENGTH, VEHICLE_HEIGHT, VEHICLE_WIDTH);
        this.material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        this.mesh = new THREE.Mesh(this.geometry, this.material);

        // Get the node where this vehicle starts
        const node = mapData.nodes[nodeId];
        if (!node) {
            console.error(`Invalid node ID: ${nodeId}`);
            this.markForRemoval = true;
            return;
        }

        // Position the vehicle at the starting node
        this.mesh.position.set(node.x, VEHICLE_HEIGHT / 2, node.z);

        // Assign a lane (Thai traffic: drive on the left)
        // Lane 0 = Inside/left lane, Lane 1 = Outside/right lane
        if (direction === 'inbound') {
            // For inbound: Lane 0 is preferred (closer to center divider)
            this.laneIndex = Math.random() < 0.7 ? 0 : 1;
        } else {
            // For outbound: Lane 1 is preferred (closer to center divider)
            this.laneIndex = Math.random() < 0.7 ? 1 : 0;
        }

        // Generate a path based on direction
        if (direction === 'inbound') {
            this.path = this.generateInboundPath(nodeId);
        } else {
            this.path = this.generateOutboundPath(nodeId);
        }

        // Initialize movement parameters
        this.currentSegmentIndex = 0;
        this.progressOnSegment = 0;
        this.currentSpeed = 0;
        this.targetSpeed = MAX_SPEED;
        this.markForRemoval = false;
        this.isYielding = false;

        // Add to scene if path generation was successful
        if (this.path && this.path.length > 0) {
            // console.log(`Vehicle created: ${direction} path with ${this.path.length} segments`);
            this.scene.add(this.mesh);
        } else {
            console.warn(`Failed to generate ${direction} path for vehicle at ${nodeId}`);
            this.markForRemoval = true;
        }
    }

    // Generate a path FROM an entry point TO the roundabout and then to an exit
    generateInboundPath(entryNodeId) {
        // Find the inbound segment from entry to roundabout
        const inboundSegments = mapData.segments.filter(s => 
            s.id.includes('_in') && s.from === entryNodeId);
        
        if (inboundSegments.length === 0) {
            console.error(`No inbound segment found from ${entryNodeId}`);
            return [];
        }
        
        // Choose one if multiple exist
        const entrySegment = inboundSegments[0];
        const roundaboutEntryNodeId = entrySegment.to; // The roundabout node we'll enter at
        
        // Find roundabout segments
        const roundaboutSegments = mapData.segments.filter(s => s.isRoundabout);
        
        // Find possible exit nodes (must be different from entry)
        const possibleExitNodes = mapData.segments
            .filter(s => s.id.includes('_out') && s.from !== roundaboutEntryNodeId)
            .map(s => s.from);
        
        if (possibleExitNodes.length === 0) {
            console.warn("No valid exit nodes found");
            return [entrySegment]; // Just use entry segment if no exits found
        }
        
        // Choose exit node: 50% random, 50% opposite
        let exitNodeId;
        if (Math.random() < 0.5) {
            // Random exit
            exitNodeId = possibleExitNodes[Math.floor(Math.random() * possibleExitNodes.length)];
        } else {
            // Try to find opposite exit
            if (roundaboutEntryNodeId === 'r1') exitNodeId = 'r3';
            else if (roundaboutEntryNodeId === 'r2') exitNodeId = 'r4';
            else if (roundaboutEntryNodeId === 'r3') exitNodeId = 'r1';
            else exitNodeId = 'r2';
            
            // Fallback if opposite isn't valid
            if (!possibleExitNodes.includes(exitNodeId)) {
                exitNodeId = possibleExitNodes[0];
            }
        }
        
        // Start building path
        const path = [entrySegment];
        
        // Add roundabout segments to get from entry to exit
        let currentNodeId = roundaboutEntryNodeId;
        let segmentCount = 0;
        const maxSegments = roundaboutSegments.length * 2; // Avoid infinite loops
        
        // 30% chance of doing extra loops
        const shouldDoExtraLoop = Math.random() < 0.3;
        let loopsCompleted = 0;
        const maxLoops = shouldDoExtraLoop ? Math.floor(Math.random() * 2) + 1 : 0;
        
        // Travel around roundabout until we reach exit node
        while ((currentNodeId !== exitNodeId || loopsCompleted < maxLoops) && 
               segmentCount < maxSegments) {
            
            // Find next segment in roundabout
            const nextSegment = roundaboutSegments.find(s => s.from === currentNodeId);
            
            if (nextSegment) {
                path.push(nextSegment);
                currentNodeId = nextSegment.to;
                segmentCount++;
                
                // Check if we've completed a loop
                if (currentNodeId === roundaboutEntryNodeId) {
                    loopsCompleted++;
                }
            } else {
                console.error(`Failed to find next roundabout segment from ${currentNodeId}`);
                break;
            }
        }
        
        // Find exit segment
        const exitSegments = mapData.segments.filter(s => 
            s.id.includes('_out') && s.from === exitNodeId);
        
        if (exitSegments.length > 0) {
            path.push(exitSegments[0]);
        }
        
        return path;
    }

    // Generate a path FROM the roundabout TO an exit point
    generateOutboundPath(exitNodeId) {
        // Find the outbound segment to this exit
        const outboundSegments = mapData.segments.filter(s => 
            s.id.includes('_out') && s.to === exitNodeId);
        
        if (outboundSegments.length === 0) {
            console.error(`No outbound segment found to ${exitNodeId}`);
            return [];
        }
        
        // Choose one if multiple exist
        const exitSegment = outboundSegments[0];
        const roundaboutExitNodeId = exitSegment.from; // The node where we exit the roundabout
        
        // Find roundabout segments and entry points
        const roundaboutSegments = mapData.segments.filter(s => s.isRoundabout);
        
        // Choose a random starting point on the roundabout (different from exit)
        const roundaboutNodes = roundaboutSegments.map(s => s.from)
            .filter((id, index, array) => array.indexOf(id) === index); // unique values
            
        const possibleEntryNodes = roundaboutNodes.filter(id => id !== roundaboutExitNodeId);
        
        if (possibleEntryNodes.length === 0) {
            console.error("No valid roundabout entry points for outbound path");
            return [];
        }
        
        // Choose random entry to roundabout
        const entryNodeId = possibleEntryNodes[Math.floor(Math.random() * possibleEntryNodes.length)];
        
        // Build path from entry around roundabout to exit
        const path = [];
        let currentNodeId = entryNodeId;
        let segmentCount = 0;
        const maxSegments = roundaboutSegments.length * 2; // Avoid infinite loops
        
        // Travel around roundabout until we reach exit point
        while (currentNodeId !== roundaboutExitNodeId && segmentCount < maxSegments) {
            // Find next segment in roundabout
            const nextSegment = roundaboutSegments.find(s => s.from === currentNodeId);
            
            if (nextSegment) {
                path.push(nextSegment);
                currentNodeId = nextSegment.to;
                segmentCount++;
            } else {
                console.error(`Failed to find next roundabout segment from ${currentNodeId}`);
                break;
            }
        }
        
        // Add the exit segment
        path.push(exitSegment);
        
        return path;
    }

    // --- FR5: Update vehicle position, speed, and behavior ---
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
            perpendicular.set(Math.cos(currentAngle), 0, Math.sin(currentAngle)).normalize();
        } else {
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
            targetCenterPosition.y = VEHICLE_HEIGHT / 2;
            direction.subVectors(endVec, startVec).normalize();
            perpendicular.set(-direction.z, 0, direction.x).normalize();
        }

        const numLanes = segment.lanes || 2;
        const laneOffsetDistance = (ROAD_WIDTH / 2) - LANE_WIDTH * (this.laneIndex + 0.5);
        const offsetVector = perpendicular.clone().multiplyScalar(laneOffsetDistance);
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
             perpendicular.set(Math.cos(currentAngle), 0, Math.sin(currentAngle)).normalize(); 
        } else {
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
            targetCenterPosition.y = VEHICLE_HEIGHT / 2;
            const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
            perpendicular.set(-direction.z, 0, direction.x).normalize(); 
        }

        const numLanes = segment.lanes || 2;
        const laneOffsetDistance = (ROAD_WIDTH / 2) - LANE_WIDTH * (this.laneIndex + 0.5);
        const offsetVector = perpendicular.clone().multiplyScalar(laneOffsetDistance);
        const finalPosition = targetCenterPosition.clone().add(offsetVector);
        this.mesh.position.copy(finalPosition);
    }


    dispose() {
        if (this.scene && this.mesh) {
            this.scene.remove(this.mesh);
        }
        this.geometry?.dispose();
        this.material?.dispose();
    }
} 