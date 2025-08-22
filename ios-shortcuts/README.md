# iOS Shortcuts Integration

This directory contains iOS Shortcuts to enable `sessiontimer://` URL handling on iPhone and iPad.

## Installation

### Method 1: Direct Import (Recommended)

1. **Download the shortcut file** to your iOS device:
   - Open this URL in Safari on your iPhone/iPad: 
   - `https://github.com/piarasj/timer/raw/main/ios-shortcuts/SessionTimer-URLHandler.shortcut`

2. **Import the shortcut**:
   - Tap the downloaded file
   - iOS will prompt "Open in Shortcuts"
   - Tap "Add Shortcut" to install

### Method 2: Manual Creation

If the direct import doesn't work, create the shortcut manually:

1. **Open the Shortcuts app**
2. **Create a new shortcut** with these actions:
   - **Replace Text**: Find `sessiontimer://timer`, Replace with `https://piarasj.github.io/timer/timer.html`
   - **Replace Text**: Find `sessiontimer://segments`, Replace with `https://piarasj.github.io/timer/timer.html?segments`
   - **Open URLs**: Open the result in Safari
3. **Configure shortcut**:
   - Name: "SessionTimer URL Handler"
   - Icon: Clock icon
   - Add to Share Sheet
   - Accept URLs and Text as input

## Usage

Once installed, you can use `sessiontimer://` URLs on iOS in several ways:

### From Calendar Events

When you tap a `sessiontimer://` URL in a calendar event (created via Fantastical integration):

1. **Copy the URL** (long press → Copy)
2. **Open Shortcuts app**
3. **Run "SessionTimer URL Handler"**
4. **Paste the URL** when prompted
5. **Timer opens** in Safari

### From Share Sheet

1. **Share the sessiontimer:// URL** from any app
2. **Select "SessionTimer URL Handler"** from the share sheet
3. **Timer opens** automatically in Safari

### Manual Testing

1. **Open Shortcuts app**
2. **Run "SessionTimer URL Handler"**
3. **Enter a test URL** like: `sessiontimer://timer?s=a,14:30,30&mode=down`
4. **Tap Done** - Safari opens with the timer

## Supported URL Formats

The shortcut handles both timer URL formats:

### Single Timer
```
sessiontimer://timer?s=a,14:30,30&mode=down
```
Becomes:
```
https://piarasj.github.io/timer/timer.html?s=a,14:30,30&mode=down
```

### Multiple Segments
```
sessiontimer://segments?data=09:00,25,down|09:25,5,up
```
Becomes:
```
https://piarasj.github.io/timer/timer.html?segments=09:00,25,down|09:25,5,up
```

## Troubleshooting

### Shortcut won't import
- Make sure you're using Safari (not Chrome or other browsers)
- Try downloading the file first, then opening from Files app

### URLs don't open automatically
- The shortcut must be run manually for now
- iOS doesn't support automatic URL scheme handling via Shortcuts
- Consider adding the shortcut to your home screen for quick access

### Alternative: PWA Installation

Instead of using custom URLs, you can install the timer as a PWA:

1. **Open https://piarasj.github.io/timer/timer.html in Safari**
2. **Tap Share button** → **Add to Home Screen**
3. **Use the app icon** to launch the timer directly

## How It Works

The iOS Shortcut performs simple text replacement:

1. **Receives** a `sessiontimer://` URL (via input, clipboard, or share sheet)
2. **Replaces** the custom scheme with the web URL
3. **Opens** the result in Safari
4. **Timer loads** with all the original parameters intact

This enables the same URL scheme to work across macOS (via helper app) and iOS (via Shortcuts), providing a consistent cross-platform experience.
