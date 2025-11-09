# Bangkok Traffic Simulation

A 3D web-based traffic simulation featuring a Bangkok-style roundabout with realistic traffic patterns, pedestrians, and urban environment.

![Bangkok Traffic Simulation](https://img.shields.io/badge/status-working-brightgreen)
![Three.js](https://img.shields.io/badge/Three.js-0.175.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)

## Features

### Traffic Simulation
- **Realistic roundabout traffic** with multi-lane support
- **Peak hour simulation** (8:00-9:30 AM, 5:00-7:00 PM)
- **Intelligent vehicle behavior**:
  - Safe following distance
  - Yielding at roundabout entries
  - Speed variation based on traffic conditions
  - Lane selection and maintenance

### Visual Elements
- **Dense urban environment** with 800+ buildings
- **250 pedestrians** moving around the city
- **Color-coded vehicles** indicating speed:
  - 🟢 Green: Normal speed
  - 🟡 Yellow: Medium speed
  - 🔴 Red: Stopped/slow
- **Dynamic lighting** with ambient and directional lights
- **Animated clouds** in the sky

### User Interface
- Real-time simulation clock (6:00 AM - 8:00 PM)
- Peak hour indicator
- Live vehicle count
- Smooth 60 FPS rendering

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Modern web browser with WebGL support

### Installation

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The simulation will be available at `http://localhost:5000`

## Project Structure

```
bangkok-traffic-simulation/
├── index.html          # Main HTML entry point
├── main.js            # Three.js scene setup and animation loop
├── simulation.js      # Simulation state and update logic
├── vehicle.js         # Vehicle class with movement and behavior
├── pedestrian.js      # Pedestrian class with random movement
├── mapData.js         # Map configuration and building definitions
├── mapRenderer.js     # 3D geometry creation for map elements
├── style.css          # UI overlay styles
├── server.js          # Express static file server
└── package.json       # Dependencies and scripts
```

## How It Works

### Simulation Loop
1. **Time Management**: Accelerated simulation time (600x real-time)
2. **Vehicle Spawning**: Dynamic spawning based on time of day
3. **Movement Updates**: Physics-based movement with acceleration/deceleration
4. **Collision Avoidance**: Following distance and yielding logic
5. **Cleanup**: Remove vehicles that complete their journey

### Vehicle Paths
- Vehicles spawn at entry points (North, South, East, West)
- Navigate through the roundabout
- Exit at a different point (or occasionally loop around)
- Follow lane-specific paths with proper offset

### Peak Hours
During peak hours (8:00-9:30 AM and 5:00-7:00 PM):
- 10x more vehicles spawn
- Traffic density increases significantly
- Vehicle speeds reduce to simulate congestion
- UI indicator turns red and pulses

## Configuration

### Modify Spawn Rates
Edit `simulation.js`:
```javascript
const BASE_SPAWN_INTERVAL = 0.05;  // Seconds between spawns
const PEAK_HOUR_MULTIPLIER = 0.01; // Multiplier during peak
```

### Adjust Vehicle Speed
Edit `vehicle.js`:
```javascript
export const MAX_SPEED = 25;           // m/s (~90 kph)
export const MAX_SPEED_PEAK = MAX_SPEED * 0.7; // Peak hour speed
```

### Change Pedestrian Count
Edit `simulation.js`:
```javascript
const NUM_PEDESTRIANS = 250; // Number of pedestrians
```

## Browser Console
Open browser DevTools (F12) to see:
- Module loading status
- Vehicle creation logs
- Simulation time resets
- Performance metrics

## Troubleshooting

### Blank Screen
- Check browser console for errors
- Ensure server is running on port 5000
- Verify WebGL is enabled in your browser

### Low Performance
- Reduce pedestrian count
- Lower vehicle spawn rates
- Close other browser tabs
- Update graphics drivers

### No Vehicles Appearing
- Wait a few seconds for spawning to begin
- Check simulation time in UI
- Verify no console errors

## Technical Details

### Technologies
- **Three.js**: 3D rendering engine
- **Express**: Static file server
- **ES6 Modules**: Modern JavaScript architecture

### Performance Optimization
- Object pooling for vehicles
- Efficient geometry reuse
- Frustum culling (automatic via Three.js)
- Capped frame delta to prevent spiral of death

### Coordinate System
- Origin (0,0,0) at roundabout center
- Y-axis is vertical (up)
- Roundabout radius: 30 units
- Road width: 8 units (2 lanes x 4 units)

## Future Enhancements

Potential improvements:
- [ ] Traffic lights and pedestrian crossings
- [ ] Different vehicle types (buses, motorcycles, tuk-tuks)
- [ ] Sound effects (engine sounds, horns)
- [ ] Day/night cycle with dynamic lighting
- [ ] Weather effects (rain, fog)
- [ ] Bangkok landmarks (monuments, famous buildings)
- [ ] Camera controls (orbit, zoom, pan)
- [ ] Statistics dashboard (average speed, wait times)

## Credits

Built with:
- [Three.js](https://threejs.org/) - 3D graphics library
- [Express](https://expressjs.com/) - Web server

## License

This project is open source and available for educational purposes.

---

**Enjoy the Bangkok traffic simulation!** 🚗🏙️🚦
