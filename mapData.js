import * as THREE from 'three'; // Needed for Vector3 potentially in future node definitions

// --- Map Constants ---
export const ROAD_WIDTH = 8;
export const LANE_WIDTH = ROAD_WIDTH / 3; // Adjusted for 3 lanes visually
export const ROUNDABOUT_RADIUS = 30;
export const APPROACH_ROAD_LENGTH = 60;
export const ROAD_COLOR = 0x444444; // Dark grey
export const ISLAND_COLOR = 0x228B22; // Forest green
export const MARKING_COLOR = 0xFFFFFF; // White
export const BUILDING_COLOR = 0xcccccc; // Light grey buildings

// --- FR1: Map Data Structure ---
export const mapData = {
    nodes: {
        // Roundabout center (not used for pathing yet)
        center: { id: 'center', x: 0, y: 0, z: 0 },
        // Roundabout lane connection points
        r1: { id: 'r1', x: ROUNDABOUT_RADIUS, y: 0, z: 0 }, // East
        r2: { id: 'r2', x: 0, y: 0, z: ROUNDABOUT_RADIUS }, // South
        r3: { id: 'r3', x: -ROUNDABOUT_RADIUS, y: 0, z: 0 }, // West
        r4: { id: 'r4', x: 0, y: 0, z: -ROUNDABOUT_RADIUS }, // North
        // Two-way road endpoints
        a1_out: { id: 'a1_out', x: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, y: 0, z: -ROAD_WIDTH/2, isEntryPoint: true }, // East outbound
        a1_in: { id: 'a1_in', x: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, y: 0, z: ROAD_WIDTH/2, isExitPoint: true }, // East inbound
        a2_out: { id: 'a2_out', x: ROAD_WIDTH/2, y: 0, z: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, isEntryPoint: true }, // South outbound
        a2_in: { id: 'a2_in', x: -ROAD_WIDTH/2, y: 0, z: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, isExitPoint: true }, // South inbound
        a3_out: { id: 'a3_out', x: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), y: 0, z: ROAD_WIDTH/2, isEntryPoint: true }, // West outbound
        a3_in: { id: 'a3_in', x: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), y: 0, z: -ROAD_WIDTH/2, isExitPoint: true }, // West inbound
        a4_out: { id: 'a4_out', x: -ROAD_WIDTH/2, y: 0, z: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), isEntryPoint: true }, // North outbound
        a4_in: { id: 'a4_in', x: ROAD_WIDTH/2, y: 0, z: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), isExitPoint: true }, // North inbound
    },
    // FR1.2: Connectivity with two-way roads
    segments: [
        // Approach Roads (outbound)
        { id: 's_a1_out', from: 'a1_out', to: 'r1', lanes: 2, direction: 'outbound' },
        { id: 's_a2_out', from: 'a2_out', to: 'r2', lanes: 2, direction: 'outbound' },
        { id: 's_a3_out', from: 'a3_out', to: 'r3', lanes: 2, direction: 'outbound' },
        { id: 's_a4_out', from: 'a4_out', to: 'r4', lanes: 2, direction: 'outbound' },
        // Approach Roads (inbound)
        { id: 's_a1_in', from: 'r1', to: 'a1_in', lanes: 2, direction: 'inbound' },
        { id: 's_a2_in', from: 'r2', to: 'a2_in', lanes: 2, direction: 'inbound' },
        { id: 's_a3_in', from: 'r3', to: 'a3_in', lanes: 2, direction: 'inbound' },
        { id: 's_a4_in', from: 'r4', to: 'a4_in', lanes: 2, direction: 'inbound' },
        // Roundabout segments (clockwise)
        { id: 's_r1r2', from: 'r1', to: 'r2', isRoundabout: true, lanes: 3 },
        { id: 's_r2r3', from: 'r2', to: 'r3', isRoundabout: true, lanes: 3 },
        { id: 's_r3r4', from: 'r3', to: 'r4', isRoundabout: true, lanes: 3 },
        { id: 's_r4r1', from: 'r4', to: 'r1', isRoundabout: true, lanes: 3 },
    ],
    // FR1.1: Basic building footprints/heights
    buildings: [
        { id: 'b1', x: ROUNDABOUT_RADIUS + 30, z: ROUNDABOUT_RADIUS + 30, width: 15, depth: 15, height: 30 },
        { id: 'b2', x: -(ROUNDABOUT_RADIUS + 25), z: -(ROUNDABOUT_RADIUS + 20), width: 20, depth: 10, height: 45 },
        // Add more based on the reference image if needed
        { id: 'b3', x: ROUNDABOUT_RADIUS + 20, z: -(ROUNDABOUT_RADIUS + 25), width: 25, depth: 18, height: 25 },
        { id: 'b4', x: -(ROUNDABOUT_RADIUS + 15), z: ROUNDABOUT_RADIUS + 35, width: 12, depth: 22, height: 40 },
    ]
    // paths: [] // Path definition might move or be generated dynamically
}; 