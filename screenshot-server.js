import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

// Create screenshots directory
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir);
}

app.use(express.static('.'));
app.use(express.json({ limit: '50mb' }));

// Endpoint to save screenshots from the client
app.post('/save-screenshot', (req, res) => {
    const { imageData, timestamp } = req.body;

    if (!imageData) {
        return res.status(400).json({ error: 'No image data provided' });
    }

    // Remove data:image/png;base64, prefix
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const filename = `bangkok_traffic_${timestamp}.png`;
    const filepath = path.join(screenshotDir, filename);

    fs.writeFile(filepath, base64Data, 'base64', (err) => {
        if (err) {
            console.error('Error saving screenshot:', err);
            return res.status(500).json({ error: 'Failed to save screenshot' });
        }

        console.log(`✓ Screenshot saved: ${filename}`);
        res.json({ success: true, filename });
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║     Bangkok Traffic Simulation Server                         ║
╚════════════════════════════════════════════════════════════════╝

Server running at http://localhost:${port}

Features:
• Complex Bangkok-style traffic simulation
• 250+ vehicles during peak hours
• Extended rush hours (morning, lunch, evening)
• Automatic screenshot capture at:
  - 08:00, 10:00, 12:00, 17:00, 19:00, 21:00
• Screenshots saved to: ./screenshots/

The simulation runs in an accelerated loop (600x speed).
All screenshot times will be reached within minutes!
    `);
});
