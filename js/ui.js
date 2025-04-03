import { state, setSimulationSpeedFactor, simulationSpeedFactor } from './constants.js';

let timeDisplay, vehicleCountDisplay, speedSlider, speedValueDisplay;

export function initUI() {
    timeDisplay = document.getElementById('simTime');
    vehicleCountDisplay = document.getElementById('vehicleCount');
    speedSlider = document.getElementById('speedSlider');
    speedValueDisplay = document.getElementById('speedValue');

    if (!timeDisplay || !vehicleCountDisplay || !speedSlider || !speedValueDisplay) {
        console.error("One or more UI elements not found!");
        return;
    }

    speedSlider.value = simulationSpeedFactor; // Use imported variable
    speedValueDisplay.textContent = `${simulationSpeedFactor}x`;

    speedSlider.addEventListener('input', (event) => {
        const newSpeed = parseInt(event.target.value, 10);
        setSimulationSpeedFactor(newSpeed); // Update factor via imported function
        speedValueDisplay.textContent = `${newSpeed}x`;
    });

    console.log("UI initialized.");
}

export function updateUI() {
    if (!timeDisplay || !vehicleCountDisplay) return;

    timeDisplay.textContent = formatTime(state.simTimeSeconds);
    vehicleCountDisplay.textContent = state.vehicles.length;
}

function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
} 