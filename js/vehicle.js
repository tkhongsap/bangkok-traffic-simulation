import * as THREE from 'three';
import {
    state,
    MAX_SPEED, DEFAULT_VEHICLE_COLOR, VEHICLE_WIDTH, VEHICLE_HEIGHT, VEHICLE_LENGTH,
    NODE_DETECTION_RADIUS, FAST_VEHICLE_COLOR, MEDIUM_VEHICLE_COLOR, SLOW_VEHICLE_COLOR
} from './constants.js';
import { getScene } from './scene.js';

export class Vehicle {
    constructor(pathData) {
        this.id = state.vehicleIdCounter++;
        this.path = pathData.nodeIds;
        this.currentNodeIndex = 0;
        this.targetNodeIndex = 1;

        // 3D Representation
        const geometry = new THREE.BoxGeometry(VEHICLE_WIDTH, VEHICLE_HEIGHT, VEHICLE_LENGTH);
        const material = new THREE.MeshStandardMaterial({ color: DEFAULT_VEHICLE_COLOR });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;

        // Initial Position & Rotation
        this.setInitialPositionAndRotation();

        this.maxSpeed = MAX_SPEED * (0.8 + Math.random() * 0.4); // Add some variation
        this.currentSpeed = this.maxSpeed; // Start at max speed for now
        this.isYielding = false;

        // Add mesh to scene (caller should do this now)
        // getScene().add(this.mesh);
    }

    setInitialPositionAndRotation() {
        if (this.path.length < 2) {
            console.error(`Vehicle ${this.id}: Path has less than 2 nodes:`, this.path);
            this.mesh.position.set(0, VEHICLE_HEIGHT / 2, 0);
            return;
        }
        const startNode = state.nodes.find(n => n.id === this.path[0]);
        const nextNode = state.nodes.find(n => n.id === this.path[1]);

        if (startNode && nextNode) {
            this.mesh.position.copy(startNode.position);
            this.mesh.position.y = VEHICLE_HEIGHT / 2; // Ensure vehicle sits on ground
            this.mesh.lookAt(nextNode.position.x, VEHICLE_HEIGHT / 2, nextNode.position.z);
        } else {
            console.error(`Vehicle ${this.id}: Could not find start/next node for path:`, this.path);
            this.mesh.position.set(0, VEHICLE_HEIGHT / 2, 0);
        }
    }

    update(deltaTime, vehiclesAhead) {
        if (this.isFinished() || !this.mesh) {
            return; // Reached destination or mesh removed
        }

        const targetNode = state.nodes.find(n => n.id === this.path[this.targetNodeIndex]);
        if (!targetNode) {
            console.warn(`Vehicle ${this.id}: Target node ${this.path[this.targetNodeIndex]} not found.`);
            this.targetNodeIndex = this.path.length; // Mark as finished
            return;
        }

        const targetPosition = targetNode.position;
        const currentPosition = this.mesh.position;

        // --- Yielding Logic (Placeholder - needs implementation) ---
        this.isYielding = false;
        // TODO: Implement 3D yielding check

        // --- Safe Distance Logic (Placeholder - needs implementation) ---
        let desiredSpeed = this.maxSpeed;
        // TODO: Implement 3D safe distance check using vehiclesAhead

        this.currentSpeed = Math.min(desiredSpeed, this.maxSpeed); // Simplified for now

        // --- Movement ---
        const direction = new THREE.Vector3().subVectors(targetPosition, currentPosition);
        const distanceToTarget = direction.length();

        if (distanceToTarget <= NODE_DETECTION_RADIUS || distanceToTarget < this.currentSpeed * deltaTime) {
            // Reached the target node
            this.mesh.position.copy(targetPosition);
            this.mesh.position.y = VEHICLE_HEIGHT / 2; // Re-align Y
            this.currentNodeIndex++;
            this.targetNodeIndex++;

            if (!this.isFinished()) {
                const nextTargetNode = state.nodes.find(n => n.id === this.path[this.targetNodeIndex]);
                if (nextTargetNode) {
                    this.mesh.lookAt(nextTargetNode.position.x, VEHICLE_HEIGHT / 2, nextTargetNode.position.z);
                } else {
                     console.warn(`Vehicle ${this.id}: Next target node ${this.path[this.targetNodeIndex]} not found.`);
                     this.targetNodeIndex = this.path.length; // Mark finished
                }
            } else {
                // Reached the final destination - stop and mark for removal
                this.currentSpeed = 0;
            }
        } else {
            // Move towards the target node
            direction.normalize();
            this.mesh.position.addScaledVector(direction, this.currentSpeed * deltaTime);
            // Ensure mesh stays facing the direction it's moving towards (current target)
            this.mesh.lookAt(targetPosition.x, VEHICLE_HEIGHT / 2, targetPosition.z);
        }

        // --- Update Color based on Speed ---
        if (this.mesh && this.mesh.material) {
            const speedRatio = this.currentSpeed / this.maxSpeed;
            if (this.isYielding || speedRatio < 0.1) {
                this.mesh.material.color.setHex(SLOW_VEHICLE_COLOR);
            } else if (speedRatio < 0.6) {
                this.mesh.material.color.setHex(MEDIUM_VEHICLE_COLOR);
            } else {
                this.mesh.material.color.setHex(FAST_VEHICLE_COLOR);
            }
        }
    }

    remove() {
        if (this.mesh) {
            const scene = getScene();
            if (scene) {
                scene.remove(this.mesh);
            }
            // Dispose geometry and material to free memory
            this.mesh.geometry.dispose();
            if (this.mesh.material instanceof Array) {
                this.mesh.material.forEach(material => material.dispose());
            } else {
                this.mesh.material.dispose();
            }
            this.mesh = undefined;
        }
    }

    isFinished() {
        return this.targetNodeIndex >= this.path.length;
    }
} 