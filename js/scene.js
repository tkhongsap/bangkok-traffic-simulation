import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GROUND_COLOR } from './constants.js';

let scene, camera, renderer, controls;

export function initThreeJS(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error("Container element not found:", containerId);
        return null;
    }
    const canvas = document.getElementById('simulationCanvas');
    if (!canvas) {
        console.error("Canvas element not found: simulationCanvas");
        return null;
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe0e0e0); // Keep distinct background for now

    // Camera
    const aspect = container.clientWidth / (window.innerHeight * 0.8); // Base on container width
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 2000); // Adjusted FOV and far plane
    camera.position.set(0, 150, 250); // Adjusted position
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, window.innerHeight * 0.8);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Adjusted intensity
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Adjusted intensity
    directionalLight.position.set(50, 100, 75);
    directionalLight.castShadow = true; // Enable shadows if needed later
    scene.add(directionalLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 50;
    controls.maxDistance = 600; // Increased max distance
    controls.target.set(0, 0, 0); // Ensure controls target the center
    controls.update();

    // Ground Plane (moved from map, basic setup here)
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000); // Larger ground
    const planeMaterial = new THREE.MeshStandardMaterial({ color: GROUND_COLOR, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.5;
    plane.receiveShadow = true; // Allow receiving shadows
    scene.add(plane);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize(); // Initial call

    console.log("Three.js scene initialized.");

    return { scene, camera, renderer, controls };
}

function onWindowResize() {
    if (!camera || !renderer) return;

    const container = document.getElementById('simulationContainer');
    const width = container.clientWidth;
    const height = window.innerHeight * 0.8;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Export functions needed elsewhere (e.g., add meshes)
export function getScene() {
    return scene;
} 