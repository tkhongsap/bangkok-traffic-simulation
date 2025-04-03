import { mapData } from './mapData.js';
import { Vehicle } from './vehicle.js';

// --- Simulation State ---
let simulationTime = new Date();
simulationTime.setHours(8, 0, 0, 0);
const startTimeMillis = 8 * 60 * 60 * 1000;
const endTimeMillis = 20 * 60 * 60 * 1000;
const simulationSpeedMultiplier = 60;

// Store active vehicles
const vehicles = [];

// Spawning state
const BASE_SPAWN_INTERVAL = 5; // Average seconds between spawns
const PEAK_HOUR_MULTIPLIER = 0.4; // Interval multiplier during peak
let timeSinceLastSpawn = {}; // { [nodeId: string]: number }

/** Gets the current simulation time */
export function getSimulationTime() {
    return simulationTime;
}

/** Gets the current list of active vehicles */
export function getVehicles() {
    return vehicles;
}

// --- Simulation Update Function ---
/**
 * Updates the simulation state for a given time delta.
 * Includes time progression, vehicle spawning, vehicle updates, and cleanup.
 * @param {number} deltaTime - Time elapsed since last update in seconds.
 * @param {THREE.Scene} scene - The Three.js scene object (needed for vehicle creation).
 */
export function updateSimulation(deltaTime, scene) {
    // 1. Update Time (FR3.1)
    const elapsedMillis = deltaTime * simulationSpeedMultiplier;
    simulationTime.setTime(simulationTime.getTime() + elapsedMillis);
    if (simulationTime.getTime() >= endTimeMillis) {
        simulationTime.setTime(startTimeMillis);
        console.log("Simulation time reset to 08:00");
        // Reset spawn timers as well to avoid instant burst
        timeSinceLastSpawn = {};
    }

    // 2. Spawn Vehicles (FR4)
    spawnVehicles(deltaTime, scene);

    // 3. Update Vehicles (FR5)
    vehicles.forEach(vehicle => vehicle.update(deltaTime));

    // 4. Remove Finished Vehicles (FR5.5)
    removeFinishedVehicles();
}

// --- Helper Functions ---

function isPeakHour(simTime) {
    const hours = simTime.getHours();
    return (hours >= 8 && hours < 10) || (hours >= 17 && hours < 19);
}

// FR4: Vehicle Spawning Logic
function spawnVehicles(deltaTime, scene) {
    const currentSpawnInterval = isPeakHour(simulationTime)
        ? BASE_SPAWN_INTERVAL * PEAK_HOUR_MULTIPLIER
        : BASE_SPAWN_INTERVAL;

    Object.values(mapData.nodes).filter(node => node.isEntryPoint).forEach(entryNode => {
        if (timeSinceLastSpawn[entryNode.id] === undefined) {
            timeSinceLastSpawn[entryNode.id] = Math.random() * currentSpawnInterval;
        }

        timeSinceLastSpawn[entryNode.id] += deltaTime;

        if (timeSinceLastSpawn[entryNode.id] >= currentSpawnInterval) {
            if (Math.random() < 0.7) { // 70% chance
                createVehicle(entryNode.id, scene);
                timeSinceLastSpawn[entryNode.id] = 0;
            } else {
                timeSinceLastSpawn[entryNode.id] = currentSpawnInterval * 0.8;
            }
        }
    });
}

// Factory function for creating vehicles
function createVehicle(startNodeId, scene) {
    const vehicle = new Vehicle(startNodeId, scene);
    if (!vehicle.markForRemoval) {
        vehicles.push(vehicle);
    }
}

// FR5.5: Remove vehicles that have finished their path
function removeFinishedVehicles() {
    for (let i = vehicles.length - 1; i >= 0; i--) {
        if (vehicles[i].markForRemoval) {
            vehicles[i].dispose(); // Clean up Three.js resources
            vehicles.splice(i, 1); // Remove from active array
        }
    }
} 