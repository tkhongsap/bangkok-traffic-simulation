import * as THREE from 'three';
import { mapData, ROAD_WIDTH, ROUNDABOUT_RADIUS } from './mapData.js';

export class Pedestrian {
    constructor(scene) {
        // Create pedestrian geometry (simple cylinder)
        const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2.2, 8);
        const material = new THREE.MeshLambertMaterial({ color: Math.random() * 0xffffff });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // Position randomly near a building but away from roads
        this.findSafePosition();
        
        scene.add(this.mesh);
        
        // Random walking speed
        this.speed = 0.5 + Math.random() * 0.5;
        this.direction = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize();
        
        // Time until next direction change
        this.directionChangeTime = Math.random() * 5 + 2;
    }

    findSafePosition() {
        const safePosition = this.getRandomSafePosition();
        this.mesh.position.set(safePosition.x, 0.9, safePosition.z);
    }

    getRandomSafePosition() {
        const minDistance = ROAD_WIDTH + 2; // Minimum distance from road
        let position;
        let isSafe = false;

        // Increase building proximity to 90% (up from 70%)
        const useBuilding = Math.random() < 0.9;
        
        while (!isSafe) {
            if (useBuilding) {
                // Building-centered positioning (90% of pedestrians)
                const buildings = mapData.buildings;
                const building = buildings[Math.floor(Math.random() * buildings.length)];
                
                // Position near the building with very tight clustering
                const angle = Math.random() * Math.PI * 2;
                
                // More aggressive exponential distribution for tighter clustering
                const distanceDistribution = Math.random();
                // Cube the random value for even more concentration at closer distances
                // Now most pedestrians will be within 1-5 units of buildings
                const distance = 1 + (distanceDistribution * distanceDistribution * distanceDistribution) * 7;
                
                position = {
                    x: building.x + Math.cos(angle) * distance,
                    z: building.z + Math.sin(angle) * distance
                };
            } else {
                // Area-based positioning (only 10% of pedestrians now)
                const quadrantChoice = Math.random();
                
                if (quadrantChoice < 0.25) {
                    // Southeast quadrant (positive X, positive Z)
                    position = {
                        x: 20 + Math.random() * 40, 
                        z: 20 + Math.random() * 40  
                    };
                } 
                else if (quadrantChoice < 0.5) {
                    // Southwest quadrant (negative X, positive Z)
                    position = {
                        x: -(20 + Math.random() * 40),
                        z: 20 + Math.random() * 40    
                    };
                }
                else if (quadrantChoice < 0.75) {
                    // Northeast quadrant (positive X, negative Z)
                    position = {
                        x: 20 + Math.random() * 40,
                        z: -(20 + Math.random() * 40)
                    };
                }
                else {
                    // Northwest quadrant (negative X, negative Z)
                    position = {
                        x: -(20 + Math.random() * 40),
                        z: -(20 + Math.random() * 40)
                    };
                }
            }
            
            // Check if position is safe (away from roads)
            isSafe = this.isPositionSafe(position);
        }
        
        return position;
    }

    isPositionSafe(position) {
        // Check distance from roundabout center
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        if (distanceFromCenter < ROUNDABOUT_RADIUS + ROAD_WIDTH) {
            return false;
        }

        // Check distance from approach roads
        for (const segment of mapData.segments) {
            if (!segment.isRoundabout) {
                const startNode = mapData.nodes[segment.from];
                const endNode = mapData.nodes[segment.to];
                
                // Calculate distance from line segment (road)
                const roadDist = this.pointToLineDistance(
                    position,
                    { x: startNode.x, z: startNode.z },
                    { x: endNode.x, z: endNode.z }
                );
                
                if (roadDist < ROAD_WIDTH + 2) {
                    return false;
                }
            }
        }
        
        return true;
    }

    pointToLineDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dz = lineEnd.z - lineStart.z;
        const lineLengthSquared = dx * dx + dz * dz;
        
        if (lineLengthSquared === 0) {
            return Math.sqrt(
                (point.x - lineStart.x) * (point.x - lineStart.x) +
                (point.z - lineStart.z) * (point.z - lineStart.z)
            );
        }
        
        let t = ((point.x - lineStart.x) * dx + (point.z - lineStart.z) * dz) / lineLengthSquared;
        t = Math.max(0, Math.min(1, t));
        
        const nearestX = lineStart.x + t * dx;
        const nearestZ = lineStart.z + t * dz;
        
        return Math.sqrt(
            (point.x - nearestX) * (point.x - nearestX) +
            (point.z - nearestZ) * (point.z - nearestZ)
        );
    }

    update(deltaTime) {
        // Update direction change timer
        this.directionChangeTime -= deltaTime;
        if (this.directionChangeTime <= 0) {
            this.direction = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5).normalize();
            this.directionChangeTime = Math.random() * 5 + 2;
        }

        // Calculate new position
        const newX = this.mesh.position.x + this.direction.x * this.speed * deltaTime;
        const newZ = this.mesh.position.z + this.direction.y * this.speed * deltaTime;
        
        // Check if new position is safe
        if (this.isPositionSafe({ x: newX, z: newZ })) {
            this.mesh.position.x = newX;
            this.mesh.position.z = newZ;
        } else {
            // If not safe, reverse direction
            this.direction.multiplyScalar(-1);
        }
    }

    dispose() {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}
