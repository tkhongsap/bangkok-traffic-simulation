export const TRAFFIC_START_HOUR = 5;
export const TRAFFIC_END_HOUR = 24;
export const SIMULATION_SPEED = 720;

export function toMinutes(hour, minute = 0) {
    return hour * 60 + minute;
}

export const TRAFFIC_INTENSITY_SCHEDULE = [
    { startMinutes: toMinutes(5, 0), intensity: 0.65 },
    { startMinutes: toMinutes(6, 30), intensity: 0.9 },
    { startMinutes: toMinutes(7, 0), intensity: 1.45 },
    { startMinutes: toMinutes(9, 45), intensity: 1.0 },
    { startMinutes: toMinutes(11, 30), intensity: 1.28 },
    { startMinutes: toMinutes(14, 0), intensity: 0.78 },
    { startMinutes: toMinutes(16, 0), intensity: 1.65 },
    { startMinutes: toMinutes(19, 0), intensity: 1.18 },
    { startMinutes: toMinutes(21, 0), intensity: 0.92 },
    { startMinutes: toMinutes(23, 0), intensity: 0.6 }
];

export const PEAK_HOURS = [
    { start: { hour: 6, minute: 45 }, end: { hour: 9, minute: 45 } },
    { start: { hour: 11, minute: 30 }, end: { hour: 13, minute: 30 } },
    { start: { hour: 16, minute: 0 }, end: { hour: 21, minute: 30 } }
];

export const ENTRY_FLOW_WEIGHTS = {
    a1_out: 1.18,
    a2_out: 1.55,
    a3_out: 1.05,
    a4_out: 1.32,
};

export const ENTRY_TIME_PROFILES = [
    {
        startMinutes: toMinutes(5, 0),
        multipliers: { a1_out: 0.7, a2_out: 1.0, a3_out: 0.75, a4_out: 0.8 }
    },
    {
        startMinutes: toMinutes(6, 45),
        multipliers: { a1_out: 1.25, a2_out: 1.55, a3_out: 1.1, a4_out: 1.45 }
    },
    {
        startMinutes: toMinutes(9, 30),
        multipliers: { a1_out: 1.05, a2_out: 1.15, a3_out: 0.95, a4_out: 1.2 }
    },
    {
        startMinutes: toMinutes(11, 30),
        multipliers: { a1_out: 0.85, a2_out: 1.35, a3_out: 0.9, a4_out: 1.05 }
    },
    {
        startMinutes: toMinutes(16, 0),
        multipliers: { a1_out: 1.4, a2_out: 1.75, a3_out: 1.1, a4_out: 1.6 }
    },
    {
        startMinutes: toMinutes(20, 30),
        multipliers: { a1_out: 1.0, a2_out: 1.15, a3_out: 0.9, a4_out: 1.05 }
    },
    {
        startMinutes: toMinutes(22, 0),
        multipliers: { a1_out: 0.75, a2_out: 0.8, a3_out: 0.8, a4_out: 0.85 }
    }
];

export const EXIT_FLOW_WEIGHTS = {
    a1_out: { a2_in: 1.35, a3_in: 0.75, a4_in: 1.6 },
    a2_out: { a1_in: 1.4, a3_in: 0.95, a4_in: 1.2 },
    a3_out: { a1_in: 1.25, a2_in: 1.05, a4_in: 1.0 },
    a4_out: { a1_in: 1.5, a2_in: 1.25, a3_in: 0.85 }
};

