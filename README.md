# Session Timer v2.4.6

A visual analog clock timer with URL schemes, calendar export, and floating window support. Perfect for removing temporal cognition load and maintaining focus on your primary tasks.

## 🆕 **What's New in v2.3**

- **👆 Clock-Face Quick Menu**: Long-press gesture reveals duration menu with spatial clock layout
- **🧠 Cognitive Load Design**: 3×5 grid mimics clock positions for instant duration recognition
- **🔗 Custom URL Scheme**: `sessiontimer://` for seamless macOS and iOS integration
- **📅 Calendar Export**: Direct export to ICS files and Fantastical integration  
- **🪟 Floating Windows**: Chromeless popup mode for always-on-top display
- **📱 PWA Support**: Install on iPhone home screen with offline capability
- **⚡ Quick Presets**: One-click Pomodoro, focus sessions, and break timers
- **🎨 Customizable Timer Colors**: Set your own orange/red warning thresholds in minutes
- **🛠️ CLI Integration**: Command-line tools for automation workflows
- **🏭 Modular Architecture**: Clean ES6 modules with event-driven design
- **🎮 Enhanced Gesture Controls**: Shake device and long press with haptic feedback
- **🔔 Completion Notifications**: Configurable sound, vibration, and visual alerts
- **⌚ Dead Second Hand**: Optional pause-at-12 behavior mimicking luxury watch mechanics

**Breaking free from iCab dependency:** v2.0 introduces native `sessiontimer://` URL scheme support, eliminating reliance on third-party browsers while maintaining the same seamless experience.

-----

## 🚀 **Quick Start**

