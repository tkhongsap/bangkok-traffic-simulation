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
    constructor(nodeId, scene, direction = 'inbound') {
        this.id = THREE.MathUtils.generateUUID();
        this.scene = scene;
        this.direction = direction; // 'inbound' (to roundabout) or 'outbound' (from roundabout)

        // FR2.3: Representation as simple 3D geometric shapes (boxes) - Body and Cabin
        this.vehicleGroup = new THREE.Group();

        // Vehicle Body
        const bodyGeometry = new THREE.BoxGeometry(VEHICLE_LENGTH, BODY_HEIGHT, VEHICLE_WIDTH);
        this.bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const bodyMesh = new THREE.Mesh(bodyGeometry, this.bodyMaterial);
        bodyMesh.position.y = BODY_HEIGHT / 2;

        // Vehicle Cabin - More streamlined
        const cabinGeometry = new THREE.BoxGeometry(CABIN_LENGTH * 0.8, CABIN_HEIGHT * 1.2, CABIN_WIDTH * 0.9);
        const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 }); // Darker cabin
        const cabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
        cabinMesh.position.set(CABIN_OFFSET_Z, BODY_HEIGHT + CABIN_HEIGHT / 2, 0);

        // Add wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
        const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });
        
        // Front wheels
        const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFL.rotation.z = Math.PI / 2;
        wheelFL.position.set(VEHICLE_LENGTH/3, 0.4, VEHICLE_WIDTH/2);
        
        const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelFR.rotation.z = Math.PI / 2;
        wheelFR.position.set(VEHICLE_LENGTH/3, 0.4, -VEHICLE_WIDTH/2);
        
        // Rear wheels
        const wheelRL = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRL.rotation.z = Math.PI / 2;
        wheelRL.position.set(-VEHICLE_LENGTH/3, 0.4, VEHICLE_WIDTH/2);
        
        const wheelRR = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheelRR.rotation.z = Math.PI / 2;
        wheelRR.position.set(-VEHICLE_LENGTH/3, 0.4, -VEHICLE_WIDTH/2);

        this.vehicleGroup.add(bodyMesh);
        this.vehicleGroup.add(cabinMesh);
        this.vehicleGroup.add(wheelFL);
        this.vehicleGroup.add(wheelFR);
        this.vehicleGroup.add(wheelRL);
        this.vehicleGroup.add(wheelRR);

        // Get the node where this vehicle starts
        const node = mapData.nodes[nodeId];
        if (!node) {
            console.error(`Invalid node ID: ${nodeId}`);
            this.markForRemoval = true;
            return;
        }

        // Set initial position for the group
        this.vehicleGroup.position.set(node.x, 0, node.z); // Group base at y=0

        // Random lane selection
        // For inbound: Lane 0 is preferred (outer lane)
        // For outbound: Lane 1 is preferred (closer to center divider)
        if (direction === 'inbound') {
            this.laneIndex = Math.random() < 0.7 ? 0 : 1;
        } else {
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
            this.scene.add(this.vehicleGroup);
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
            perpendicular.set(Math.cos(currentAngle), 0, Math.sin(currentAngle)).normalize();
        } else {
            targetCenterPosition = new THREE.Vector3().lerpVectors(startVec, endVec, this.progressOnSegment);
            targetCenterPosition.y = 0;
            direction.subVectors(endVec, startVec).normalize();
            perpendicular.set(-direction.z, 0, direction.x).normalize();
        }

        const numLanes = segment.lanes || 2;
        const laneOffsetDistance = (ROAD_WIDTH / 2) - LANE_WIDTH * (this.laneIndex + 0.5);
        const offsetVector = perpendicular.clone().multiplyScalar(laneOffsetDistance);
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