export const VEHICLE_TYPES = {
    sedan: {
        name: 'Sedan',
        length: 4.3,
        width: 1.78,
        height: 1.48,
        cabinLengthFactor: 0.56,
        cabinHeightFactor: 0.55,
        cabinWidthFactor: 0.84,
        wheelRadius: 0.34,
        wheelWidth: 0.28,
        wheelFrontFactor: 0.42,
        wheelRearFactor: -0.42,
        wheelSideFactor: 0.54,
        maxSpeed: 18,
        peakSpeed: 12,
        acceleration: 5.2,
        deceleration: 9.5,
        roundaboutSpeed: 7,
        queueSpeed: 3.4,
        incidentSpeed: 2.2,
        followDistance: 7.2,
        brakeBias: 1.5,
        aggressiveness: 1,
        speedVariance: 0.9,
        roundaboutAnxiety: 0.28,
        loopChance: 0.22,
        burstChance: 0.22,
        burstSize: 2,
        colorPalette: [0xff7043, 0x42a5f5, 0xffca28, 0x66bb6a, 0xab47bc, 0x26c6da, 0xef5350]
    },
    pickup: {
        name: 'Pickup',
        length: 5.2,
        width: 1.9,
        height: 1.7,
        cabinLengthFactor: 0.52,
        cabinHeightFactor: 0.58,
        cabinWidthFactor: 0.82,
        wheelRadius: 0.38,
        wheelWidth: 0.32,
        wheelFrontFactor: 0.44,
        wheelRearFactor: -0.46,
        wheelSideFactor: 0.58,
        maxSpeed: 17,
        peakSpeed: 11,
        acceleration: 4.5,
        deceleration: 8,
        roundaboutSpeed: 6.2,
        queueSpeed: 3,
        incidentSpeed: 2,
        followDistance: 8,
        brakeBias: 1.7,
        aggressiveness: 0.95,
        speedVariance: 0.85,
        roundaboutAnxiety: 0.3,
        loopChance: 0.18,
        burstChance: 0.12,
        burstSize: 2,
        colorPalette: [0x90a4ae, 0x455a64, 0xb0bec5, 0x6d4c41]
    },
    bus: {
        name: 'City Bus',
        length: 8.8,
        width: 2.4,
        height: 3.1,
        cabinLengthFactor: 0.78,
        cabinHeightFactor: 0.55,
        cabinWidthFactor: 0.9,
        wheelRadius: 0.5,
        wheelWidth: 0.36,
        wheelFrontFactor: 0.38,
        wheelRearFactor: -0.48,
        wheelSideFactor: 0.7,
        maxSpeed: 14,
        peakSpeed: 9,
        acceleration: 3.2,
        deceleration: 7.5,
        roundaboutSpeed: 5.2,
        queueSpeed: 2.4,
        incidentSpeed: 1.6,
        followDistance: 10.5,
        brakeBias: 1.3,
        aggressiveness: 0.8,
        speedVariance: 0.8,
        roundaboutAnxiety: 0.33,
        loopChance: 0.12,
        burstChance: 0.05,
        burstSize: 1,
        colorPalette: [0xff7043, 0xffa726, 0x1976d2]
    },
    tuktuk: {
        name: 'Tuk-Tuk',
        length: 3.2,
        width: 1.4,
        height: 1.9,
        cabinLengthFactor: 0.6,
        cabinHeightFactor: 0.6,
        cabinWidthFactor: 0.9,
        wheelRadius: 0.28,
        wheelWidth: 0.24,
        wheelFrontFactor: 0.44,
        wheelRearFactor: -0.46,
        wheelSideFactor: 0.6,
        maxSpeed: 15,
        peakSpeed: 10,
        acceleration: 5.5,
        deceleration: 9,
        roundaboutSpeed: 6.5,
        queueSpeed: 3.6,
        incidentSpeed: 2.4,
        followDistance: 5.5,
        brakeBias: 1.8,
        aggressiveness: 1.2,
        speedVariance: 1.05,
        roundaboutAnxiety: 0.24,
        loopChance: 0.3,
        burstChance: 0.25,
        burstSize: 3,
        colorPalette: [0x1565c0, 0xfdd835, 0x2e7d32, 0xef5350],
        customWheelPositions: [
            [1.0, 0.28, 0],
            [-0.9, 0.28, 0.55],
            [-0.9, 0.28, -0.55]
        ]
    },
    motorbike: {
        name: 'Motorbike',
        length: 2.4,
        width: 0.8,
        height: 1.3,
        cabinLengthFactor: 0.55,
        cabinHeightFactor: 0.45,
        cabinWidthFactor: 0.6,
        wheelRadius: 0.26,
        wheelWidth: 0.2,
        wheelFrontFactor: 0.48,
        wheelRearFactor: -0.48,
        wheelSideFactor: 0.2,
        maxSpeed: 20,
        peakSpeed: 12.5,
        acceleration: 6.8,
        deceleration: 11,
        roundaboutSpeed: 8.2,
        queueSpeed: 4.2,
        incidentSpeed: 2.8,
        followDistance: 4.0,
        brakeBias: 2.1,
        aggressiveness: 1.35,
        speedVariance: 1.12,
        roundaboutAnxiety: 0.2,
        loopChance: 0.34,
        burstChance: 0.32,
        burstSize: 4,
        colorPalette: [0xff1744, 0xffc400, 0x2979ff, 0x00e676, 0xff6f00],
        customWheelPositions: [
            [0.75, 0.26, 0],
            [-0.75, 0.26, 0]
        ]
    },
    deliveryVan: {
        name: 'Delivery Van',
        length: 5.6,
        width: 2.0,
        height: 2.4,
        cabinLengthFactor: 0.6,
        cabinHeightFactor: 0.6,
        cabinWidthFactor: 0.9,
        wheelRadius: 0.36,
        wheelWidth: 0.32,
        wheelFrontFactor: 0.44,
        wheelRearFactor: -0.44,
        wheelSideFactor: 0.6,
        maxSpeed: 16,
        peakSpeed: 10.5,
        acceleration: 4.1,
        deceleration: 8.5,
        roundaboutSpeed: 5.8,
        queueSpeed: 2.6,
        incidentSpeed: 1.9,
        followDistance: 8.5,
        brakeBias: 1.6,
        aggressiveness: 0.92,
        speedVariance: 0.88,
        roundaboutAnxiety: 0.29,
        loopChance: 0.16,
        burstChance: 0.14,
        burstSize: 2,
        colorPalette: [0xf5f5f5, 0xe0e0e0, 0xbdbdbd, 0x9e9e9e]
    }
};

