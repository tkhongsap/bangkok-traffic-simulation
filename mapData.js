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
        { id: 's_a1_out', from: 'a1_out', to: 'r1', lanes: 1, direction: 'outbound' },
        { id: 's_a2_out', from: 'a2_out', to: 'r2', lanes: 1, direction: 'outbound' },
        { id: 's_a3_out', from: 'a3_out', to: 'r3', lanes: 1, direction: 'outbound' },
        { id: 's_a4_out', from: 'a4_out', to: 'r4', lanes: 1, direction: 'outbound' },
        // Approach Roads (inbound)
        { id: 's_a1_in', from: 'r1', to: 'a1_in', lanes: 1, direction: 'inbound' },
        { id: 's_a2_in', from: 'r2', to: 'a2_in', lanes: 1, direction: 'inbound' },
        { id: 's_a3_in', from: 'r3', to: 'a3_in', lanes: 1, direction: 'inbound' },
        { id: 's_a4_in', from: 'r4', to: 'a4_in', lanes: 1, direction: 'inbound' },
        // Roundabout segments (clockwise)
        { id: 's_r1r2', from: 'r1', to: 'r2', isRoundabout: true, lanes: 2 },
        { id: 's_r2r3', from: 'r2', to: 'r3', isRoundabout: true, lanes: 2 },
        { id: 's_r3r4', from: 'r3', to: 'r4', isRoundabout: true, lanes: 2 },
        { id: 's_r4r1', from: 'r4', to: 'r1', isRoundabout: true, lanes: 2 },
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
        
        // Dense small structures everywhere (keeping clear of roads)
        // Northeast area fills
        { id: 'kiosk_ne1', x: ROUNDABOUT_RADIUS + 15, z: -(ROUNDABOUT_RADIUS + 15), width: 5, depth: 4, height: 8, textureType: 'traditional' },
        { id: 'kiosk_ne2', x: ROUNDABOUT_RADIUS + 25, z: -(ROUNDABOUT_RADIUS + 20), width: 4, depth: 4, height: 6, textureType: 'shop' },
        { id: 'kiosk_ne3', x: ROUNDABOUT_RADIUS + 20, z: -(ROUNDABOUT_RADIUS + 30), width: 5, depth: 5, height: 7, textureType: 'store' },
        
        // Southeast area fills
        { id: 'kiosk_se1', x: ROUNDABOUT_RADIUS + 15, z: ROUNDABOUT_RADIUS + 15, width: 4, depth: 4, height: 6, textureType: 'shop' },
        { id: 'kiosk_se2', x: ROUNDABOUT_RADIUS + 25, z: ROUNDABOUT_RADIUS + 25, width: 5, depth: 4, height: 7, textureType: 'traditional' },
        { id: 'kiosk_se3', x: ROUNDABOUT_RADIUS + 20, z: ROUNDABOUT_RADIUS + 35, width: 4, depth: 5, height: 8, textureType: 'store' },
        
        // Southwest area fills
        { id: 'kiosk_sw1', x: -(ROUNDABOUT_RADIUS + 15), z: ROUNDABOUT_RADIUS + 15, width: 4, depth: 4, height: 7, textureType: 'modern' },
        { id: 'kiosk_sw2', x: -(ROUNDABOUT_RADIUS + 25), z: ROUNDABOUT_RADIUS + 25, width: 5, depth: 4, height: 6, textureType: 'shop' },
        { id: 'kiosk_sw3', x: -(ROUNDABOUT_RADIUS + 35), z: ROUNDABOUT_RADIUS + 20, width: 4, depth: 5, height: 8, textureType: 'traditional' },
        
        // Northwest area fills
        { id: 'kiosk_nw1', x: -(ROUNDABOUT_RADIUS + 15), z: -(ROUNDABOUT_RADIUS + 15), width: 4, depth: 4, height: 7, textureType: 'store' },
        { id: 'kiosk_nw2', x: -(ROUNDABOUT_RADIUS + 25), z: -(ROUNDABOUT_RADIUS + 25), width: 5, depth: 4, height: 6, textureType: 'modern' },
        { id: 'kiosk_nw3', x: -(ROUNDABOUT_RADIUS + 20), z: -(ROUNDABOUT_RADIUS + 35), width: 4, depth: 5, height: 8, textureType: 'shop' },
        
        // Original small structures
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
        { id: 'shop12', x: 15, z: -(ROUNDABOUT_RADIUS + 45), width: 10, depth: 12, height: 20 },

        // Additional dense buildings - Northeast quadrant
        { id: 'shop_ne1', x: ROUNDABOUT_RADIUS + 130, z: -(ROUNDABOUT_RADIUS + 110), width: 12, depth: 10, height: 25, textureType: 'shop' },
        { id: 'apt_ne1', x: ROUNDABOUT_RADIUS + 150, z: -(ROUNDABOUT_RADIUS + 90), width: 15, depth: 12, height: 45, textureType: 'modern' },
        { id: 'store_ne1', x: ROUNDABOUT_RADIUS + 170, z: -(ROUNDABOUT_RADIUS + 70), width: 18, depth: 15, height: 30, textureType: 'store' },
        { id: 'shop_ne2', x: ROUNDABOUT_RADIUS + 140, z: -(ROUNDABOUT_RADIUS + 130), width: 10, depth: 8, height: 20, textureType: 'traditional' },
        { id: 'kiosk_ne4', x: ROUNDABOUT_RADIUS + 160, z: -(ROUNDABOUT_RADIUS + 110), width: 8, depth: 6, height: 15, textureType: 'shop' },
        { id: 'store_ne2', x: ROUNDABOUT_RADIUS + 180, z: -(ROUNDABOUT_RADIUS + 90), width: 14, depth: 12, height: 25, textureType: 'store' },
        { id: 'apt_ne2', x: ROUNDABOUT_RADIUS + 130, z: -(ROUNDABOUT_RADIUS + 150), width: 16, depth: 14, height: 40, textureType: 'modern' },
        { id: 'shop_ne3', x: ROUNDABOUT_RADIUS + 150, z: -(ROUNDABOUT_RADIUS + 130), width: 10, depth: 8, height: 18, textureType: 'traditional' },
        { id: 'kiosk_ne5', x: ROUNDABOUT_RADIUS + 170, z: -(ROUNDABOUT_RADIUS + 110), width: 7, depth: 6, height: 12, textureType: 'shop' },
        { id: 'store_ne3', x: ROUNDABOUT_RADIUS + 190, z: -(ROUNDABOUT_RADIUS + 90), width: 15, depth: 12, height: 28, textureType: 'store' },

        // Additional dense buildings - Southeast quadrant
        { id: 'shop_se1', x: ROUNDABOUT_RADIUS + 130, z: ROUNDABOUT_RADIUS + 110, width: 12, depth: 10, height: 22, textureType: 'shop' },
        { id: 'apt_se1', x: ROUNDABOUT_RADIUS + 150, z: ROUNDABOUT_RADIUS + 90, width: 15, depth: 12, height: 48, textureType: 'modern' },
        { id: 'store_se1', x: ROUNDABOUT_RADIUS + 170, z: ROUNDABOUT_RADIUS + 70, width: 16, depth: 14, height: 32, textureType: 'store' },
        { id: 'shop_se2', x: ROUNDABOUT_RADIUS + 140, z: ROUNDABOUT_RADIUS + 130, width: 10, depth: 8, height: 20, textureType: 'traditional' },
        { id: 'kiosk_se4', x: ROUNDABOUT_RADIUS + 160, z: ROUNDABOUT_RADIUS + 110, width: 8, depth: 6, height: 15, textureType: 'shop' },
        { id: 'store_se2', x: ROUNDABOUT_RADIUS + 180, z: ROUNDABOUT_RADIUS + 90, width: 14, depth: 12, height: 25, textureType: 'store' },
        { id: 'apt_se2', x: ROUNDABOUT_RADIUS + 130, z: ROUNDABOUT_RADIUS + 150, width: 16, depth: 14, height: 42, textureType: 'modern' },
        { id: 'shop_se3', x: ROUNDABOUT_RADIUS + 150, z: ROUNDABOUT_RADIUS + 130, width: 10, depth: 8, height: 18, textureType: 'traditional' },
        { id: 'kiosk_se5', x: ROUNDABOUT_RADIUS + 170, z: ROUNDABOUT_RADIUS + 110, width: 7, depth: 6, height: 12, textureType: 'shop' },
        { id: 'store_se3', x: ROUNDABOUT_RADIUS + 190, z: ROUNDABOUT_RADIUS + 90, width: 15, depth: 12, height: 28, textureType: 'store' },

        // Additional dense buildings - Southwest quadrant
        { id: 'shop_sw1', x: -(ROUNDABOUT_RADIUS + 130), z: ROUNDABOUT_RADIUS + 110, width: 12, depth: 10, height: 24, textureType: 'shop' },
        { id: 'apt_sw1', x: -(ROUNDABOUT_RADIUS + 150), z: ROUNDABOUT_RADIUS + 90, width: 15, depth: 12, height: 50, textureType: 'modern' },
        { id: 'store_sw1', x: -(ROUNDABOUT_RADIUS + 170), z: ROUNDABOUT_RADIUS + 70, width: 17, depth: 14, height: 35, textureType: 'store' },
        { id: 'shop_sw2', x: -(ROUNDABOUT_RADIUS + 140), z: ROUNDABOUT_RADIUS + 130, width: 10, depth: 8, height: 20, textureType: 'traditional' },
        { id: 'kiosk_sw4', x: -(ROUNDABOUT_RADIUS + 160), z: ROUNDABOUT_RADIUS + 110, width: 8, depth: 6, height: 15, textureType: 'shop' },
        { id: 'store_sw2', x: -(ROUNDABOUT_RADIUS + 180), z: ROUNDABOUT_RADIUS + 90, width: 14, depth: 12, height: 25, textureType: 'store' },
        { id: 'apt_sw2', x: -(ROUNDABOUT_RADIUS + 130), z: ROUNDABOUT_RADIUS + 150, width: 16, depth: 14, height: 45, textureType: 'modern' },
        { id: 'shop_sw3', x: -(ROUNDABOUT_RADIUS + 150), z: ROUNDABOUT_RADIUS + 130, width: 10, depth: 8, height: 18, textureType: 'traditional' },
        { id: 'kiosk_sw5', x: -(ROUNDABOUT_RADIUS + 170), z: ROUNDABOUT_RADIUS + 110, width: 7, depth: 6, height: 12, textureType: 'shop' },
        { id: 'store_sw3', x: -(ROUNDABOUT_RADIUS + 190), z: ROUNDABOUT_RADIUS + 90, width: 15, depth: 12, height: 28, textureType: 'store' },

        // Additional dense buildings - Northwest quadrant
        { id: 'shop_nw1', x: -(ROUNDABOUT_RADIUS + 130), z: -(ROUNDABOUT_RADIUS + 110), width: 12, depth: 10, height: 26, textureType: 'shop' },
        { id: 'apt_nw1', x: -(ROUNDABOUT_RADIUS + 150), z: -(ROUNDABOUT_RADIUS + 90), width: 15, depth: 12, height: 52, textureType: 'modern' },
        { id: 'store_nw1', x: -(ROUNDABOUT_RADIUS + 170), z: -(ROUNDABOUT_RADIUS + 70), width: 18, depth: 15, height: 38, textureType: 'store' },
        { id: 'shop_nw2', x: -(ROUNDABOUT_RADIUS + 140), z: -(ROUNDABOUT_RADIUS + 130), width: 10, depth: 8, height: 20, textureType: 'traditional' },
        { id: 'kiosk_nw4', x: -(ROUNDABOUT_RADIUS + 160), z: -(ROUNDABOUT_RADIUS + 110), width: 8, depth: 6, height: 15, textureType: 'shop' },
        { id: 'store_nw2', x: -(ROUNDABOUT_RADIUS + 180), z: -(ROUNDABOUT_RADIUS + 90), width: 14, depth: 12, height: 25, textureType: 'store' },
        { id: 'apt_nw2', x: -(ROUNDABOUT_RADIUS + 130), z: -(ROUNDABOUT_RADIUS + 150), width: 16, depth: 14, height: 48, textureType: 'modern' },
        { id: 'shop_nw3', x: -(ROUNDABOUT_RADIUS + 150), z: -(ROUNDABOUT_RADIUS + 130), width: 10, depth: 8, height: 18, textureType: 'traditional' },
        { id: 'kiosk_nw5', x: -(ROUNDABOUT_RADIUS + 170), z: -(ROUNDABOUT_RADIUS + 110), width: 7, depth: 6, height: 12, textureType: 'shop' },
        { id: 'store_nw3', x: -(ROUNDABOUT_RADIUS + 190), z: -(ROUNDABOUT_RADIUS + 90), width: 15, depth: 12, height: 28, textureType: 'store' },

        // Additional small buildings and food trucks - Northeast
        { id: 'foodtruck_ne1', x: ROUNDABOUT_RADIUS + 110, z: -(ROUNDABOUT_RADIUS + 40), width: 4, depth: 3, height: 4, textureType: 'shop' },
        { id: 'kiosk_ne6', x: ROUNDABOUT_RADIUS + 120, z: -(ROUNDABOUT_RADIUS + 55), width: 5, depth: 4, height: 6, textureType: 'traditional' },
        { id: 'home_ne1', x: ROUNDABOUT_RADIUS + 140, z: -(ROUNDABOUT_RADIUS + 65), width: 8, depth: 8, height: 12, textureType: 'modern' },
        { id: 'kiosk_ne7', x: ROUNDABOUT_RADIUS + 155, z: -(ROUNDABOUT_RADIUS + 45), width: 4, depth: 4, height: 5, textureType: 'shop' },
        { id: 'foodtruck_ne2', x: ROUNDABOUT_RADIUS + 165, z: -(ROUNDABOUT_RADIUS + 60), width: 3, depth: 4, height: 4, textureType: 'traditional' },

        // Additional small buildings and food trucks - Southeast
        { id: 'foodtruck_se1', x: ROUNDABOUT_RADIUS + 110, z: ROUNDABOUT_RADIUS + 40, width: 4, depth: 3, height: 4, textureType: 'shop' },
        { id: 'kiosk_se6', x: ROUNDABOUT_RADIUS + 125, z: ROUNDABOUT_RADIUS + 55, width: 5, depth: 4, height: 6, textureType: 'traditional' },
        { id: 'home_se1', x: ROUNDABOUT_RADIUS + 145, z: ROUNDABOUT_RADIUS + 65, width: 8, depth: 8, height: 12, textureType: 'modern' },
        { id: 'kiosk_se7', x: ROUNDABOUT_RADIUS + 160, z: ROUNDABOUT_RADIUS + 50, width: 4, depth: 4, height: 5, textureType: 'shop' },
        { id: 'foodtruck_se2', x: ROUNDABOUT_RADIUS + 175, z: ROUNDABOUT_RADIUS + 45, width: 3, depth: 4, height: 4, textureType: 'traditional' },

        // Additional small buildings and food trucks - Southwest
        { id: 'foodtruck_sw1', x: -(ROUNDABOUT_RADIUS + 110), z: ROUNDABOUT_RADIUS + 40, width: 4, depth: 3, height: 4, textureType: 'shop' },
        { id: 'kiosk_sw6', x: -(ROUNDABOUT_RADIUS + 125), z: ROUNDABOUT_RADIUS + 55, width: 5, depth: 4, height: 6, textureType: 'traditional' },
        { id: 'home_sw1', x: -(ROUNDABOUT_RADIUS + 145), z: ROUNDABOUT_RADIUS + 65, width: 8, depth: 8, height: 12, textureType: 'modern' },
        { id: 'kiosk_sw7', x: -(ROUNDABOUT_RADIUS + 160), z: ROUNDABOUT_RADIUS + 50, width: 4, depth: 4, height: 5, textureType: 'shop' },
        { id: 'foodtruck_sw2', x: -(ROUNDABOUT_RADIUS + 175), z: ROUNDABOUT_RADIUS + 45, width: 3, depth: 4, height: 4, textureType: 'traditional' },

        // Additional small buildings and food trucks - Northwest
        { id: 'foodtruck_nw1', x: -(ROUNDABOUT_RADIUS + 110), z: -(ROUNDABOUT_RADIUS + 40), width: 4, depth: 3, height: 4, textureType: 'shop' },
        { id: 'kiosk_nw6', x: -(ROUNDABOUT_RADIUS + 125), z: -(ROUNDABOUT_RADIUS + 55), width: 5, depth: 4, height: 6, textureType: 'traditional' },
        { id: 'home_nw1', x: -(ROUNDABOUT_RADIUS + 145), z: -(ROUNDABOUT_RADIUS + 65), width: 8, depth: 8, height: 12, textureType: 'modern' },
        { id: 'kiosk_nw7', x: -(ROUNDABOUT_RADIUS + 160), z: -(ROUNDABOUT_RADIUS + 50), width: 4, depth: 4, height: 5, textureType: 'shop' },
        { id: 'foodtruck_nw2', x: -(ROUNDABOUT_RADIUS + 175), z: -(ROUNDABOUT_RADIUS + 45), width: 3, depth: 4, height: 4, textureType: 'traditional' },
        
        // Dense small buildings near roundabout - Northeast
        { id: 'near_rb_ne1', x: ROUNDABOUT_RADIUS + 15, z: -(ROUNDABOUT_RADIUS + 10), width: 4, depth: 3, height: 5, textureType: 'shop' },
        { id: 'near_rb_ne2', x: ROUNDABOUT_RADIUS + 25, z: -(ROUNDABOUT_RADIUS + 15), width: 3, depth: 4, height: 6, textureType: 'traditional' },
        { id: 'near_rb_ne3', x: ROUNDABOUT_RADIUS + 35, z: -(ROUNDABOUT_RADIUS + 12), width: 5, depth: 4, height: 7, textureType: 'modern' },
        
        // Dense small buildings near roundabout - Southeast
        { id: 'near_rb_se1', x: ROUNDABOUT_RADIUS + 12, z: ROUNDABOUT_RADIUS + 15, width: 4, depth: 3, height: 5, textureType: 'store' },
        { id: 'near_rb_se2', x: ROUNDABOUT_RADIUS + 22, z: ROUNDABOUT_RADIUS + 20, width: 3, depth: 4, height: 6, textureType: 'shop' },
        { id: 'near_rb_se3', x: ROUNDABOUT_RADIUS + 32, z: ROUNDABOUT_RADIUS + 18, width: 4, depth: 5, height: 7, textureType: 'traditional' },
        
        // Dense small buildings near roundabout - Southwest
        { id: 'near_rb_sw1', x: -(ROUNDABOUT_RADIUS + 15), z: ROUNDABOUT_RADIUS + 12, width: 3, depth: 4, height: 5, textureType: 'modern' },
        { id: 'near_rb_sw2', x: -(ROUNDABOUT_RADIUS + 25), z: ROUNDABOUT_RADIUS + 18, width: 4, depth: 3, height: 6, textureType: 'store' },
        { id: 'near_rb_sw3', x: -(ROUNDABOUT_RADIUS + 35), z: ROUNDABOUT_RADIUS + 15, width: 5, depth: 4, height: 7, textureType: 'shop' },
        
        // Dense small buildings near roundabout - Northwest
        { id: 'near_rb_nw1', x: -(ROUNDABOUT_RADIUS + 12), z: -(ROUNDABOUT_RADIUS + 15), width: 3, depth: 4, height: 5, textureType: 'traditional' },
        { id: 'near_rb_nw2', x: -(ROUNDABOUT_RADIUS + 22), z: -(ROUNDABOUT_RADIUS + 20), width: 4, depth: 3, height: 6, textureType: 'modern' },
        { id: 'near_rb_nw3', x: -(ROUNDABOUT_RADIUS + 32), z: -(ROUNDABOUT_RADIUS + 18), width: 5, depth: 4, height: 7, textureType: 'store' },

        // More small structures near junctions
        { id: 'junction_kiosk_ne', x: ROUNDABOUT_RADIUS + 15, z: -(ROUNDABOUT_RADIUS + 5), width: 4, depth: 4, height: 6, textureType: 'shop' },
        { id: 'junction_kiosk_se', x: ROUNDABOUT_RADIUS + 5, z: ROUNDABOUT_RADIUS + 15, width: 4, depth: 4, height: 6, textureType: 'store' },
        { id: 'junction_kiosk_sw', x: -(ROUNDABOUT_RADIUS + 15), z: ROUNDABOUT_RADIUS + 5, width: 4, depth: 4, height: 6, textureType: 'traditional' },
        { id: 'junction_kiosk_nw', x: -(ROUNDABOUT_RADIUS + 5), z: -(ROUNDABOUT_RADIUS + 15), width: 4, depth: 4, height: 6, textureType: 'modern' },

        // Additional buildings in Northeast quadrant
        ...Array.from({ length: 200 }, (_, i) => ({
            id: `small_ne_${i + 1}`,
            x: ROUNDABOUT_RADIUS + 50 + (i % 10) * 8,
            z: -(ROUNDABOUT_RADIUS + 50 + Math.floor(i / 10) * 8),
            width: 5 + Math.random() * 5,
            depth: 5 + Math.random() * 5,
            height: 8 + Math.random() * 15,
            textureType: ['shop', 'traditional', 'modern', 'store'][Math.floor(Math.random() * 4)]
        })),

        // Additional buildings in Southeast quadrant
        ...Array.from({ length: 200 }, (_, i) => ({
            id: `small_se_${i + 1}`,
            x: ROUNDABOUT_RADIUS + 50 + (i % 10) * 8,
            z: ROUNDABOUT_RADIUS + 50 + Math.floor(i / 10) * 8,
            width: 5 + Math.random() * 5,
            depth: 5 + Math.random() * 5,
            height: 8 + Math.random() * 15,
            textureType: ['shop', 'traditional', 'modern', 'store'][Math.floor(Math.random() * 4)]
        })),

        // Additional buildings in Southwest quadrant
        ...Array.from({ length: 200 }, (_, i) => ({
            id: `small_sw_${i + 1}`,
            x: -(ROUNDABOUT_RADIUS + 50 + (i % 10) * 8),
            z: ROUNDABOUT_RADIUS + 50 + Math.floor(i / 10) * 8,
            width: 5 + Math.random() * 5,
            depth: 5 + Math.random() * 5,
            height: 8 + Math.random() * 15,
            textureType: ['shop', 'traditional', 'modern', 'store'][Math.floor(Math.random() * 4)]
        })),

        // Additional buildings in Northwest quadrant
        ...Array.from({ length: 200 }, (_, i) => ({
            id: `small_nw_${i + 1}`,
            x: -(ROUNDABOUT_RADIUS + 50 + (i % 10) * 8),
            z: -(ROUNDABOUT_RADIUS + 50 + Math.floor(i / 10) * 8),
            width: 5 + Math.random() * 5,
            depth: 5 + Math.random() * 5,
            height: 8 + Math.random() * 15,
            textureType: ['shop', 'traditional', 'modern', 'store'][Math.floor(Math.random() * 4)]
        }))
    ]
    // paths: [] // Path definition might move or be generated dynamically
}; 