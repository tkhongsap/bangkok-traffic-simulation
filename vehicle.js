import * as THREE from 'three';
import { mapData, ROUNDABOUT_RADIUS, LANE_WIDTH, ROAD_WIDTH } from './mapData.js';
import { VEHICLE_TYPES } from './trafficConfig.js';

const DRIVE_RADIUS = ROUNDABOUT_RADIUS - LANE_WIDTH * 0.65;
const APPROACH_OFFSET = ROAD_WIDTH * 0.6;
const DEFAULT_TYPE = VEHICLE_TYPES?.sedan ?? {
    name: 'Sedan',
    length: 4.2,
    width: 1.75,
    height: 1.45,
    cabinLengthFactor: 0.55,
    cabinHeightFactor: 0.55,
    cabinWidthFactor: 0.85,
    wheelRadius: 0.34,
    wheelWidth: 0.28,
    wheelFrontFactor: 0.4,
    wheelRearFactor: 0.4,
    wheelSideFactor: 0.55,
    maxSpeed: 17,
    peakSpeed: 12,
    acceleration: 5,
    deceleration: 9,
    roundaboutSpeed: 6.8,
    queueSpeed: 3.2,
    incidentSpeed: 2.2,
    followDistance: 7,
    brakeBias: 1.5,
    aggressiveness: 1,
    speedVariance: 0.9,
    roundaboutAnxiety: 0.3,
    loopChance: 0.2,
    burstChance: 0.2,
    burstSize: 2,
    colorPalette: [0xff7043, 0x42a5f5, 0xffca28, 0x66bb6a, 0xab47bc, 0x26c6da, 0xef5350]
};

function chooseColor(palette = []) {
    if (!palette.length) {
        return 0xffffff * Math.random();
    }
    const index = Math.floor(Math.random() * palette.length);
    return palette[index];
}

function createVehicleMesh(vehicleType) {
    const length = vehicleType.length;
    const width = vehicleType.width;
    const height = vehicleType.height;

    const bodyHeight = height * (vehicleType.bodyHeightFactor ?? 0.6);
    const cabinLength = length * (vehicleType.cabinLengthFactor ?? 0.55);
    const cabinHeight = height * (vehicleType.cabinHeightFactor ?? 0.6);
    const cabinWidth = width * (vehicleType.cabinWidthFactor ?? 0.85);
    const bodyGeometry = new THREE.BoxGeometry(length, bodyHeight, width);
    const bodyMaterial = new THREE.MeshLambertMaterial({
        color: chooseColor(vehicleType.colorPalette),
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = height * 0.3;

    const cabinGeometry = new THREE.BoxGeometry(cabinLength, cabinHeight, cabinWidth);
    const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.92 });
    const cabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabinMesh.position.set(-length * 0.05, height * 0.58, 0);

    const wheelRadius = vehicleType.wheelRadius ?? 0.32;
    const wheelWidth = vehicleType.wheelWidth ?? 0.28;
    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 14);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x141414 });

    const wheelPositions = vehicleType.customWheelPositions
        ? vehicleType.customWheelPositions.map(position => [...position])
        : [
            [length * (vehicleType.wheelFrontFactor ?? 0.4), wheelRadius, width * (vehicleType.wheelSideFactor ?? 0.52)],
            [length * (vehicleType.wheelFrontFactor ?? 0.4), wheelRadius, -width * (vehicleType.wheelSideFactor ?? 0.52)],
            [-length * (vehicleType.wheelRearFactor ?? 0.4), wheelRadius, width * (vehicleType.wheelSideFactor ?? 0.52)],
            [-length * (vehicleType.wheelRearFactor ?? 0.4), wheelRadius, -width * (vehicleType.wheelSideFactor ?? 0.52)],
        ];

    const group = new THREE.Group();
    group.add(bodyMesh);
    group.add(cabinMesh);

    wheelPositions.forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, y, z);
        group.add(wheel);
    });

    const headlightGeometry = new THREE.BoxGeometry(width * 0.22, height * 0.18, width * 0.25);
    const headlightMaterial = new THREE.MeshLambertMaterial({ color: 0xfff9c4, emissive: 0xfff176, emissiveIntensity: 0.45 });
    const leftLight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    const rightLight = leftLight.clone();
    leftLight.position.set(length * 0.52, height * 0.45, width * 0.32);
    rightLight.position.set(length * 0.52, height * 0.45, -width * 0.32);
    group.add(leftLight);
    group.add(rightLight);

    return group;
}

function polarToVector(angle, radius) {
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
}

