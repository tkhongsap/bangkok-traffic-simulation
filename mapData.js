import * as THREE from 'three'; // Needed for Vector3 potentially in future node definitions

// --- Map Constants ---
export const ROAD_WIDTH = 8;
export const LANE_WIDTH = ROAD_WIDTH / 2; // Adjusted for 2 lanes
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
        // Roundabout connection points (simplified)
        r1: { id: 'r1', x: ROUNDABOUT_RADIUS, y: 0, z: 0 }, // East
        r2: { id: 'r2', x: 0, y: 0, z: ROUNDABOUT_RADIUS }, // South
        r3: { id: 'r3', x: -ROUNDABOUT_RADIUS, y: 0, z: 0 }, // West
        r4: { id: 'r4', x: 0, y: 0, z: -ROUNDABOUT_RADIUS }, // North
        // Approach road start/end points (entry AND exit) - FR1.4
        a1_end: { id: 'a1_end', x: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, y: 0, z: 0, isEntryPoint: true, isExitPoint: true }, // East
        a2_end: { id: 'a2_end', x: 0, y: 0, z: ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH, isEntryPoint: true, isExitPoint: true }, // South
        a3_end: { id: 'a3_end', x: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), y: 0, z: 0, isEntryPoint: true, isExitPoint: true }, // West
        a4_end: { id: 'a4_end', x: 0, y: 0, z: -(ROUNDABOUT_RADIUS + APPROACH_ROAD_LENGTH), isEntryPoint: true, isExitPoint: true }, // North
    },
    // FR1.2: Connectivity, FR1.3: Updated 'lanes' property
    segments: [
        // Approach Roads - INBOUND (towards roundabout)
        { id: 's_a1_in', from: 'a1_end', to: 'r1', lanes: 2 },
        { id: 's_a2_in', from: 'a2_end', to: 'r2', lanes: 2 },
        { id: 's_a3_in', from: 'a3_end', to: 'r3', lanes: 2 },
        { id: 's_a4_in', from: 'a4_end', to: 'r4', lanes: 2 },
        // Approach Roads - OUTBOUND (away from roundabout)
        { id: 's_a1_out', from: 'r1', to: 'a1_end', lanes: 2 },
        { id: 's_a2_out', from: 'r2', to: 'a2_end', lanes: 2 },
        { id: 's_a3_out', from: 'r3', to: 'a3_end', lanes: 2 },
        { id: 's_a4_out', from: 'r4', to: 'a4_end', lanes: 2 },
        // Roundabout segments (clockwise)
        { id: 's_r1r2', from: 'r1', to: 'r2', isRoundabout: true, lanes: 2 },
        { id: 's_r2r3', from: 'r2', to: 'r3', isRoundabout: true, lanes: 2 },
        { id: 's_r3r4', from: 'r3', to: 'r4', isRoundabout: true, lanes: 2 },
        { id: 's_r4r1', from: 'r4', to: 'r1', isRoundabout: true, lanes: 2 },
    ],
    // FR1.1: Basic building footprints/heights
    buildings: [
        { id: 'b1', x: ROUNDABOUT_RADIUS + 30, z: ROUNDABOUT_RADIUS + 30, width: 15, depth: 15, height: 30 },
        { id: 'b2', x: -(ROUNDABOUT_RADIUS + 25), z: -(ROUNDABOUT_RADIUS + 20), width: 20, depth: 10, height: 45 },
        { id: 'b3', x: ROUNDABOUT_RADIUS + 20, z: -(ROUNDABOUT_RADIUS + 25), width: 25, depth: 18, height: 25 },
        { id: 'b4', x: -(ROUNDABOUT_RADIUS + 15), z: ROUNDABOUT_RADIUS + 35, width: 12, depth: 22, height: 40 },
    ]
    // paths: [] // Path definition might move or be generated dynamically
}; 