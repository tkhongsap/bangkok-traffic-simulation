import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOT_TIMES = [
    { hour: 8, minute: 0 },
    { hour: 10, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 17, minute: 0 },
    { hour: 19, minute: 0 },
    { hour: 21, minute: 0 }
];

async function captureScreenshots() {
    console.log('🚀 Launching browser...');
    const browser = await chromium.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--use-gl=egl'
        ]
    });
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false
    });
    const page = await context.newPage();

    // Add error handlers
    page.on('crash', () => console.error('⚠️  Page crashed'));
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error('Browser console error:', msg.text());
        }
    });

    console.log('📡 Connecting to simulation at http://localhost:5000');
    await page.goto('http://localhost:5000');

    // Wait for scene to load
    await page.waitForTimeout(3000);
    console.log('✓ Simulation loaded');

    const capturedTimes = new Set();
    let screenshotCount = 0;

    console.log('\n⏱️  Waiting for screenshot times...\n');

    // Monitor the simulation and capture screenshots
    while (screenshotCount < SCREENSHOT_TIMES.length) {
        // Get current simulation time from the UI
        const timeText = await page.locator('#time-display').textContent();
        const timeMatch = timeText.match(/(\d+):(\d+)/);

        if (timeMatch) {
            const currentHour = parseInt(timeMatch[1]);
            const currentMinute = parseInt(timeMatch[2]);

            // Check if we should capture a screenshot
            for (const targetTime of SCREENSHOT_TIMES) {
                const key = `${targetTime.hour}-${targetTime.minute}`;

                if (currentHour === targetTime.hour &&
                    currentMinute === targetTime.minute &&
                    !capturedTimes.has(key)) {

                    capturedTimes.add(key);
                    const timeStr = `${String(targetTime.hour).padStart(2, '0')}_${String(targetTime.minute).padStart(2, '0')}`;
                    const filename = `bangkok_traffic_${timeStr}.png`;
                    const filepath = path.join(__dirname, 'screenshots', filename);

                    // Get vehicle count for logging
                    const vehicleText = await page.locator('#vehicle-count').textContent();

                    await page.screenshot({
                        path: filepath,
                        fullPage: false
                    });

                    screenshotCount++;
                    console.log(`✓ [${screenshotCount}/${SCREENSHOT_TIMES.length}] Screenshot captured: ${filename}`);
                    console.log(`  Time: ${String(targetTime.hour).padStart(2, '0')}:${String(targetTime.minute).padStart(2, '0')}, ${vehicleText}`);
                }
            }
        }

        // Wait before next check
        await page.waitForTimeout(100);
    }

    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Screenshots saved to: ${path.join(__dirname, 'screenshots')}/\n`);

    await browser.close();
}

// Run the capture
captureScreenshots().catch(error => {
    console.error('❌ Error capturing screenshots:', error);
    process.exit(1);
});
