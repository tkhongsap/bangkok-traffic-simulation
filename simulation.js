import { mapData } from './mapData.js';
import { Vehicle } from './vehicle.js';
import { Pedestrian } from './pedestrian.js';
import {
    TRAFFIC_START_HOUR,
    TRAFFIC_END_HOUR,
    SIMULATION_SPEED,
    TRAFFIC_INTENSITY_SCHEDULE,
    PEAK_HOURS,
    ENTRY_FLOW_WEIGHTS,
    ENTRY_TIME_PROFILES,
    EXIT_FLOW_WEIGHTS,
    VEHICLE_TYPES,
    VEHICLE_DISTRIBUTION,
    ENTRY_LABELS,
    INCIDENT_REASONS
} from './trafficConfig.js';

const START_HOUR = TRAFFIC_START_HOUR;
const END_HOUR = TRAFFIC_END_HOUR;
const NUM_PEDESTRIANS = 200;

const BASE_SPAWN_INTERVAL = 4.8;
const OFFPEAK_VARIATION = 0.55;

const MAX_VEHICLES_BASE = 160;
const MAX_VEHICLES_PEAK_EXTRA = 120;

let simulationTime = new Date();
simulationTime.setHours(START_HOUR, 0, 0, 0);

const vehicles = [];
const pedestrians = [];

const spawnTimers = new Map();
const entrySegments = mapData.segments.filter(segment =>
    segment.from.startsWith('a') && segment.to.startsWith('r')
);

const exitSegments = mapData.segments.filter(segment =>
    segment.from.startsWith('r') && segment.to.startsWith('a')
);

const entryNodeIds = [...new Set(entrySegments.map(segment => segment.from))];

const MAX_VEHICLE_CAP = 320;
const SIM_MINUTES_PER_SECOND = SIMULATION_SPEED / 60;
const INCIDENT_RESPAWN_DELAY_RANGE = [18, 35];

let activeIncident = null;
let minutesUntilNextIncident = INCIDENT_RESPAWN_DELAY_RANGE[0] + Math.random() * (INCIDENT_RESPAWN_DELAY_RANGE[1] - INCIDENT_RESPAWN_DELAY_RANGE[0]);

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function resetIncidentTimer() {
    minutesUntilNextIncident = randomBetween(INCIDENT_RESPAWN_DELAY_RANGE[0], INCIDENT_RESPAWN_DELAY_RANGE[1]);
}

function wrapMinutes(minutes) {
    const total = 24 * 60;
    return ((minutes % total) + total) % total;
}

function findScheduleBracket(schedule, minutes) {
    if (schedule.length === 0) {
        return { current: null, next: null, progress: 0 };
    }

    const sorted = schedule.slice().sort((a, b) => a.startMinutes - b.startMinutes);
    const wrappedMinutes = wrapMinutes(minutes);

    for (let i = 0; i < sorted.length; i += 1) {
        const current = sorted[i];
        const next = sorted[(i + 1) % sorted.length];
        const start = current.startMinutes;
        const nextStart = next.startMinutes;
        const end = nextStart > start ? nextStart : nextStart + 24 * 60;
        const comparisonMinutes = wrappedMinutes >= start ? wrappedMinutes : wrappedMinutes + 24 * 60;

        if (comparisonMinutes >= start && comparisonMinutes < end) {
            const interval = end - start;
            const progress = interval === 0 ? 0 : (comparisonMinutes - start) / interval;
            return { current, next, progress };
        }
    }

    const current = sorted[sorted.length - 1];
    const next = sorted[0];
    return { current, next, progress: 0 };
}

function minutesFromTime(date) {
    return date.getHours() * 60 + date.getMinutes();
}

function getTrafficIntensityMultiplier() {
    const minutes = minutesFromTime(simulationTime);
    const { current, next, progress } = findScheduleBracket(TRAFFIC_INTENSITY_SCHEDULE, minutes);
    if (!current) {
        return 1;
    }

    const currentIntensity = current.intensity;
    const nextIntensity = next?.intensity ?? currentIntensity;
    return currentIntensity + (nextIntensity - currentIntensity) * progress;
}

