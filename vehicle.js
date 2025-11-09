import * as THREE from 'three';
import { mapData, ROUNDABOUT_RADIUS, LANE_WIDTH, ROAD_WIDTH } from './mapData.js';

const VEHICLE_LENGTH = 3.8;
const VEHICLE_WIDTH = 1.6;
const VEHICLE_HEIGHT = 1.4;
const CABIN_HEIGHT = 0.7;
const WHEEL_RADIUS = 0.32;
const WHEEL_WIDTH = 0.28;
const DRIVE_RADIUS = ROUNDABOUT_RADIUS - LANE_WIDTH * 0.65;
const APPROACH_OFFSET = ROAD_WIDTH * 0.6;

const CAR_COLORS = [
    0xff7043, 0x42a5f5, 0xffca28, 0x66bb6a, 0xab47bc, 0x26c6da, 0xef5350
];

function createVehicleMesh() {
    const bodyGeometry = new THREE.BoxGeometry(VEHICLE_LENGTH, VEHICLE_HEIGHT * 0.6, VEHICLE_WIDTH);
    const bodyMaterial = new THREE.MeshLambertMaterial({
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = VEHICLE_HEIGHT * 0.3;

    const cabinGeometry = new THREE.BoxGeometry(VEHICLE_LENGTH * 0.55, CABIN_HEIGHT, VEHICLE_WIDTH * 0.85);
    const cabinMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
    const cabinMesh = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabinMesh.position.set(-VEHICLE_LENGTH * 0.05, VEHICLE_HEIGHT * 0.65, 0);

    const wheelGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_WIDTH, 12);
    const wheelMaterial = new THREE.MeshLambertMaterial({ color: 0x111111 });

    const wheelPositions = [
        [VEHICLE_LENGTH * 0.35, WHEEL_RADIUS, VEHICLE_WIDTH * 0.5],
        [VEHICLE_LENGTH * 0.35, WHEEL_RADIUS, -VEHICLE_WIDTH * 0.5],
        [-VEHICLE_LENGTH * 0.35, WHEEL_RADIUS, VEHICLE_WIDTH * 0.5],
        [-VEHICLE_LENGTH * 0.35, WHEEL_RADIUS, -VEHICLE_WIDTH * 0.5]
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

    // Simple headlights for a touch of detail
    const headlightGeometry = new THREE.BoxGeometry(0.2, 0.18, 0.3);
    const headlightMaterial = new THREE.MeshLambertMaterial({ color: 0xfff9c4, emissive: 0xfff176, emissiveIntensity: 0.5 });
    const leftLight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    const rightLight = leftLight.clone();
    leftLight.position.set(VEHICLE_LENGTH * 0.52, VEHICLE_HEIGHT * 0.4, VEHICLE_WIDTH * 0.3);
    rightLight.position.set(VEHICLE_LENGTH * 0.52, VEHICLE_HEIGHT * 0.4, -VEHICLE_WIDTH * 0.3);
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
    constructor({ entrySegment, exitSegment, scene, loops = 0 }) {
        this.entrySegment = entrySegment;
        this.exitSegment = exitSegment;
        this.scene = scene;
        this.mesh = createVehicleMesh();
        this.mesh.castShadow = false;

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

        this.maxSpeed = 16;
        this.peakSpeed = 11;
        this.acceleration = 5;
        this.deceleration = 10;
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

    update(deltaTime, neighbours, isPeakHour) {
        if (this.markForRemoval) {
            return;
        }

        const desiredSpeed = isPeakHour ? this.peakSpeed : this.maxSpeed;
        let targetSpeed = desiredSpeed;

        for (const other of neighbours) {
            if (other === this || other.markForRemoval) continue;
            const distance = this.mesh.position.distanceTo(other.mesh.position);
            if (distance < VEHICLE_LENGTH * 2.5) {
                targetSpeed = Math.min(targetSpeed, Math.max(0, other.speed - 1));
            }
        }

        if (this.speed < targetSpeed) {
            this.speed = Math.min(targetSpeed, this.speed + this.acceleration * deltaTime);
        } else {
            this.speed = Math.max(targetSpeed, this.speed - this.deceleration * deltaTime);
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
        const endPoint = this.pathPoints[segmentIndex + 1];
        const segmentLength = this.segmentLengths[segmentIndex] || 1;
        const t = segmentLength === 0 ? 0 : remaining / segmentLength;

        const position = new THREE.Vector3().lerpVectors(startPoint, endPoint, t);
        this.mesh.position.set(position.x, VEHICLE_HEIGHT * 0.5, position.z);

        const direction = endPoint.clone().sub(startPoint).normalize();
        const yaw = Math.atan2(direction.x, direction.z);
        this.mesh.rotation.y = yaw;
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
