# iOS Shortcuts Integration

This directory contains iOS Shortcuts to enable `sessiontimer://` URL handling on iPhone and iPad.

## Installation

### Method 1: Opener App (Easiest)

**Alternative Solution**: Use the [Opener app](https://apps.apple.com/gb/app/opener-open-links-in-apps/id989565871) (£2.00) for automatic `sessiontimer://` URL handling.

1. **Install Opener** from the App Store
2. **Configure custom URL scheme** for `sessiontimer://timer` → Safari
3. **Tap sessiontimer:// URLs anywhere** and they automatically open in Safari

*Note: This method requires testing to confirm Opener supports custom URL scheme conversion.*

### Method 2: iCloud Shortcut Link

**Coming Soon**: We'll provide an iCloud sharing link that allows one-tap installation.

For now, please use Method 3 below to create the shortcut manually.

### Method 3: Manual Shortcut Creation

Create the shortcut manually in the Shortcuts app:

1. **Open the Shortcuts app** on your iPhone/iPad

2. **Tap the "+" button** to create a new shortcut

3. **Add the first action**:
   - Search for "Replace Text" and tap it
   - In "Find Text" field: `sessiontimer://timer`
   - In "Replace With" field: `https://piarasj.github.io/timer/timer.html`
   - Leave "Regular Expression" OFF

4. **Add the second action**:
   - Tap "+" to add another action
   - Search for "Replace Text" and tap it
   - Tap the input field (should automatically use "Replaced Text" from the previous action)
   - In "Find Text" field: `sessiontimer://segments`
   - In "Replace With" field: `https://piarasj.github.io/timer/timer.html?segments`
   - Leave "Regular Expression" OFF

5. **Add the final action**:
   - Tap "+" to add another action
   - Search for "Open URLs" and tap it
   - Make sure it uses "Replaced Text" as input

6. **Configure shortcut settings**:
   - Tap the shortcut name at the top
   - Change name to: "SessionTimer URL Handler"
   - Tap the icon to change it (choose clock/timer icon)
   - Toggle ON "Use with Share Sheet"
   - Under "Share Sheet Types": enable "URLs" and "Text"

7. **Save the shortcut** by tapping "Done"

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
