// js/constants.js

// Simulation Timing
export const SIMULATION_START_HOUR = 8;
export const SIMULATION_END_HOUR = 20;
export const PEAK_HOURS = [
    { start: 8, end: 9.5 },
    { start: 17, end: 19 }
];
export let simulationSpeedFactor = 120; // Default speed factor, mutable

// Spawning Rates (per minute per entry point)
export const BASE_SPAWN_RATE_PER_MIN = 5; // Off-peak
export const PEAK_SPAWN_RATE_PER_MIN = 15; // Peak

// Vehicle Physics & Behavior
export const MAX_SPEED = 20; // Units per second in 3D space (Increased)
export const SAFE_DISTANCE = 10; // Min distance between vehicle fronts (Units)
export const VEHICLE_LENGTH = 8; // Needed for safe distance calc
export const NODE_DETECTION_RADIUS = 2; // How close vehicle needs to be to 'reach' a node
export const YIELD_CHECK_DISTANCE = 30; // How far ahead to check for yielding (Units)

// Colors
export const ROAD_COLOR = 0x505050;
export const GROUND_COLOR = 0x999999;
export const ISLAND_COLOR = 0xcccccc;
export const LINE_COLOR = 0xFFFF00;
export const FAST_VEHICLE_COLOR = 0x00FF00;
export const MEDIUM_VEHICLE_COLOR = 0xFFFF00;
export const SLOW_VEHICLE_COLOR = 0xFF0000;
export const DEFAULT_VEHICLE_COLOR = 0x0000FF;

// Map Geometry
export const ISLAND_RADIUS = 40;
export const ISLAND_HEIGHT = 10;
export const ROAD_INNER_RADIUS = 45;
export const ROAD_OUTER_RADIUS = 75;
export const APPROACH_ROAD_WIDTH = 25;
export const APPROACH_ROAD_LENGTH = 200;
export const LINE_THICKNESS = 0.5;
export const NUM_ROUNDABOUT_NODES = 16;
export const VEHICLE_WIDTH = 4;
export const VEHICLE_HEIGHT = 2;

// --- Simulation State (Exported for modification) ---
export let state = {
    simTimeSeconds: SIMULATION_START_HOUR * 3600,
    vehicles: [],
    lastTimestamp: 0,
    vehicleIdCounter: 0,
    nodeIdCounter: 0,
    nodes: [],
    entryNodeIds: [],
    exitNodeIds: [],
    paths: [],
    spawnCooldown: {}
};

// Function to update speed factor (used by UI)
export function setSimulationSpeedFactor(value) {
    simulationSpeedFactor = value;
} 