export const VEHICLE_DISTRIBUTION = [
    {
        startMinutes: toMinutes(5, 0),
        weights: { sedan: 0.32, pickup: 0.16, bus: 0.06, tuktuk: 0.12, motorbike: 0.24, deliveryVan: 0.1 }
    },
    {
        startMinutes: toMinutes(7, 0),
        weights: { sedan: 0.28, pickup: 0.12, bus: 0.08, tuktuk: 0.12, motorbike: 0.32, deliveryVan: 0.08 }
    },
    {
        startMinutes: toMinutes(10, 0),
        weights: { sedan: 0.34, pickup: 0.16, bus: 0.07, tuktuk: 0.12, motorbike: 0.24, deliveryVan: 0.07 }
    },
    {
        startMinutes: toMinutes(12, 0),
        weights: { sedan: 0.3, pickup: 0.14, bus: 0.1, tuktuk: 0.15, motorbike: 0.25, deliveryVan: 0.06 }
    },
    {
        startMinutes: toMinutes(16, 0),
        weights: { sedan: 0.26, pickup: 0.18, bus: 0.12, tuktuk: 0.12, motorbike: 0.28, deliveryVan: 0.04 }
    },
    {
        startMinutes: toMinutes(19, 0),
        weights: { sedan: 0.3, pickup: 0.2, bus: 0.1, tuktuk: 0.1, motorbike: 0.2, deliveryVan: 0.1 }
    },
    {
        startMinutes: toMinutes(21, 0),
        weights: { sedan: 0.35, pickup: 0.22, bus: 0.06, tuktuk: 0.12, motorbike: 0.17, deliveryVan: 0.08 }
    }
];

export const ENTRY_LABELS = {
    a1_out: 'Vibhavadi Rangsit',
    a2_out: 'Rama IX Road',
    a3_out: 'Phahon Yothin',
    a4_out: 'Sukhumvit Extension'
};

export const INCIDENT_REASONS = [
    'double-parked delivery truck',
    'street food stall overflow',
    'minor fender-bender',
    'broken-down tuk-tuk',
    'roadside festival procession',
    'sudden downpour slowing lanes'
];
