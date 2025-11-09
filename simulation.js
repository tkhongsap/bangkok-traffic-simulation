import { mapData } from './mapData.js';
import { Vehicle } from './vehicle.js';
import { Pedestrian } from './pedestrian.js';

const START_HOUR = 6;
const END_HOUR = 20;
const SIMULATION_SPEED = 600;
const MAX_VEHICLES = 90;
const NUM_PEDESTRIANS = 200;

const BASE_SPAWN_INTERVAL = 5.5;
const PEAK_INTERVAL_MULTIPLIER = 0.38;
const OFFPEAK_VARIATION = 0.6;

const PEAK_HOURS = [
    { start: { hour: 7, minute: 30 }, end: { hour: 9, minute: 30 } },
    { start: { hour: 16, minute: 30 }, end: { hour: 19, minute: 0 } }
];

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

export function isPeakHour(time) {
    const minutes = time.getHours() * 60 + time.getMinutes();
    return PEAK_HOURS.some(({ start, end }) => {
        const startMinutes = start.hour * 60 + start.minute;
        const endMinutes = end.hour * 60 + end.minute;
        return minutes >= startMinutes && minutes <= endMinutes;
    });
}

function getCurrentSpawnInterval() {
    const peak = isPeakHour(simulationTime);
    const base = peak ? BASE_SPAWN_INTERVAL * PEAK_INTERVAL_MULTIPLIER : BASE_SPAWN_INTERVAL;
    const randomFactor = peak ? 0.85 + Math.random() * 0.3 : 1 - OFFPEAK_VARIATION / 2 + Math.random() * OFFPEAK_VARIATION;
    return Math.max(1.2, base * randomFactor);
}

function updateSimulationClock(deltaTime) {
    const elapsedMillis = deltaTime * 1000 * SIMULATION_SPEED;
    simulationTime = new Date(simulationTime.getTime() + elapsedMillis);

    if (simulationTime.getHours() >= END_HOUR) {
        simulationTime.setHours(START_HOUR, 0, 0, 0);
        spawnTimers.clear();
        initialiseSpawnTimers();
    }
}

function spawnVehicles(deltaTime, scene) {
    if (vehicles.length >= MAX_VEHICLES) {
        return;
    }

    const currentInterval = getCurrentSpawnInterval();
    const peak = isPeakHour(simulationTime);

    entryNodeIds.forEach(entryId => {
        const currentTimer = (spawnTimers.get(entryId) ?? 0) + deltaTime;
        spawnTimers.set(entryId, currentTimer);

        if (currentTimer < currentInterval) {
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
            spawnTimers.set(entryId, currentTimer - currentInterval * 0.5);
            return;
        }

        const exitSegment = possibleExitSegments[Math.floor(Math.random() * possibleExitSegments.length)];
        const loops = peak && Math.random() < 0.25 ? 1 : 0;

        const vehicle = new Vehicle({ entrySegment, exitSegment, scene, loops });
        if (!vehicle.markForRemoval) {
            vehicles.push(vehicle);
            spawnTimers.set(entryId, 0);
        } else {
            spawnTimers.set(entryId, currentTimer - currentInterval * 0.4);
        }
    });
}

function updateVehicles(deltaTime) {
    const peak = isPeakHour(simulationTime);
    vehicles.forEach(vehicle => vehicle.update(deltaTime, vehicles, peak));
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
    spawnVehicles(deltaTime, scene);
    updateVehicles(deltaTime);
    cleanupVehicles();
    updatePedestrians(deltaTime);

    return {
        time: simulationTime,
        vehicleCount: vehicles.length,
    };
}
