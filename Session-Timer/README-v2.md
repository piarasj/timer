# Session Timer v2.0

A visual analog clock timer with URL schemes, calendar export, and floating window support. Perfect for removing temporal cognition load and maintaining focus on your primary tasks.

## 🆕 What's New in v2.0

- **Custom URL Scheme**: `sessiontimer://` for seamless integration with macOS and iOS
- **Calendar Export**: Export timer sessions to ICS files or directly to Fantastical
- **Floating Windows**: Chromeless popup mode for always-on-top timer display
- **PWA Support**: Install on iPhone home screen with offline capability
- **Quick Presets**: One-click Pomodoro, focus sessions, and break timers
- **Modular Architecture**: Clean ES6 modules with event-driven design
- **CLI Integration**: Command-line calendar generation for automation workflows

## 🚀 Quick Start

### Web Version (Immediate Use)
```
https://piarasj.github.io/timer/timer.html
```

### Custom URL Scheme Examples
```bash
# 30-minute focus session (countdown)
sessiontimer://timer?s=a,14:30,30&mode=down

# Pomodoro sequence 
sessiontimer://segments?data=09:00,25,down|09:25,5,up|09:30,25,down|09:55,15,up
```

## 📱 Installation & Setup

### macOS: Custom URL Scheme

1. **Build the helper app**:
   ```bash
   cd macos-helper
   ./build.sh
   ```

2. **Install**:
   ```bash
   cp "build/SessionTimer Helper.app" /Applications/
   open "/Applications/SessionTimer Helper.app"
   ```

3. **Test**:
   ```bash
   open "sessiontimer://timer?s=a,14:30,40&mode=down"
   ```

### iOS: Shortcuts Integration

1. Import the provided Shortcut: `ios-shortcuts/SessionTimer-URLHandler.shortcut`
2. Test with: `sessiontimer://timer?s=a,14:30,30&mode=down`
3. Add to home screen as PWA for full-screen experience

### PWA Installation (iPhone/iPad)

1. Open timer.html in Safari
2. Tap Share → Add to Home Screen
3. Enjoy offline, full-screen timer experience

## ⏰ Usage Examples

### Single Timer Sessions

```bash
# Manual start (click to begin)
timer.html?s=m,12:00,30&mode=down

# Auto-start at 2:30 PM, count down 40 minutes
timer.html?s=a,14:30,40&mode=down
sessiontimer://timer?s=a,14:30,40&mode=down

# Count up timer starting at 9:00 AM for 60 minutes  
timer.html?s=a,09:00,60&mode=up
sessiontimer://timer?s=a,09:00,60&mode=up
```

### Multiple Timer Sessions

```bash
# Pomodoro technique
timer.html?segments=09:00,25,down|09:25,5,up|09:30,25,down|09:55,15,up
sessiontimer://segments?data=09:00,25,down|09:25,5,up|09:30,25,down|09:55,15,up

# Work day schedule
timer.html?segments=08:30,90,up|11:00,30,down|13:30,120,down|16:00,45,up
```

### Floating Window Mode

```bash
# Open in chromeless popup window
timer.html?s=a,14:30,40&mode=down&view=popup
```

## 📅 Calendar Integration

### Using the Interface

1. Open hamburger menu (☰)
2. Configure timer segments
3. Click "Export to Calendar" section:
   - **Download ICS**: Save .ics file for any calendar app
   - **Copy ICS**: Copy iCalendar data to clipboard  
   - **Open in Fantastical**: Launch directly in Fantastical

### Command Line (Automation)

```bash
# Generate calendar from JSON segments
./scripts/generateCalendar.sh examples/pomodoro-session.json

# Custom output filename
./scripts/generateCalendar.sh my-segments.json my-calendar.ics
```

**Example segments.json**:
```json
[
  {"time": "09:00", "duration": 25, "mode": "down"},
  {"time": "09:25", "duration": 5, "mode": "up"},
  {"time": "09:30", "duration": 25, "mode": "down"}
]
```