function computePathLength(points) {
    let total = 0;
    const segments = [];
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const length = prev.distanceTo(curr);
        segments.push(length);
        total += length;
    }
    return { total, segments };
}

export class Vehicle {
    constructor({ entrySegment, exitSegment, scene, loops = 0, vehicleType }) {
        this.entrySegment = entrySegment;
        this.exitSegment = exitSegment;
        this.scene = scene;

        const template = { ...DEFAULT_TYPE, ...(vehicleType ?? {}) };
        this.vehicleType = template;

        this.mesh = createVehicleMesh(template);
        this.mesh.castShadow = false;
        this.mesh.userData.type = template.name;

        const startNode = mapData.nodes[entrySegment.from];
        const entryNode = mapData.nodes[entrySegment.to];
        const exitNode = mapData.nodes[exitSegment.to];
        const exitRoundabout = mapData.nodes[exitSegment.from];

        if (!startNode || !entryNode || !exitNode || !exitRoundabout) {
            console.warn('Vehicle created with incomplete path data');
            this.markForRemoval = true;
            return;
        }

        this.pathPoints = this.generatePath(startNode, entryNode, exitRoundabout, exitNode, loops);
        if (this.pathPoints.length < 2) {
            console.warn('Failed to build path for vehicle');
            this.markForRemoval = true;
            return;
        }

        const { total, segments } = computePathLength(this.pathPoints);
        this.totalPathLength = total;
        this.segmentLengths = segments;
        this.distanceTravelled = 0;
        this.currentSegmentIndex = 0;

        this.maxSpeed = template.maxSpeed ?? 16;
        this.peakSpeed = template.peakSpeed ?? this.maxSpeed * 0.75;
        this.acceleration = template.acceleration ?? 5;
        this.deceleration = template.deceleration ?? 9;
        this.roundaboutSpeed = template.roundaboutSpeed ?? Math.min(this.maxSpeed, 7);
        this.queueSpeed = template.queueSpeed ?? 3;
        this.incidentSpeed = template.incidentSpeed ?? 2.2;
        this.followDistance = template.followDistance ?? 6.5;
        this.brakeBias = template.brakeBias ?? 1.5;
        this.aggressiveness = template.aggressiveness ?? 1;
        this.roundaboutAnxiety = template.roundaboutAnxiety ?? 0.28;
        this.queueThreshold = template.queueThreshold ?? Math.max(2, Math.round(this.followDistance / 2));
        this.speedVariance = (template.speedVariance ?? 1) * (0.9 + Math.random() * 0.25);
        this.verticalOffset = Math.max(template.height * 0.45, (template.wheelRadius ?? 0.3) + 0.05);

        this.speed = 0;
        this.markForRemoval = false;

        this.scene.add(this.mesh);
        this.updatePosition(0);
    }

    generatePath(startNode, entryNode, exitRoundaboutNode, exitNode, loops) {
        const startPos = new THREE.Vector3(startNode.x, 0, startNode.z);
        const entryPos = new THREE.Vector3(entryNode.x, 0, entryNode.z);
        const exitRoundabout = new THREE.Vector3(exitRoundaboutNode.x, 0, exitRoundaboutNode.z);
        const exitPos = new THREE.Vector3(exitNode.x, 0, exitNode.z);

        const entryAngle = Math.atan2(entryPos.z, entryPos.x);
        let exitAngle = Math.atan2(exitRoundabout.z, exitRoundabout.x);

        while (exitAngle >= entryAngle) {
            exitAngle -= Math.PI * 2;
        }
        exitAngle -= loops * Math.PI * 2;

        const approachDirection = entryPos.clone().sub(startPos).normalize();
        const approachMid = startPos.clone()
            .add(entryPos)
            .multiplyScalar(0.5)
            .add(new THREE.Vector3(-approachDirection.z, 0, approachDirection.x).multiplyScalar(APPROACH_OFFSET * 0.2));

        const exitDirection = exitPos.clone().sub(exitRoundabout).normalize();
        const exitMid = exitPos.clone()
            .add(exitRoundabout)
            .multiplyScalar(0.5)
            .add(new THREE.Vector3(-exitDirection.z, 0, exitDirection.x).multiplyScalar(APPROACH_OFFSET * 0.25));

        const arcPoints = [];
        const startArcAngle = entryAngle - Math.PI / 6;
        const endArcAngle = exitAngle + Math.PI / 8;
        const steps = Math.max(10, Math.ceil(Math.abs(endArcAngle - startArcAngle) / (Math.PI / 18)));
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = startArcAngle + (endArcAngle - startArcAngle) * t;
            arcPoints.push(polarToVector(angle, DRIVE_RADIUS));
        }

