// js/simulation.js
import {
    state,
    simulationSpeedFactor, SIMULATION_END_HOUR, SIMULATION_START_HOUR,
    PEAK_HOURS, BASE_SPAWN_RATE_PER_MIN, PEAK_SPAWN_RATE_PER_MIN
} from './constants.js';
import { Vehicle } from './vehicle.js';
import { getScene } from './scene.js';
import { updateUI } from './ui.js';

let renderer, camera, controls;

export function setupSimulation(_renderer, _camera, _controls) {
    renderer = _renderer;
    camera = _camera;
    controls = _controls;
}

function updateSimulationTime(deltaTime) {
    state.simTimeSeconds += deltaTime * simulationSpeedFactor;
    if (state.simTimeSeconds >= SIMULATION_END_HOUR * 3600) {
        state.simTimeSeconds = SIMULATION_START_HOUR * 3600; // Loop back
    }
    return true;
}

function getCurrentSpawnRate() {
    const currentHour = (state.simTimeSeconds / 3600);
    let isPeak = PEAK_HOURS.some(peak => currentHour >= peak.start && currentHour < peak.end);
    const ratePerMin = isPeak ? PEAK_SPAWN_RATE_PER_MIN : BASE_SPAWN_RATE_PER_MIN;
    const expectedSpawnsPerRealSecond = (ratePerMin / 60) * simulationSpeedFactor;
    return expectedSpawnsPerRealSecond; // Per entry point
}

function spawnVehicles(deltaTime) {
    if (state.entryNodeIds.length === 0 || state.paths.length === 0) return;

    const currentRatePerSecond = getCurrentSpawnRate();
    const scene = getScene();
    if (!scene) return;

    state.entryNodeIds.forEach(entryNodeId => {
        if (state.spawnCooldown[entryNodeId] === undefined) {
            state.spawnCooldown[entryNodeId] = 0;
        }

        state.spawnCooldown[entryNodeId] -= deltaTime;
        if (state.spawnCooldown[entryNodeId] <= 0) {
            const probability = currentRatePerSecond * deltaTime;
            if (Math.random() < probability) {
                const availablePaths = state.paths.filter(p => p.startNodeId === entryNodeId);
                if (availablePaths.length > 0) {
                    const chosenPathData = availablePaths[Math.floor(Math.random() * availablePaths.length)];
                    const newVehicle = new Vehicle(chosenPathData);
                    state.vehicles.push(newVehicle);
                    scene.add(newVehicle.mesh); // Add mesh to scene

                    const safeRate = Math.max(currentRatePerSecond, 0.01);
                    state.spawnCooldown[entryNodeId] = (1.0 / safeRate) * (0.8 + Math.random() * 0.4);
                }
            }
            if (state.spawnCooldown[entryNodeId] <= 0) {
                state.spawnCooldown[entryNodeId] = 0.1;
            }
        }
    });
}

function getVehiclesAhead(vehicle) {
    // !!! Needs rewrite for 3D distance/direction checks !!!
    // For now, just return an empty array
    return [];
}

export function gameLoop(timestamp) {
    const deltaTime = (timestamp - state.lastTimestamp) / 1000 || 0; // Time in seconds
    state.lastTimestamp = timestamp;

    // 1. Update Time
    if (!updateSimulationTime(deltaTime)) {
        // Handle simulation end if not looping
        // return;
    }

    // 2. Spawn New Vehicles
    spawnVehicles(deltaTime);

    // 3. Update Vehicles
    state.vehicles.forEach(v => {
        if (!v.isFinished()) {
            const vehiclesAhead = getVehiclesAhead(v);
            v.update(deltaTime, vehiclesAhead);
        }
    });

    // 4. Remove Finished Vehicles
    const finishedVehicles = state.vehicles.filter(v => v.isFinished());
    finishedVehicles.forEach(v => v.remove()); // Remove mesh from scene and dispose
    state.vehicles = state.vehicles.filter(v => !v.isFinished());

    // 5. Update UI
    updateUI();

    // 6. Render 3D Scene
    if (controls) controls.update();
    if (renderer && camera) renderer.render(getScene(), camera);

    // 7. Request Next Frame
    requestAnimationFrame(gameLoop);
} 