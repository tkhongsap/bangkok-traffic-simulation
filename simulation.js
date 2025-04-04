import { mapData } from './mapData.js';
import { Vehicle } from './vehicle.js';

// --- Simulation State ---
let simulationTime = new Date();
simulationTime.setHours(8, 0, 0, 0);
const startTimeMillis = 8 * 60 * 60 * 1000;
const endTimeMillis = 20 * 60 * 60 * 1000;
const simulationSpeedMultiplier = 600;

// Store active vehicles
const vehicles = [];

// FR4.2: Vehicle Spawning Configuration
const BASE_SPAWN_INTERVAL = 1.5; // Average seconds between spawns (non-peak)
const PEAK_HOUR_MULTIPLIER = 0.1; // Interval multiplier during peak (lower = more frequent)
let timeSinceLastSpawn = {}; // { [nodeId: string]: number }

// FR4.3: Define peak hour intervals exactly as specified in requirements
const PEAK_HOURS = [
    { start: { hour: 8, minute: 0 }, end: { hour: 9, minute: 30 } },  // Morning peak: 8:00-9:30
    { start: { hour: 17, minute: 0 }, end: { hour: 19, minute: 0 } }  // Evening peak: 17:00-19:00
];

/** Gets the current simulation time */
export function getSimulationTime() {
    return simulationTime;
}

/** Gets the current list of active vehicles */
export function getVehicles() {
    return vehicles;
}

/**
 * Checks if the given time is within any of the defined peak hour intervals
 * FR4.3: Implementation of peak hour check
 * @param {Date} simTime - The simulation time to check
 * @returns {boolean} True if the time is within a peak hour interval
 */
export function isPeakHour(time) {
    const hour = time.getHours();
    const minute = time.getMinutes();
    
    return PEAK_HOURS.some(peak => {
        const startTotalMinutes = peak.start.hour * 60 + peak.start.minute;
        const endTotalMinutes = peak.end.hour * 60 + peak.end.minute;
        const currentTotalMinutes = hour * 60 + minute;
        
        return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    });
}

/**
 * Returns the current spawn interval based on time of day
 * Makes spawn rate difference more pronounced between peak/non-peak
 * @returns {number} The current spawn interval in seconds
 */
function getCurrentSpawnInterval() {
    // Check if we're in peak hours
    const inPeakHour = isPeakHour(simulationTime);
    
    // Base interval adjusted for peak hours
    let interval = inPeakHour ? BASE_SPAWN_INTERVAL * PEAK_HOUR_MULTIPLIER : BASE_SPAWN_INTERVAL;
    
    // Add additional randomness to create more varied traffic patterns
    // Reduced randomness to keep spawn rate high consistently
    const randomFactor = inPeakHour ? 
        0.8 + Math.random() * 0.3 : // 0.8-1.1 during peak (less randomness = more consistent high traffic)
        0.8 + Math.random() * 0.4;  // 0.8-1.2 during normal hours
    
    interval *= randomFactor;
    
    // Enhance spawning with time-based patterns - more cars in the middle of peak periods
    if (inPeakHour) {
        // Find how deep we are into the current peak period (0-1 scale)
        const currentHour = simulationTime.getHours();
        const currentMinute = simulationTime.getMinutes();
        const currentTotalMinutes = currentHour * 60 + currentMinute;
        
        // Find which peak period we're in
        const currentPeak = PEAK_HOURS.find(peak => {
            const startTotalMinutes = peak.start.hour * 60 + peak.start.minute;
            const endTotalMinutes = peak.end.hour * 60 + peak.end.minute;
            return currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
        });
        
        if (currentPeak) {
            const startTotalMinutes = currentPeak.start.hour * 60 + currentPeak.start.minute;
            const endTotalMinutes = currentPeak.end.hour * 60 + currentPeak.end.minute;
            const peakDurationMinutes = endTotalMinutes - startTotalMinutes;
            const minutesIntoPeak = currentTotalMinutes - startTotalMinutes;
            
            // Calculate a factor based on position in peak period (lowest in middle of peak)
            // This creates a curve where traffic is heaviest in the middle of peak periods
            const positionInPeak = minutesIntoPeak / peakDurationMinutes; // 0-1
            const peakIntensityFactor = Math.abs(positionInPeak - 0.5) * 2; // 0-1, with 0 at middle of peak
            
            // Apply a stronger reduction at peak intensity for maximum traffic
            interval *= 0.6 + (peakIntensityFactor * 0.4); // 0.6-1.0 multiplier (was 0.8-1.2)
        }
    }
    
    return Math.max(interval, 0.2); // Ensure minimum interval is 0.2 seconds (was 0.5)
}

