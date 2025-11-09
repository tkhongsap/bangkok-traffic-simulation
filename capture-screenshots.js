/**
 * Screenshot Capture Instructions
 *
 * This simulation has automatic screenshot capture built-in.
 * When you run the simulation in a browser, it will automatically
 * download screenshots at the following times:
 * - 08:00 (Morning rush hour)
 * - 10:00 (Late morning traffic)
 * - 12:00 (Lunch time traffic)
 * - 17:00 (Evening rush hour start)
 * - 19:00 (Peak evening rush)
 * - 21:00 (Late evening traffic)
 *
 * The simulation runs from 06:00 to 22:00 and then loops back.
 * Screenshots will be automatically saved to your Downloads folder
 * when each time is reached.
 *
 * To use:
 * 1. Start the server: npm start
 * 2. Open http://localhost:5000 in your browser
 * 3. Allow automatic downloads when prompted
 * 4. Wait for the simulation to reach each screenshot time
 * 5. Screenshots will download automatically as:
 *    - bangkok_traffic_08_00.png
 *    - bangkok_traffic_10_00.png
 *    - bangkok_traffic_12_00.png
 *    - bangkok_traffic_17_00.png
 *    - bangkok_traffic_19_00.png
 *    - bangkok_traffic_21_00.png
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Bangkok Traffic Simulation - Screenshot Capture              ║
╚════════════════════════════════════════════════════════════════╝

Automatic screenshot capture is enabled in the browser.

Steps to capture screenshots:
1. Start the server: npm start
2. Open http://localhost:5000 in your browser
3. Allow automatic downloads when prompted
4. Screenshots will auto-download at:
   • 08:00 (Morning rush)
   • 10:00 (Late morning)
   • 12:00 (Lunch time)
   • 17:00 (Evening rush start)
   • 19:00 (Peak evening)
   • 21:00 (Late evening)

The simulation features:
• 250+ vehicles (Bangkok-level traffic density)
• Extended peak hours with morning, lunch, and evening rushes
• Continuous loop from 06:00 to 22:00
• 300 pedestrians for realistic city scenes
• Automatic screenshot capture at key times

Note: The simulation speed is accelerated (600x), so you'll reach
all screenshot times within a few minutes.
`);
