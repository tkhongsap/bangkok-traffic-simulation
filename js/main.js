// js/main.js
import { initThreeJS, getScene } from './scene.js';
import { createMapGeometry } from './map.js';
import { initUI } from './ui.js';
import { setupSimulation, gameLoop } from './simulation.js';

// Initialize the simulation
function init() {
    console.log("Initializing Simulation...");

    // 1. Initialize UI elements first
    initUI();

    // 2. Initialize Three.js Scene
    const threeContext = initThreeJS('simulationContainer');
    if (!threeContext) {
        console.error("Failed to initialize Three.js context. Aborting.");
        return;
    }
    const { scene, camera, renderer, controls } = threeContext;

    // 3. Create Map Geometry and Paths (populates state.nodes, state.paths etc)
    createMapGeometry(scene);

    // 4. Setup Simulation Loop with Renderer Context
    setupSimulation(renderer, camera, controls);

    // 5. Start the main game loop
    console.log("Starting simulation loop...");
    requestAnimationFrame(gameLoop);
}

// Start the initialization process when the script loads
init(); 