function getEntryFlowMultiplier(entryId) {
    const minutes = minutesFromTime(simulationTime);
    const { current, next, progress } = findScheduleBracket(ENTRY_TIME_PROFILES, minutes);
    const currentMultiplier = current?.multipliers?.[entryId] ?? 1;
    const nextMultiplier = next?.multipliers?.[entryId] ?? currentMultiplier;
    const interpolated = currentMultiplier + (nextMultiplier - currentMultiplier) * progress;
    return (ENTRY_FLOW_WEIGHTS[entryId] ?? 1) * interpolated;
}

function chooseVehicleType() {
    const minutes = minutesFromTime(simulationTime);
    const { current, next, progress } = findScheduleBracket(VEHICLE_DISTRIBUTION, minutes);
    const keys = Object.keys(VEHICLE_TYPES);
    if (!current) {
        const fallbackKey = keys[Math.floor(Math.random() * keys.length)];
        return VEHICLE_TYPES[fallbackKey];
    }

    let totalWeight = 0;
    const weights = new Map();
    keys.forEach(key => {
        const currentWeight = current.weights?.[key] ?? 0;
        const nextWeight = next?.weights?.[key] ?? currentWeight;
        const blended = Math.max(0, currentWeight + (nextWeight - currentWeight) * progress);
        weights.set(key, blended);
        totalWeight += blended;
    });

    if (totalWeight <= 0) {
        const fallbackKey = keys[Math.floor(Math.random() * keys.length)];
        return VEHICLE_TYPES[fallbackKey];
    }

    let threshold = Math.random() * totalWeight;
    for (const key of keys) {
        threshold -= weights.get(key) ?? 0;
        if (threshold <= 0) {
            return VEHICLE_TYPES[key];
        }
    }

    return VEHICLE_TYPES[keys[keys.length - 1]];
}

function chooseExitSegment(entryId, candidates) {
    if (candidates.length === 0) {
        return null;
    }

    const weights = candidates.map(segment => {
        const exitWeights = EXIT_FLOW_WEIGHTS[entryId] ?? {};
        const weight = exitWeights[segment.to] ?? 1;
        return Math.max(0.1, weight);
    });

    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let threshold = Math.random() * total;

    for (let i = 0; i < candidates.length; i += 1) {
        threshold -= weights[i];
        if (threshold <= 0) {
            return candidates[i];
        }
    }

    return candidates[candidates.length - 1];
}

function getVehicleCap(intensity, peak) {
    const base = MAX_VEHICLES_BASE * Math.max(0.75, intensity);
    const peakBonus = peak ? MAX_VEHICLES_PEAK_EXTRA : 0;
    return Math.min(MAX_VEHICLE_CAP, Math.round(base + peakBonus));
}

function getCurrentSpawnInterval(intensity, peak) {
    const intensityFactor = Math.max(0.4, intensity);
    const base = BASE_SPAWN_INTERVAL / intensityFactor;
    const jitter = peak ? 0.25 : OFFPEAK_VARIATION;
    const randomFactor = 1 - jitter / 2 + Math.random() * jitter;
    return Math.max(0.65, base * randomFactor);
}

function createVehicleLoops(vehicleType, intensity, peak) {
    const baseChance = vehicleType.loopChance ?? 0;
    const intensityBonus = intensity > 1.25 ? 0.12 : intensity > 1 ? 0.06 : 0;
    const peakBonus = peak ? 0.08 : 0;
    return Math.random() < baseChance + intensityBonus + peakBonus ? 1 : 0;
}

function determineBurstCount(vehicleType, intensity) {
    if (!vehicleType.burstChance || vehicleType.burstSize <= 1) {
        return 1;
    }
    const modifier = Math.min(1.8, intensity + 0.3);
    if (Math.random() >= vehicleType.burstChance * modifier) {
        return 1;
    }
    const additional = Math.max(1, Math.round(Math.random() * (vehicleType.burstSize - 1)));
    return 1 + additional;
}