        const rawPoints = [
            startPos,
            approachMid,
            entryPos,
            ...arcPoints,
            exitRoundabout,
            exitMid,
            exitPos
        ];

        const curve = new THREE.CatmullRomCurve3(rawPoints, false, 'catmullrom', 0.6);
        return curve.getPoints(160);
    }

    update(deltaTime, neighbours, context) {
        if (this.markForRemoval) {
            return;
        }

        const { peak, roundaboutDensity, approachCounts, incidentEntry, incidentSeverity, intensity } = context;
        const baseSpeed = (peak ? this.peakSpeed : this.maxSpeed) * this.speedVariance;
        let targetSpeed = baseSpeed;

        const approachQueue = approachCounts.get(this.entrySegment.from) ?? 0;
        if (this.isOnApproach() && approachQueue > this.queueThreshold) {
            targetSpeed = Math.min(targetSpeed, this.queueSpeed);
        }

        if (this.isInRoundabout()) {
            const densityExcess = Math.max(0, roundaboutDensity - this.roundaboutAnxiety);
            if (densityExcess > 0) {
                const clamp = Math.min(1, densityExcess * 2.1);
                targetSpeed = Math.min(targetSpeed, this.roundaboutSpeed * (1 - clamp * 0.45));
            }
        }

        if (incidentEntry && incidentEntry === this.entrySegment.from && this.isOnApproach()) {
            const severityFactor = 1 + incidentSeverity * 0.6;
            targetSpeed = Math.min(targetSpeed, this.incidentSpeed / severityFactor);
        }

        if (!peak && intensity > 1.15 && this.isInRoundabout()) {
            targetSpeed = Math.min(targetSpeed, this.roundaboutSpeed * 0.95);
        }

        for (const other of neighbours) {
            if (other === this || other.markForRemoval) continue;

            if (other.entrySegment.from === this.entrySegment.from) {
                if (other.distanceTravelled <= this.distanceTravelled) {
                    continue;
                }

                const gap = other.distanceTravelled - this.distanceTravelled;
                if (gap < this.followDistance) {
                    const safeSpeed = Math.max(0, other.speed - this.brakeBias);
                    targetSpeed = Math.min(targetSpeed, safeSpeed);
                }

                continue;
            }

            const distance = this.mesh.position.distanceTo(other.mesh.position);
            if (distance < this.followDistance) {
                const safeSpeed = Math.max(0, other.speed - this.brakeBias);
                targetSpeed = Math.min(targetSpeed, safeSpeed);
            }
        }

        targetSpeed = Math.max(0, targetSpeed);

        const accel = this.acceleration * this.aggressiveness;
        const decel = this.deceleration / Math.max(0.6, this.aggressiveness);

        if (this.speed < targetSpeed) {
            this.speed = Math.min(targetSpeed, this.speed + accel * deltaTime);
        } else {
            this.speed = Math.max(targetSpeed, this.speed - decel * deltaTime);
        }

        this.distanceTravelled += this.speed * deltaTime;
        if (this.distanceTravelled >= this.totalPathLength) {
            this.markForRemoval = true;
            return;
        }

        this.updatePosition(this.distanceTravelled);
    }

    updatePosition(distance) {
        let remaining = distance;
        let segmentIndex = 0;
        while (segmentIndex < this.segmentLengths.length && remaining > this.segmentLengths[segmentIndex]) {
            remaining -= this.segmentLengths[segmentIndex];
            segmentIndex += 1;
        }

        const startPoint = this.pathPoints[segmentIndex];
        const endPoint = this.pathPoints[Math.min(segmentIndex + 1, this.pathPoints.length - 1)];
        const segmentLength = this.segmentLengths[segmentIndex] || 1;
        const t = segmentLength === 0 ? 0 : remaining / segmentLength;

        const position = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
        this.mesh.position.set(position.x, this.verticalOffset, position.z);

        const direction = endPoint.clone().sub(startPoint).normalize();
        const yaw = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.y = yaw;
    }

    isInRoundabout() {
        const { x, z } = this.mesh.position;
        const distance = Math.sqrt(x * x + z * z);
        return distance < ROUNDABOUT_RADIUS + LANE_WIDTH * 1.25;
    }

    isOnApproach() {
        return this.distanceTravelled < this.totalPathLength * 0.35;
    }

    isOnExit() {
        return this.distanceTravelled > this.totalPathLength * 0.65;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
    }
}
