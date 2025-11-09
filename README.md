# Bangkok Traffic Simulation

A complex 3D traffic simulation showcasing Bangkok-style traffic patterns with realistic congestion, peak hours, and continuous loop functionality.

## Features

### Enhanced Complexity (Bangkok-Style Traffic)
- **250+ vehicles** during peak hours (up from 90)
- **300 pedestrians** for realistic city atmosphere
- **Extended operation hours**: 06:00 to 22:00 (covers all requested screenshot times)
- **Three peak periods**:
  - **Morning Rush**: 07:00 - 10:00
  - **Lunch Traffic**: 11:30 - 13:30
  - **Evening Rush**: 16:00 - 20:00 (extended for Bangkok-style congestion)

### Traffic Characteristics
- Faster vehicle spawning (3.5s base interval)
- More aggressive peak hour multiplier (0.25x)
- Vehicles can loop around the roundabout during peak hours
- Realistic Bangkok-level traffic density and congestion

### Continuous Loop
The simulation runs continuously from 06:00 to 22:00, then automatically loops back to 06:00.
This ensures all screenshot times are reached in every cycle.

### Automatic Screenshot Capture
Screenshots are automatically captured at the following times:
- **08:00** - Morning rush hour
- **10:00** - Late morning traffic
- **12:00** - Lunch time traffic
- **17:00** - Evening rush hour start
- **19:00** - Peak evening congestion
- **21:00** - Late evening traffic

## Installation

```bash
npm install
```

## Running the Simulation

### Option 1: With Screenshot Server (Recommended)
```bash
npm start
```

Then open your browser to `http://localhost:5000`

Screenshots will be automatically saved to the `./screenshots/` directory when each target time is reached.

### Option 2: Basic Server (No screenshot saving)
```bash
npm run basic
```

## Screenshot Capture

### Automatic Capture (Browser)
When you run the simulation in a browser, screenshots will automatically download when the simulation reaches each target time. The files will be named:
- `bangkok_traffic_08_00.png`
- `bangkok_traffic_10_00.png`
- `bangkok_traffic_12_00.png`
- `bangkok_traffic_17_00.png`
- `bangkok_traffic_19_00.png`
- `bangkok_traffic_21_00.png`

### Manual Capture
You can also manually take screenshots at any time using your browser's screenshot tool or by pressing the appropriate keyboard shortcut.

## Simulation Speed

The simulation runs at **600x real-time speed**, meaning:
- 1 minute of real time = 10 hours of simulation time
- All screenshot times (08:00 to 21:00) are reached in approximately 1.3 minutes
- Full day cycle (06:00 to 22:00) takes about 1.6 minutes

## What to Expect at Each Screenshot Time

### 08:00 - Morning Rush
- **High vehicle count**: 150-200 vehicles
- **Status**: Peak Traffic (Morning)
- **Characteristics**: Heavy congestion, vehicles entering from all directions

### 10:00 - Late Morning
- **Moderate vehicle count**: 80-120 vehicles
- **Status**: Peak Traffic (Morning) - tail end
- **Characteristics**: Traffic starting to ease, still busy

### 12:00 - Lunch Time
- **High vehicle count**: 120-180 vehicles
- **Status**: Peak Traffic (lunch period)
- **Characteristics**: Mid-day rush, lunch traffic patterns

### 17:00 - Evening Rush Start
- **Increasing vehicle count**: 140-190 vehicles
- **Status**: Peak Traffic (Evening)
- **Characteristics**: Beginning of evening congestion

### 19:00 - Peak Evening
- **Maximum vehicle count**: 180-250 vehicles
- **Status**: Peak Traffic (Evening)
- **Characteristics**: Heaviest congestion, Bangkok-style traffic jams

### 21:00 - Late Evening
- **Moderate vehicle count**: 70-110 vehicles
- **Status**: Normal Traffic
- **Characteristics**: Traffic subsiding, end of rush hour

## Technical Details

### Architecture
- **Frontend**: Three.js for 3D rendering
- **Backend**: Express.js server
- **Map Data**: Custom roundabout with multiple entry/exit points
- **Vehicles**: Dynamic spawning based on time of day
- **Pedestrians**: Ambient city life simulation

### Files
- `main.js` - Main rendering and animation loop
- `simulation.js` - Traffic simulation logic and timing
- `screenshot-server.js` - Server with screenshot save capability
- `vehicle.js` - Vehicle behavior and physics
- `pedestrian.js` - Pedestrian movement
- `mapData.js` - Road network definition
- `mapRenderer.js` - 3D map rendering

## Browser Compatibility

Works best with modern browsers supporting WebGL:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance Notes

With 250+ vehicles and 300 pedestrians, the simulation is quite complex. For best performance:
- Use a modern GPU
- Close unnecessary browser tabs
- Enable hardware acceleration in browser settings

## Screenshot Locations

When using the screenshot server (`npm start`), all screenshots are saved to:
```
./screenshots/bangkok_traffic_[TIME].png
```

## Development

To modify simulation parameters, see `simulation.js`:
- `MAX_VEHICLES` - Maximum number of vehicles
- `NUM_PEDESTRIANS` - Number of pedestrians
- `PEAK_HOURS` - Define rush hour periods
- `SIMULATION_SPEED` - Adjust time acceleration

## License

ISC