function collectTrafficSnapshot() {
    const approachCounts = new Map();
    entryNodeIds.forEach(id => approachCounts.set(id, 0));

    let roundaboutCount = 0;
    vehicles.forEach(vehicle => {
        if (vehicle.isInRoundabout()) {
            roundaboutCount += 1;
        }
        if (vehicle.isOnApproach()) {
            const entryId = vehicle.entrySegment.from;
            approachCounts.set(entryId, (approachCounts.get(entryId) ?? 0) + 1);
        }
    });

    const queueValues = Array.from(approachCounts.values());
    const maxApproachQueue = queueValues.length > 0 ? Math.max(...queueValues) : 0;
    const averageApproach = queueValues.length > 0 ? queueValues.reduce((sum, value) => sum + value, 0) / queueValues.length : 0;

    return { roundaboutCount, approachCounts, maxApproachQueue, averageApproach };
}

function buildTrafficContext(peak, intensity) {
    const snapshot = collectTrafficSnapshot();
    const roundaboutDensity = vehicles.length === 0 ? 0 : snapshot.roundaboutCount / vehicles.length;

    return {
        ...snapshot,
        roundaboutDensity,
        peak,
        intensity,
        incidentEntry: activeIncident?.entryId ?? null,
        incidentSeverity: activeIncident?.severity ?? 0,
    };
}

function updateIncidents(deltaTime, intensity) {
    const deltaMinutes = deltaTime * SIM_MINUTES_PER_SECOND;

    if (activeIncident) {
        activeIncident.remainingMinutes -= deltaMinutes;
        if (activeIncident.remainingMinutes <= 0) {
            activeIncident = null;
            resetIncidentTimer();
        }
        return;
    }

    minutesUntilNextIncident -= deltaMinutes;
    if (minutesUntilNextIncident > 0) {
        return;
    }

    if (intensity < 0.85 && Math.random() > 0.35) {
        resetIncidentTimer();
        return;
    }

    const entryId = entryNodeIds[Math.floor(Math.random() * entryNodeIds.length)];
    const severity = 0.35 + Math.random() * (intensity > 1.3 ? 0.4 : 0.25);
    const duration = 8 + Math.random() * 14;
    const reason = INCIDENT_REASONS[Math.floor(Math.random() * INCIDENT_REASONS.length)];

    activeIncident = {
        entryId,
        severity,
        remainingMinutes: duration,
        reason,
        spawnModifier: 1 + severity * 1.8,
    };

    minutesUntilNextIncident = 25 + Math.random() * 25;
}

function initialiseSpawnTimers() {
    entryNodeIds.forEach(id => {
        if (!spawnTimers.has(id)) {
            spawnTimers.set(id, Math.random() * BASE_SPAWN_INTERVAL);
        }
    });
}

initialiseSpawnTimers();

export function getSimulationTime() {
    return simulationTime;
}

export function getVehicles() {
    return vehicles;
}

export function setSimulationTime(hour, minute = 0, second = 0) {
    const totalMinutes = wrapMinutes(hour * 60 + minute);
    const startMinutes = START_HOUR * 60;
    const endMinutes = END_HOUR * 60 - 1;
    const clampedMinutes = Math.min(Math.max(totalMinutes, startMinutes), endMinutes);
    const clampedHour = Math.floor(clampedMinutes / 60);
    const clampedMinute = clampedMinutes % 60;
    simulationTime.setHours(clampedHour, clampedMinute, second, 0);
}

export function isPeakHour(time) {
    const minutes = time.getHours() * 60 + time.getMinutes();
    return PEAK_HOURS.some(({ start, end }) => {
        const startMinutes = start.hour * 60 + start.minute;
        const endMinutes = end.hour * 60 + end.minute;
        return minutes >= startMinutes && minutes <= endMinutes;
    });
}

function updateSimulationClock(deltaTime) {
    const elapsedMillis = deltaTime * 1000 * SIMULATION_SPEED;
    simulationTime = new Date(simulationTime.getTime() + elapsedMillis);

    if (simulationTime.getHours() >= END_HOUR) {
        simulationTime.setHours(START_HOUR, 0, 0, 0);
        spawnTimers.clear();
        initialiseSpawnTimers();
        activeIncident = null;
        resetIncidentTimer();
    }
}