### Keyboard Maestro Integration

Use the CLI script in Keyboard Maestro macros:
```bash
./generateCalendar.sh "$KMVAR_segments" && open "session-timer-$(date +%Y%m%d-%H%M%S).ics"
```

## 🎯 Quick Presets

Built-in presets available in the settings panel:

- **30min Focus**: Single 30-minute countdown session
- **45min Focus**: Single 45-minute countdown session  
- **60min Focus**: Single 60-minute countdown session
- **Pomodoro**: 25min work + 5min break cycle
- **5min Break**: Short break timer
- **15min Break**: Long break timer

## ⌨️ Controls & Shortcuts

### Keyboard
- **Spacebar**: Start/stop timer
- **Escape**: Close settings panel

### Touch/Gesture (iOS/iPad)
- **Tap controls**: Start/Stop buttons (portrait mode)
- **Shake device**: Toggle timer (requires motion permission)
- **Long press**: Hold screen for 1 second to toggle timer
- **Hamburger menu**: Access all settings (landscape mode)

### Kiosk Mode
- **Landscape ≤ 540px**: All controls hidden for clean display
- **Landscape > 540px**: Only hamburger menu visible

## 🛠️ Development

### Project Structure
```
Session-Timer/
├── timer.html              # Original single-file version
├── timer-v2.html           # New modular version
├── src/                    # ES6 modules
│   ├── eventBus.js         # Event system
│   ├── coreTimer.js        # Timer logic & drawing
│   ├── urlParser.js        # URL handling & generation
│   └── calendarExport.js   # ICS generation
├── macos-helper/           # Custom URL scheme support
├── ios-shortcuts/          # iOS Shortcuts integration
├── scripts/                # CLI tools
└── examples/               # Sample configurations
```

### Building

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build single-file version
npm run build-timer

# Test
npm test
```

## 📋 URL Parameter Reference

### Single Timer Format
```
?s=TYPE,TIME,DURATION&mode=MODE
```

| Parameter | Values | Description |
|-----------|--------|-------------|
| `s` | `a`, `m` | `a` = autostart, `m` = manual |
| `TIME` | `HH:MM` | Time in 24-hour format |
| `DURATION` | `1-480` | Duration in minutes |
| `mode` | `up`, `down` | Count direction |

### Multiple Timer Format
```
?segments=TIME,DURATION,MODE|TIME,DURATION,MODE|...
```

### Special Parameters
```
?view=popup          # Open in floating window
```

## 🎨 Time Interpretation

**Count Down Mode** (`mode=down` or default):
- URL time = **END TIME**
- Example: `s=a,15:00,30` = "end at 3:00 PM after 30 minutes" (starts 2:30 PM)

**Count Up Mode** (`mode=up`):
- URL time = **START TIME**  
- Example: `s=a,15:00,30` = "start at 3:00 PM for 30 minutes" (ends 3:30 PM)

## 🔧 Technical Notes

- **Modular ES6 Architecture**: Event-driven design with clean module separation
- **PWA Ready**: Service worker, manifest, offline capability
- **Mobile Optimized**: Safe area insets, gesture controls, responsive design
- **Performance**: Canvas-based rendering, 60fps target, minimal DOM manipulation
- **Accessibility**: Reduces cognitive load for temporal processing difficulties

## 📖 Research Background

This application is designed for individuals with dyscalculia, ADHD, or executive function deficits who experience "time-blindness" and difficulties with temporal cognition. By externalizing time tracking and automating calculations, it minimizes cognitive load and supports sustained task engagement.

**References:**
- Barkley, R. A. (1997). ADHD and the Nature of Self-Control
- Brown, T. E. (2005). Attention Deficit Disorder: The Unfocused Mind
- Butterworth, B. (2010). Foundational numerical capacities and the origins of dyscalculia

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`  
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- **Live Demo**: https://piarasj.github.io/timer/timer.html
- **Original Repository**: https://github.com/piarasj/timer
- **Issues**: https://github.com/piarasj/timer/issues