### **Web Version (Immediate Use)**
- **v2.0 Enhanced**: [timer-v2.html](https://piarasj.github.io/timer/timer-v2.html) (with all new features)
- **Current Version**: [timer.html](https://piarasj.github.io/timer/timer.html) 
- **Legacy Versions**: [index.html](index.html) | [settings.html](settings.html)

### **Custom URL Scheme Examples**
```bash
# 30-minute focus session (replaces iCab x-callback-url)
sessiontimer://timer?s=a,14:30,30&mode=down

# Pomodoro sequence 
sessiontimer://segments?data=09:00,25,down|09:25,5,up|09:30,25,down|09:55,15,up
```

Made with respect to [Dieter Rams](https://rams-foundation.org/).

## 📱 **Installation & Setup**

### **macOS: Custom URL Scheme**

The `sessiontimer://` URL scheme enables system-level integration on macOS through a native helper application.

1. **Build the helper app** (requires Xcode command line tools):
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

**How it Works with PWA:**
- The helper app **translates** `sessiontimer://` URLs to `https://piarasj.github.io/timer/timer.html` URLs
- macOS then **opens the URL** in your default browser or installed PWA
- **PWAs cannot register URL schemes** — only native apps can handle custom protocols at the OS level
- The helper app acts as a **bridge** between system-level URLs and the web application

**Best Practices:**
- **Keep the PWA open**: If the PWA is already running, macOS may route the URL to it
- **Browser fallback**: If PWA isn't running, the URL opens in your default browser  
- **Recommended workflow**: Install the PWA for offline capability, keep it open during work sessions, and use `sessiontimer://` URLs to send timer configurations
- **Note**: macOS does not consistently prefer PWAs over browser tabs — behavior varies by browser and installation method

### **iOS: Shortcuts Integration**

1. Import the provided Shortcut: `ios-shortcuts/SessionTimer-URLHandler.shortcut`
2. Test with: `sessiontimer://timer?s=a,14:30,30&mode=down`
3. Add timer to home screen as PWA for full-screen experience

### **PWA Installation (iPhone/iPad)**

1. Open `timer-v2.html` in Safari
2. Tap **Share** → **Add to Home Screen**
3. Enjoy offline, full-screen timer experience with gesture controls

## 📅 **Calendar Integration**

### **Using the Interface**

1. Open hamburger menu (☰) in `timer-v2.html`
2. Configure timer segments using presets or manual entry
3. Use **Export to Calendar** section:
   - **Download ICS**: Save .ics file for any calendar app
   - **Copy ICS**: Copy iCalendar data to clipboard  
   - **Open in Fantastical**: Launch directly in Fantastical

### **Command Line (Automation)**

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

### **Keyboard Maestro Integration**

Use the CLI script in Keyboard Maestro macros:
```bash
./generateCalendar.sh "$KMVAR_segments" && open "session-timer-$(date +%Y%m%d-%H%M%S).ics"
```

## 🎯 **Quick Presets (v2.0)**

Built-in presets available in the enhanced settings panel:

- **30min Focus**: Single 30-minute countdown session
- **45min Focus**: Single 45-minute countdown session  
- **60min Focus**: Single 60-minute countdown session
- **Pomodoro**: 25min work + 5min break cycle
- **5min Break**: Short break timer
- **15min Break**: Long break timer

## 🚀 **Start Now (Manual Start)**

### Single Timer - Start Immediately
```bash
# Count down 30 minutes (manual start)
timer.html?s=m,12:00,30&mode=down

# Count up 45 minutes (manual start)  
timer.html?s=m,12:00,45&mode=up
```
**Note**: Use `m` instead of `a` for manual start. The time parameter is ignored for manual starts.

## ⏰ **Autostart Timers**

### Single Timer - Autostart at Specific Time
```bash
# Autostart at 2:30 PM, count down for 40 minutes (ends at 3:10 PM)
timer.html?s=a,14:30,40&mode=down

# Autostart at 9:00 AM, count up for 60 minutes (ends at 10:00 AM)
timer.html?s=a,09:00,60&mode=up
```

### Multiple Timers - Sequential Autostart
```bash
# Multiple segments with different modes
timer.html?segments=09:00,30,up|10:30,45,down|14:15,60,down

# Full day schedule
timer.html?segments=08:30,90,up|11:00,30,down|13:30,120,down|16:00,45,up
```

## 🕐 **Set Timer for Later**

### Delayed Single Timer
```bash
# Timer will autostart at 15:30 (3:30 PM) for 25 minutes
timer.html?s=a,15:30,25&mode=down

# Timer will autostart at 20:15 (8:15 PM) for 90 minutes  
timer.html?s=a,20:15,90&mode=up
```

### Scheduled Multiple Timers
```bash
# Evening session - timers start later in the day
timer.html?segments=18:00,45,down|19:30,30,up|21:00,60,down

# Tomorrow morning schedule
timer.html?segments=07:00,30,up|08:15,45,down|10:30,60,down
```

## 📊 **Parameter Reference**

### **Single Timer Format**:

```
?S=a,TIME,DURATION&Mode=MODE
```


| Parameter | Description | Values |
|-----------|-------------|--------|
| `s` | Timer configuration | `a` = autostart, `m` = manual |
| `TIME` | Time in HH:MM format | `09:30`, `14:45`, etc. |
| `DURATION` | Duration in minutes | `30`, `45`, `120`, etc. |
| `mode` | Count direction | `up` or `down` |

### **Multiple Timer Format**:

```
?segments=TIME,DURATION,MODE|TIME,DURATION,MODE|...
```

| Component | Description | Example |
|-----------|-------------|--------|
| `TIME` | HH:MM format | `09:00`, `13:30` |
| `DURATION` | Minutes | `30`, `45`, `90` |
| `MODE` | Count direction | `up`, `down` |
| `|` | Separator between segments | `09:00,30,up|10:30,45,down` |
÷
## 🎯 **Practical Examples**

**Workout Session**
Warm-up + Main + Cool-down
```
timer.html?segments=06:00,15,up|06:15,45,down|07:00,10,up
```

**Work Pomodoro**
25min work + 5min break + 25min work + 15min break
```
timer.html?segments=09:00,25,down|09:25,5,up|09:30,25,down|09:55,15,up
```

**Cooking Schedule**
Prep + Cook + Rest
```
timer.html?segments=17:30,20,up|17:50,35,down|18:25,10,up
```

**Study Sessions**
Morning study blocks
```
timer.html?segments=08:00,50,down|09:00,10,up|09:10,50,down|10:10,20,up
```

## 🔍 **Time Interpretation Guide**

**Count Down Mode** (`mode=down` or default)
- **URL Time = END TIME**
- Timer calculates when to start based on duration
- Example: `s=a,15:00,30` means "end at 3:00 PM after 30 minutes" (starts at 2:30 PM)

**Count Up Mode** (`mode=up`)
- **URL Time = START TIME**  
- Timer starts at specified time and runs for duration
- Example: `s=a,15:00,30` means "start at 3:00 PM for 30 minutes" (ends at 3:30 PM)

## ⚡ **Quick Reference**

### **Start Now**
```bash
timer.html?s=m,00:00,30    # 30 minutes, manual start
```

### **Start at Specific Time**
```bash
timer.html?s=a,14:30,45    # Start at 2:30 PM for 45 minutes
```

### **Multiple Sessions**
```bash
timer.html?segments=10:00,30,up|11:00,45,down|15:30,60,down
```

### **Mid-Session Join**
If you load a URL after the start time but before the end time, the timer will:
- **Automatically start** mid-session
- **Show elapsed time** in status message
- **Continue normally** until completion

## 🛠️ **URL Generation**

The hamburger menu automatically generates these URLs when you:
1. Add segments using the UI
2. Configure times and durations  
3. Select count up/down modes
4. Copy the generated URL from the text area

This may make it easier than manually constructing URLs - for some. 

## 🍔 **Hamburger Menu Features (v2.0 Enhanced)**

### **Settings Panel**
- **Slide-out panel** from the right side with improved compact layout
- **Two-column design**: Timer controls and configuration on left, quick presets on right
- **One-click activation**: Start button immediately activates any configured schedule
- **Current Schedule** view showing all configured segments
- **Quick Presets** in compact 2×3 grid for instant timer setup
- **Add Segment** form with time, duration, and mode selection
- **URL Configuration** with auto-generated URLs and copy functionality
- **Calendar Export** with ICS download, clipboard copy, and Fantastical integration
- **Help & Documentation** link to this README for instant reference
- **Clear All** button to reset segments

### **User Interface**
- **Three-line hamburger icon** (top right) that animates to X when opened
- **Responsive visibility**: 
  - **Desktop landscape** (height ≥ 541px): Hamburger menu visible, controls hidden
  - **Kiosk landscape** (height ≤ 540px): Both hamburger menu and controls hidden for clean kiosk experience
  - **Portrait mode**: All controls and hamburger menu visible
- **Visual schedule display** with color-coded times
- **Individual segment deletion** with × buttons
- **Auto-sorting** segments by time

### **Control Methods**
- **Touch Controls**: Start/Stop buttons (bottom of screen in portrait, hamburger menu in desktop landscape)
- **Keyboard Shortcuts**:
  - **Spacebar**: Toggle start/stop timer
  - **Escape**: Close settings panel
- **iOS/iPad Gesture Controls**:
  - **Shake Device**: Toggle start/stop timer (requires motion permission)
  - **Long Press**: Hold anywhere on screen for 1 second to show quick duration menu or stop timer
  - **Haptic Feedback**: Vibration confirmation when using gestures
  - Perfect for kiosk mode with no visible UI controls needed

### **Clock-Face Quick Menu (v2.3)**

Instant timer start via long-press gesture with circular clock-face design:

**Activation**: Long-press anywhere on the clock face when timer is stopped

**Circular Layout Design**:
```
           60 (12)
      55        5
   50              10
45  1  90  3        15
   40              20
      35        25
           30 (6)
     75      105
```

**Position Mapping**:
- **12 o'clock**: 60 minutes (full hour)
- **1-11 positions**: 5-minute increments (5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55)
- **Center cluster**: 
  - **Quick intervals**: 1 and 3 minutes (left and right of center)
  - **Extended durations**: 75, 90, 105 minutes (vertical column)
  - **Micro-breaks**: 1 and 3 minute options for brief resets, eye breaks, or stretches between tasks

**Cognitive Benefits**:
- **Direct Spatial Mapping**: Each duration at its natural clock position (5min = 1 o'clock, 10min = 2 o'clock, etc.)
- **Zero Translation**: No mental conversion needed—time position matches clock position exactly
- **Circular Touch Targets**: Large, easy-to-tap circular buttons arranged on familiar clock radius
- **Extended Options**: Center cluster for longer sessions without disrupting perimeter positions
- **Instant Recognition**: Leverages existing spatial memory of analog clock interface behind the menu

**Design Rationale**: The circular layout eliminates cognitive translation by creating a 1:1 spatial correspondence with the analog clock. Users don't need to calculate or translate—they simply tap where the minute hand would point. This direct mapping is particularly beneficial for individuals with dyscalculia, ADHD, or executive function challenges who may struggle with temporal estimation and mental arithmetic.

**Accessibility Impact**:

This design is particularly beneficial for users with:
- **Dyscalculia**: Eliminates numerical calculation entirely—no need to interpret numbers or perform mental arithmetic
- **ADHD/Time-blindness**: Provides concrete spatial anchors that externalize time awareness, reducing working memory demands
- **Executive function challenges**: Reduces cognitive overhead through direct visual mapping instead of abstract decision-making
- **General accessibility**: The circular design transforms time selection from an abstract numerical choice into a physical gesture that mirrors natural clock reading—users point to the time they want, just as they would read where the minute hand points

## 🪟 **Floating Window Mode (v2.0)**

### **Chromeless Desktop Display**
```bash
# Open in floating popup window
timer.html?s=a,14:30,40&mode=down&view=popup
sessiontimer://timer?s=a,14:30,40&mode=down&view=popup
```

### **Features**
- **Always-on-top** positioning for continuous visibility
- **No browser chrome** (toolbar, address bar, etc.)
- **Resizable** but maintains aspect ratio
- **One-click launch** from hamburger menu
- **Perfect for dual monitor setups** and distraction-free focus

### **Usage**
1. Configure your timer in the main window
2. Click **"Open Floating Window"** in the URL section
3. Timer opens in chromeless popup
4. Close main window if desired - timer continues independently

## ⌨️ **Enhanced Controls (v2.0)**

### **Quick Preset Access**
- **One-click presets** in hamburger menu
- **Custom time calculation** based on current time
- **Instant URL generation** with sessiontimer:// and web formats
- **Visual calendar preview** before export

### **Dual URL Generation**
- **Copy Web URL**: Standard HTTP link for sharing
- **Copy sessiontimer://**: Custom scheme for native integration
- **Floating Window**: Direct popup launch
- **Historical URLs**: Last 10 configurations stored locally

## 🎨 **Visual Features**

### **Timer Display**
- **Analog clock** with hour, minute, and second hands
- **Progress arc** showing either remaining time (countdown) or elapsed time (count up)
- **Customizable color transitions**: User-defined orange and red warning thresholds
- **Default colors**: Green → Orange (last 10 minutes) → Red (last 3 minutes)
- **Sweep-in animation** on page load
- **Full-screen dark theme** optimized for focus

### **Color Customization (v2.0)**

Personalize timer colors to match your workflow preferences:

- **Configure via Settings**: Open hamburger menu → Reconfigure Timer → Timer Colors section
- **Minute-based thresholds**: Set when timer turns orange and red based on remaining minutes
- **Flexible ranges**: Orange (1-60 minutes), Red (1-30 minutes) with automatic validation
- **Real-time preview**: See color changes immediately as you adjust settings
- **Persistent settings**: Color preferences saved with timer configuration

**Examples:**
- **Short sessions**: Orange at 5 minutes, Red at 1 minute
- **Long focus blocks**: Orange at 15 minutes, Red at 5 minutes
- **Pomodoro**: Orange at 8 minutes, Red at 2 minutes

**Design rationale**: Minutes are more intuitive than percentages and work consistently across different timer durations. A 30-minute session and 2-hour session both benefit from the same "5 minutes remaining" warning, whereas percentage-based thresholds would feel inconsistent.

### **Completion Notifications (v2.0)**

Customizable alerts when timer segments complete:

- **Configure via Settings**: Open hamburger menu → Reconfigure Timer → Completion Notifications section
- **Sound Notifications**: Pleasant bell-like completion sound using Web Audio API
  - **Primary tone**: E note (659.25 Hz) with fade-out envelope
  - **Harmonic**: G# note (830.61 Hz) for richness
  - **Fallback**: Simple beep if Web Audio fails
- **Vibration Notifications**: Multi-pulse device vibration pattern (200-100-200-100-200ms)
- **Visual Flash**: Full-screen white flash overlay with CSS animation
- **User Control**: All notifications individually toggleable (enabled by default)
- **Smart Integration**: Automatically triggered via event bus on segment completion

**Accessibility Benefits**: Multiple notification modalities ensure completion awareness regardless of user attention focus, environmental noise, or device settings.

### **Second Hand Behavior (v2.0)**

Customizable second hand movement with luxury watch aesthetics:

- **Configure via Settings**: Open hamburger menu → Reconfigure Timer → Second Hand section
- **Dead Second Feature (Experimental)**: Toggle pause-at-12 behavior where second hand stops at 12 o'clock position for 2 seconds
- **Smart Activation**: Only operates when timer is stopped (prevents distractions during active sessions)
- **Dual Hand System**: Seamless primary/secondary hand transition eliminates visual jitter
- **Automatic State Reset**: Clean handoff when timer starts/stops prevents artifacts
- **Smooth Sweep Default**: Standard continuous sweep movement (disabled by default)
- **Instant Toggle**: Changes apply immediately without timer restart

**Technical Implementation**: Uses dual second hands with opacity-based transitions and proper state management to achieve smooth, jitter-free animation. The feature automatically resets on timer state changes to prevent any visual artifacts.

**Design Philosophy**: This experimental feature creates a subtle yet noticeable visual cue at the top of each minute, helping with time awareness during idle periods. The second hand pauses at 12 o'clock, then smoothly continues, creating an elegant mechanical feel reminiscent of luxury timepieces.

### **Status Messages**
- **Loading confirmation** showing parsed URL parameters
- **Start/stop notifications** with timestamps
- **Mid-session join** messages with elapsed time
- **Segment addition/deletion** confirmations
- **Completion notifications** with session duration and type

## 📱 **Usage Examples**

### **Simple 30-minute Focus Session**
```bash
timer.html?s=a,10:30,30&mode=down
```

### **Pomodoro Technique**
```bash
timer.html?segments=09:00,25,down|09:25,5,up|09:30,25,down|09:55,15,up
```

### **Workout Routine**
```bash
timer.html?segments=07:00,10,up|07:10,20,down|07:30,5,up|07:35,20,down|07:55,5,up
```

### **Meeting Schedule**
```bash
timer.html?segments=14:00,45,down|14:50,10,up|15:00,30,down
```

## 🔧 **Technical Notes**

- **Time format**: 24-hour HH:MM format (e.g., 14:30 for 2:30 PM)
- **Duration**: Minutes only (converted internally to seconds)
- **URL encoding**: Multiple segments are URL-encoded automatically
- **Browser compatibility**: Modern browsers with canvas and JavaScript support
- **Local storage**: Settings persist only during session (URL-based configuration)

## 📋 **File Structure**

### **v2.0 Enhanced Architecture**
```
Session-Timer/
├── timer.html              # Original single-file version
├── timer-v2.html           # New enhanced version with all v2.0 features
├── index.html              # Legacy version with external JSON
├── settings.html           # Legacy settings generator
├── settings.json           # Fallback JSON configuration
├── manifest.json           # PWA manifest for home screen installation
├── sw.js                   # Service worker for offline functionality
├── src/                    # Modular ES6 components
│   ├── eventBus.js         # Event system for module communication
│   ├── coreTimer.js        # Timer logic, animation, and drawing
│   ├── urlParser.js        # URL handling and generation
│   └── calendarExport.js   # ICS generation and calendar integration
├── macos-helper/           # Custom URL scheme support
│   ├── build.sh            # Build script for helper app
│   ├── SessionTimerHelper/ # Swift source code
│   └── build/              # Compiled .app bundle (after build)
├── ios-shortcuts/          # iOS integration
│   └── SessionTimer-URLHandler.shortcut
├── scripts/                # Command-line automation tools
│   └── generateCalendar.sh # CLI calendar generator with jq/icalBuddy
└── examples/               # Sample configurations for testing
    ├── pomodoro-session.json
    └── focus-session.json
```

### **Deployment Options**

**Single File (Current)**: `timer.html` remains fully self-contained
**Enhanced v2.0**: `timer-v2.html` + supporting files for full feature set
**PWA**: All files for offline home screen installation
**Development**: Modular `src/` components with build process




## Accessibility and Cognitive Load Reduction
This application is particularly suitable for individuals who experience difficulties with temporal cognition and calculation. Research indicates that people with dyscalculia often have impaired number sense and difficulties in estimating or manipulating temporal intervals (Butterworth, 2010). Similarly, those with executive function deficits, such as individuals with ADHD, frequently demonstrate “time-blindness,” defined as impaired awareness of elapsed and future time, which can compromise planning and sustained task engagement (Barkley, 1997; Brown, 2005). For such populations, interpreting analogue clocks or performing time arithmetic can present unnecessary cognitive load, distracting from the primary task. By externalizing time tracking, automating calculations, and presenting progress in an intuitive visual form, this application minimizes distraction and supports task persistence.

*References*

- Barkley, R. A. (1997). ADHD and the Nature of Self-Control. New York: Guilford Press.
-  Brown, T. E. (2005). Attention Deficit Disorder: The Unfocused Mind in Children and Adults. Yale University Press.
- Butterworth, B. (2010). Foundational numerical capacities and the origins of dyscalculia. Trends in Cognitive Sciences, 14(12), 534–541.
