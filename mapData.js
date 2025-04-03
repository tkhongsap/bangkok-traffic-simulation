import * as THREE from 'three'; // Needed for Vector3 potentially in future node definitions

// --- Map Constants ---
export const ROAD_WIDTH = 8;
export const LANE_WIDTH = ROAD_WIDTH / 3; // Adjusted for 3 lanes visually
export const ROUNDABOUT_RADIUS = 30;
export const APPROACH_ROAD_LENGTH = 200;
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
        // Additional small structures to fill gaps
        // Small shops and kiosks near the northeast
        { id: 'kiosk1', x: ROUNDABOUT_RADIUS + 55, z: -(ROUNDABOUT_RADIUS + 25), width: 8, depth: 6, height: 12, textureType: 'shop' },
        { id: 'kiosk2', x: ROUNDABOUT_RADIUS + 35, z: -(ROUNDABOUT_RADIUS + 35), width: 6, depth: 8, height: 10, textureType: 'modern' },
        { id: 'miniMart1', x: ROUNDABOUT_RADIUS + 105, z: -(ROUNDABOUT_RADIUS + 85), width: 10, depth: 8, height: 15, textureType: 'store' },
        
        // Small structures southeast
        { id: 'foodStall1', x: ROUNDABOUT_RADIUS + 55, z: ROUNDABOUT_RADIUS + 65, width: 5, depth: 5, height: 8, textureType: 'traditional' },
        { id: 'smallShop1', x: ROUNDABOUT_RADIUS + 95, z: ROUNDABOUT_RADIUS + 95, width: 8, depth: 7, height: 12, textureType: 'shop' },
        { id: 'kiosk3', x: ROUNDABOUT_RADIUS + 115, z: ROUNDABOUT_RADIUS + 65, width: 6, depth: 6, height: 10, textureType: 'modern' },
        
        // Small structures southwest
        { id: 'foodStall2', x: -(ROUNDABOUT_RADIUS + 85), z: ROUNDABOUT_RADIUS + 85, width: 7, depth: 6, height: 8, textureType: 'traditional' },
        { id: 'miniMart2', x: -(ROUNDABOUT_RADIUS + 115), z: ROUNDABOUT_RADIUS + 85, width: 10, depth: 8, height: 12, textureType: 'store' },
        { id: 'kiosk4', x: -(ROUNDABOUT_RADIUS + 75), z: ROUNDABOUT_RADIUS + 95, width: 6, depth: 5, height: 10, textureType: 'modern' },
        
        // Small structures northwest
        { id: 'smallShop2', x: -(ROUNDABOUT_RADIUS + 85), z: -(ROUNDABOUT_RADIUS + 95), width: 8, depth: 7, height: 12, textureType: 'shop' },
        { id: 'kiosk5', x: -(ROUNDABOUT_RADIUS + 95), z: -(ROUNDABOUT_RADIUS + 85), width: 6, depth: 6, height: 10, textureType: 'modern' },
        { id: 'foodStall3', x: -(ROUNDABOUT_RADIUS + 125), z: -(ROUNDABOUT_RADIUS + 85), width: 5, depth: 5, height: 8, textureType: 'traditional' },
        
        // Northeast quadrant (dense commercial district)
        { id: 'tower1', x: ROUNDABOUT_RADIUS + 45, z: -(ROUNDABOUT_RADIUS + 45), width: 25, depth: 25, height: 100 },
        { id: 'office1', x: ROUNDABOUT_RADIUS + 75, z: -(ROUNDABOUT_RADIUS + 45), width: 20, depth: 20, height: 85 },
        { id: 'mall1', x: ROUNDABOUT_RADIUS + 45, z: -(ROUNDABOUT_RADIUS + 75), width: 35, depth: 30, height: 40 },
        { id: 'shop1', x: ROUNDABOUT_RADIUS + 85, z: -(ROUNDABOUT_RADIUS + 65), width: 15, depth: 12, height: 25 },
        { id: 'shop2', x: ROUNDABOUT_RADIUS + 65, z: -(ROUNDABOUT_RADIUS + 90), width: 18, depth: 15, height: 20 },
        { id: 'apt1', x: ROUNDABOUT_RADIUS + 95, z: -(ROUNDABOUT_RADIUS + 45), width: 22, depth: 20, height: 75 },
        
        // Southeast quadrant (shopping district)
        { id: 'mall2', x: ROUNDABOUT_RADIUS + 65, z: ROUNDABOUT_RADIUS + 45, width: 40, depth: 35, height: 45 },
        { id: 'shop3', x: ROUNDABOUT_RADIUS + 45, z: ROUNDABOUT_RADIUS + 85, width: 20, depth: 15, height: 25 },
        { id: 'shop4', x: ROUNDABOUT_RADIUS + 70, z: ROUNDABOUT_RADIUS + 85, width: 15, depth: 15, height: 20 },
        { id: 'office2', x: ROUNDABOUT_RADIUS + 95, z: ROUNDABOUT_RADIUS + 45, width: 25, depth: 25, height: 90 },
        { id: 'shop5', x: ROUNDABOUT_RADIUS + 85, z: ROUNDABOUT_RADIUS + 75, width: 18, depth: 12, height: 15 },
        { id: 'apt2', x: ROUNDABOUT_RADIUS + 45, z: ROUNDABOUT_RADIUS + 115, width: 25, depth: 20, height: 65 },
        
        // Southwest quadrant (mixed residential)
        { id: 'condo1', x: -(ROUNDABOUT_RADIUS + 45), z: ROUNDABOUT_RADIUS + 45, width: 30, depth: 25, height: 95 },
        { id: 'apt3', x: -(ROUNDABOUT_RADIUS + 80), z: ROUNDABOUT_RADIUS + 45, width: 25, depth: 20, height: 70 },
        { id: 'house1', x: -(ROUNDABOUT_RADIUS + 45), z: ROUNDABOUT_RADIUS + 75, width: 15, depth: 12, height: 15 },
        { id: 'house2', x: -(ROUNDABOUT_RADIUS + 65), z: ROUNDABOUT_RADIUS + 75, width: 12, depth: 12, height: 12 },
        { id: 'apt4', x: -(ROUNDABOUT_RADIUS + 95), z: ROUNDABOUT_RADIUS + 65, width: 28, depth: 22, height: 55 },
        { id: 'shop6', x: -(ROUNDABOUT_RADIUS + 45), z: ROUNDABOUT_RADIUS + 95, width: 20, depth: 15, height: 25 },
        
        // Northwest quadrant (business district)
        { id: 'tower2', x: -(ROUNDABOUT_RADIUS + 65), z: -(ROUNDABOUT_RADIUS + 45), width: 30, depth: 30, height: 110 },
        { id: 'office3', x: -(ROUNDABOUT_RADIUS + 45), z: -(ROUNDABOUT_RADIUS + 75), width: 25, depth: 20, height: 80 },
        { id: 'mall3', x: -(ROUNDABOUT_RADIUS + 95), z: -(ROUNDABOUT_RADIUS + 45), width: 35, depth: 25, height: 45 },
        { id: 'shop7', x: -(ROUNDABOUT_RADIUS + 75), z: -(ROUNDABOUT_RADIUS + 80), width: 15, depth: 15, height: 20 },
        { id: 'office4', x: -(ROUNDABOUT_RADIUS + 115), z: -(ROUNDABOUT_RADIUS + 65), width: 28, depth: 22, height: 75 },
        { id: 'shop8', x: -(ROUNDABOUT_RADIUS + 45), z: -(ROUNDABOUT_RADIUS + 105), width: 18, depth: 15, height: 25 },
        
        // Buildings are positioned further from roads
        { id: 'shop9', x: ROUNDABOUT_RADIUS + 45, z: -15, width: 12, depth: 10, height: 20 },
        { id: 'shop10', x: -(ROUNDABOUT_RADIUS + 45), z: 15, width: 12, depth: 10, height: 20 },
        { id: 'shop11', x: -15, z: ROUNDABOUT_RADIUS + 45, width: 10, depth: 12, height: 20 },
        { id: 'shop12', x: 15, z: -(ROUNDABOUT_RADIUS + 45), width: 10, depth: 12, height: 20 }
    ]
    // paths: [] // Path definition might move or be generated dynamically
}; 