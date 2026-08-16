# Version Management

This document describes the version management system for Session Timer.

## Current Version: 2.5.8

## Components with Version Numbers

The following files contain version numbers that must be kept in sync:

1. **Service Worker** (`sw.js`)
   - `APP_VERSION` constant - used for cache naming
   - **Critical**: Mismatched versions cause PWA caching issues

2. **Main Application** (`timer.html`)
   - Settings/Configuration panel header version (`#app-version` span) - as of 2.5.8 this is the only user-visible version display; the bottom-left corner now shows live timer status instead
   - JavaScript `APP_VERSION` constant
   - localStorage configuration version

3. **Calendar Export** (`src/calendarExport.js`)
   - ICS file PRODID field

4. **PWA Manifest** (`manifest.json`)
   - `version` field for PWA metadata

5. **macOS Helper** (`macos-helper/SessionTimerHelper/Info.plist`)
   - `CFBundleShortVersionString` for URL scheme handler

## Updating Versions

### Automated Method (Recommended)

Use the provided update script:

```bash
./update-version.sh 2.2.4
```

This script updates all version references automatically and provides verification commands.

### Manual Method

If updating manually, ensure you update ALL of these locations:

1. `sw.js` - `APP_VERSION` constant
2. `timer.html` - three locations:
   - `app-version` span content (Settings/Configuration panel heading)
   - JavaScript `APP_VERSION` constant
   - localStorage config version field
3. `src/calendarExport.js` - PRODID string
4. `manifest.json` - version field
5. `macos-helper/SessionTimerHelper/Info.plist` - CFBundleShortVersionString

### Version Strategy

Following the project rule: **"Version number is to be incremented for every change needing testing"**

- **Patch versions** (X.Y.Z): Bug fixes, minor improvements, testing changes
- **Minor versions** (X.Y.0): New features, UI enhancements  
- **Major versions** (X.0.0): Breaking changes, architecture overhauls

## Verification

After updating versions, verify consistency with:

```bash
# Check current version across all files
grep -r '2\.2\.3' . --include='*.js' --include='*.html' --include='*.plist' | grep -v '.git'

# Check for any old version references
grep -r '2\.2\.[0-2]' . --include='*.js' --include='*.html' --include='*.plist' | grep -v '.git'
```

## Post-Update Checklist

1. ✅ Test app locally with new version
2. ✅ Verify service worker updates correctly (check DevTools → Application → Service Workers)
3. ✅ Check version displays correctly in UI
4. ✅ Clear PWA cache if needed (see "Clearing PWA Cache" below)
5. ✅ If macOS helper changed, rebuild with `cd macos-helper && ./build.sh`
6. ✅ Commit changes with descriptive message
7. ✅ Deploy to GitHub Pages

## Clearing PWA Cache

If the PWA still shows the old version after updating:

### Quick Method
1. Open `clear-cache.html` in your browser
2. Click "Unregister Service Worker"
3. Click "Clear All Caches"
4. Click "Reload App"

### Manual Method (Chrome/Edge)
1. Open DevTools (F12 or Cmd+Opt+I)
2. Go to Application tab → Service Workers
3. Click "Unregister"
4. Go to Storage → Clear site data
5. Reload the page

### Manual Method (Safari/iOS)
1. Remove PWA from home screen
2. Safari → Settings → Advanced → Website Data → Remove sessiontimer data
3. Reinstall PWA from Safari

## Common Issues

- **Service Worker not updating**: Version mismatch between SW and app can prevent proper cache invalidation
- **PWA not updating**: Old cached versions may persist if versions aren't synchronized. Use `clear-cache.html` utility.
- **macOS URL scheme issues**: Helper app version should match for consistency

## Version History

- **2.5.8**: Added a "Generate Session Series" option (start time, session duration, break/interval, number of sessions -> auto-builds the segments= schedule, e.g. the "6 x 35min, 5min apart, from 09:00" use case). Moved the version display into the Configuration panel heading (`#app-version`, which had been hardcoded/stale at 2.5.1 this whole time - now included in the version-bump routine). Bottom-left now shows live status ("Counting down/up X minutes" while a segment runs, "Awaiting next session" while waiting, "Ready to start" for a loaded manual timer, "All sessions complete" when done) instead of the static version number. Also fixed: the "Count Down - End Time" mislabel in the segment-mode dropdowns and schedule list (down-mode segments were always start-time, same as up-mode - the label was just wrong); the matching start/end-time bug in the bottom-right timer-info widget's "what's next" detection; and consolidated three separate reimplementations of "add N minutes to HH:MM, wrapping at midnight" (coreTimer.js, segmentManager.js, timer.html) into one shared `src/timeUtils.js`.
- **2.5.7**: Screen wake lock is now acquired as soon as a schedule (single timer or segments) loads, and held for the whole schedule - including the wait before the first segment and any gaps between segments - instead of only while a segment is actively counting. Previously the display could sleep before an awaited segment started (worked around by running in iCab Mobile, which has its own always-on-display setting independent of the page). Also retries acquisition on the first tap/click if the initial request is silently rejected for lacking a user gesture (an iOS Safari quirk), and only releases on an explicit user stop or once the whole schedule completes.
- **2.5.6**: Hardened popup-window URL parsing (`view=popup` removal no longer depends on it being the last query parameter)
- **2.5.5**: Fixed "Ready" status message always showing "undefined" (TimerCore now emits the mode/duration/startTime/endTime fields the UI actually reads)
- **2.5.4**: Fixed `pomodoro.html` sending segment end-times instead of start-times, which delayed the work/break blocks
- **2.5.3**: Fixed `15min.html`/`30min.html`/`45min.html`/`50min.html` quick-launch links (missing required `a,` autostart prefix meant these never started a timer); fixed `50min.html` computing a 45-minute window
- **2.5.2**: Fixed `SegmentManager.activateSegment()` double-subtracting duration for countdown segments, which mis-set auto-start times (and produced invalid times like "-1:-25" for segments ending after midnight) - this was very likely the root cause of the "Auto-Start Not Working" issue logged in the 2026-02-01 project status
- **2.2.3**: Version synchronization and management system implemented
- **2.2.2**: Previous main branch state
- **2.4.3**: Local test branch (out of sync - corrected)

Note: this file, `src/calendarExport.js`'s PRODID, and `macos-helper/SessionTimerHelper/Info.plist` were found still showing 2.2.3 while the rest of the app had moved on to 2.5.1 - an example of the "versions aren't auto-incremented" workflow friction noted below. Both files are back in sync with the rest of the app as of 2.5.5.