# Quick Start Guide - Bangkok Traffic Simulation

## Instant Setup (3 Steps)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Simulation
```bash
npm start
```

### 3. Open in Browser
Navigate to: **http://localhost:5000**

## Screenshot Capture

### Automatic Method (Easiest)
1. Open http://localhost:5000 in your browser
2. **Allow automatic downloads** when prompted by browser
3. Keep the page open
4. Screenshots will **automatically download** at these times:
   - **08:00** → bangkok_traffic_08_00.png
   - **10:00** → bangkok_traffic_10_00.png
   - **12:00** → bangkok_traffic_12_00.png
   - **17:00** → bangkok_traffic_17_00.png
   - **19:00** → bangkok_traffic_19_00.png
   - **21:00** → bangkok_traffic_21_00.png

### How Long to Wait?
- Simulation runs at **600x speed**
- From 08:00 to 21:00 takes only **~1.3 minutes**
- All 6 screenshots captured in **less than 2 minutes**

### Where are Screenshots Saved?
- **Browser download**: Check your Downloads folder
- **Server-side**: Check `./screenshots/` directory

## What You'll See

### Time Display (Top-Left)
- Current simulation time
- Peak traffic indicator
- Vehicle count

### Traffic Patterns

**08:00 - Morning Rush** 🔴
- 150-200 vehicles
- Heavy congestion
- All entrances busy

**10:00 - Late Morning** 🟡
- 80-120 vehicles
- Traffic easing
- Still moderate activity

**12:00 - Lunch Time** 🔴
- 120-180 vehicles
- Mid-day peak
- Restaurant/office rush

**17:00 - Evening Start** 🔴
- 140-190 vehicles
- Rush hour beginning
- Increasing congestion

**19:00 - PEAK CONGESTION** 🔴🔴🔴
- **180-250 vehicles** (MAXIMUM)
- Bangkok-style traffic jam
- Heavy congestion everywhere

**21:00 - Late Evening** 🟢
- 70-110 vehicles
- Normal traffic
- Winding down

## Troubleshooting

### Screenshots Not Downloading?
1. Check browser popup/download settings
2. Allow automatic downloads for localhost
3. Try different browser (Chrome/Firefox recommended)

### Simulation Not Loading?
1. Check console for errors (F12)
2. Ensure port 5000 is not in use
3. Clear browser cache and reload

### Performance Issues?
1. Close other browser tabs
2. Enable hardware acceleration in browser
3. Update graphics drivers

## Advanced Usage

### Automated Screenshot Capture
If you have a display server:
```bash
node auto-capture.js
```

### Custom Configuration
Edit `simulation.js` to modify:
- `MAX_VEHICLES` - Number of vehicles
- `SIMULATION_SPEED` - Time acceleration
- `PEAK_HOURS` - Rush hour periods

## Support

See **README.md** for full documentation
See **IMPLEMENTATION_SUMMARY.md** for technical details

---

**Enjoy the Bangkok traffic chaos! 🚗🚕🚙🚌🏍️**