function spawnVehicles(deltaTime, scene, intensity) {
    const peak = isPeakHour(simulationTime);
    const vehicleCap = getVehicleCap(intensity, peak);

    if (vehicles.length >= vehicleCap) {
        return;
    }

    const baseInterval = getCurrentSpawnInterval(intensity, peak);

    entryNodeIds.forEach(entryId => {
        const currentTimer = (spawnTimers.get(entryId) ?? 0) + deltaTime;
        spawnTimers.set(entryId, currentTimer);

        const incidentModifier = activeIncident && activeIncident.entryId === entryId ? activeIncident.spawnModifier : 1;
        const entryMultiplier = getEntryFlowMultiplier(entryId);
        const adjustedInterval = baseInterval / Math.max(0.4, entryMultiplier) * incidentModifier;

        if (currentTimer < adjustedInterval) {
            return;
        }

        const possibleEntrySegments = entrySegments.filter(segment => segment.from === entryId);
        if (possibleEntrySegments.length === 0) {
            return;
        }

        const entrySegment = possibleEntrySegments[Math.floor(Math.random() * possibleEntrySegments.length)];
        const entryRoundaboutNode = entrySegment.to;

        const possibleExitSegments = exitSegments.filter(segment => segment.from !== entryRoundaboutNode);
        if (possibleExitSegments.length === 0) {
            spawnTimers.set(entryId, currentTimer - adjustedInterval * 0.5);
            return;
        }

        const vehicleType = chooseVehicleType();
        const burstCount = determineBurstCount(vehicleType, intensity);
        let spawned = false;

        for (let i = 0; i < burstCount; i += 1) {
            if (vehicles.length >= vehicleCap) {
                break;
            }

            const exitSegment = chooseExitSegment(entryId, possibleExitSegments);
            if (!exitSegment) {
                continue;
            }

            const loops = createVehicleLoops(vehicleType, intensity, peak);
            const vehicle = new Vehicle({ entrySegment, exitSegment, scene, loops, vehicleType });
            if (!vehicle.markForRemoval) {
                vehicles.push(vehicle);
                spawned = true;
            }
        }

        if (spawned) {
            spawnTimers.set(entryId, 0);
        } else {
            spawnTimers.set(entryId, currentTimer - adjustedInterval * 0.4);
        }
    });
}

function updateVehicles(deltaTime, trafficContext) {
    vehicles.forEach(vehicle => vehicle.update(deltaTime, vehicles, trafficContext));
}

function cleanupVehicles() {
    for (let i = vehicles.length - 1; i >= 0; i -= 1) {
        if (vehicles[i].markForRemoval) {
            vehicles[i].dispose();
            vehicles.splice(i, 1);
        }
    }
}

function ensurePedestrians(scene) {
    if (pedestrians.length > 0) {
        return;
    }
    for (let i = 0; i < NUM_PEDESTRIANS; i += 1) {
        pedestrians.push(new Pedestrian(scene));
    }
}

function updatePedestrians(deltaTime) {
    pedestrians.forEach(pedestrian => pedestrian.update(deltaTime));
}

export function update(deltaTime, scene) {
    updateSimulationClock(deltaTime);
    ensurePedestrians(scene);

    const intensity = getTrafficIntensityMultiplier();
    updateIncidents(deltaTime, intensity);

    spawnVehicles(deltaTime, scene, intensity);

    const peak = isPeakHour(simulationTime);
    const trafficContext = buildTrafficContext(peak, intensity);
    updateVehicles(deltaTime, trafficContext);
    cleanupVehicles();
    updatePedestrians(deltaTime);

    const updatedContext = buildTrafficContext(peak, intensity);

    const incidentState = activeIncident
        ? {
            entryId: activeIncident.entryId,
            label: ENTRY_LABELS[activeIncident.entryId] ?? activeIncident.entryId,
            reason: activeIncident.reason,
            severity: activeIncident.severity,
            remainingMinutes: Math.max(0, activeIncident.remainingMinutes)
        }
        : null;

    return {
        time: simulationTime,
        vehicleCount: vehicles.length,
        isPeak: peak,
        intensity,
        roundaboutCount: updatedContext.roundaboutCount,
        roundaboutDensity: updatedContext.roundaboutDensity,
        maxApproachQueue: updatedContext.maxApproachQueue,
        incident: incidentState,
    };
}