// --- Simulation Update Function ---
/**
 * Update the simulation state for one frame
 * @param {number} deltaTime - Time in seconds since last update
 * @param {THREE.Scene} scene - The Three.js scene
 */
export function update(deltaTime, scene) {
    // 1. Update Simulation Time (FR3)
    updateSimulationTime(deltaTime);

    // 2. Spawn Vehicles (FR4)
    spawnVehicle(deltaTime, scene);

    // 3. Update Vehicles (FR5)
    updateVehicles(deltaTime);

    // 4. Clean up vehicles that have completed their path
    cleanupVehicles();

    return {
        time: simulationTime,
        vehicleCount: vehicles.length
    };
}

/**
 * FR4: Vehicle Spawning Logic
 * Handles spawning vehicles at entry points with variable rates based on time
 * @param {number} deltaTime - Time elapsed since last frame
 * @param {THREE.Scene} scene - The scene to add vehicles to
 */
function spawnVehicle(deltaTime, scene) {
    const entryNodes = Object.keys(mapData.nodes).filter(nodeId => mapData.nodes[nodeId].isEntryPoint);
    
    // Initialize timing for any new entry nodes
    for (const nodeId of entryNodes) {
        if (timeSinceLastSpawn[nodeId] === undefined) {
            // Stagger initial spawns to prevent all entry points spawning at once
            timeSinceLastSpawn[nodeId] = Math.random() * getCurrentSpawnInterval() * 0.5; // Reduced from full interval
        }
    }
    
    // Get current spawn interval based on time of day
    const currentInterval = getCurrentSpawnInterval();
    
    // Check each entry point for spawning
    for (const nodeId of entryNodes) {
        // Update time since last spawn
        timeSinceLastSpawn[nodeId] += deltaTime;
        
        // Spawn vehicle if enough time has passed (reduced threshold to 60%)
        if (timeSinceLastSpawn[nodeId] >= currentInterval * 0.6) {
            // Increased chance to spawn (from 30% to 70%)
            const shouldSpawn = timeSinceLastSpawn[nodeId] >= currentInterval * 0.75 || Math.random() < 0.7;
            
            if (shouldSpawn) {
                const vehicle = new Vehicle(nodeId, scene);
                
                // Only add vehicle if path generation was successful
                if (!vehicle.markForRemoval) {
                    vehicles.push(vehicle);
                    timeSinceLastSpawn[nodeId] = 0;
                }
            }
        }
    }
}

/**
 * FR5.5: Remove vehicles that have finished their path
 * Cleans up vehicle resources and removes them from the active vehicles array
 */
function removeFinishedVehicles() {
    for (let i = vehicles.length - 1; i >= 0; i--) {
        if (vehicles[i].markForRemoval) {
            vehicles[i].dispose(); // Clean up Three.js resources
            vehicles.splice(i, 1); // Remove from active array
        }
    }
}

// --- Simulation Helper Functions ---

/**
 * Updates the simulation time based on delta time
 * @param {number} deltaTime - Time in seconds since last update
 */
function updateSimulationTime(deltaTime) {
    // Convert real-time delta to simulation time (apply speed multiplier)
    const elapsedMillis = deltaTime * 1000 * simulationSpeedMultiplier;
    
    // Update simulation time
    simulationTime.setTime(simulationTime.getTime() + elapsedMillis);
    
    // Reset time if we reach the end time (20:00)
    if (simulationTime.getHours() >= 20) {
        simulationTime.setHours(8, 0, 0, 0);
        console.log("Simulation time reset to 08:00");
        // Reset spawn timers to avoid burst of vehicles when resetting
        timeSinceLastSpawn = {};
    }
}

/**
 * Updates all vehicles in the simulation
 * @param {number} deltaTime - Time in seconds since last update
 */
function updateVehicles(deltaTime) {
    // Pass the entire vehicles array for collision/yielding checks
    vehicles.forEach(vehicle => vehicle.update(deltaTime, vehicles));
}

/**
 * Removes vehicles that have completed their path
 */
function cleanupVehicles() {
    const initialCount = vehicles.length;
    
    // Remove vehicles that have reached their destination
    for (let i = vehicles.length - 1; i >= 0; i--) {
        if (vehicles[i].markForRemoval) {
            vehicles[i].dispose();
            vehicles.splice(i, 1);
        }
    }
    
    // Log cleanup if significant
    if (initialCount - vehicles.length > 3) {
        console.log(`Cleaned up ${initialCount - vehicles.length} vehicles. Current count: ${vehicles.length}`);
    }
} 