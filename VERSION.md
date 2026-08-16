# Version Management

This document describes the version management system for Session Timer.

## Current Version: 2.5.13

## Components with Version Numbers

The following files contain version numbers that must be kept in sync:

1. **Service Worker** (`sw.js`)
   - `APP_VERSION` constant - used for cache naming
   - **Critical**: Mismatched versions cause PWA caching issues

2. **Main Application** (`timer.html`)
   - Settings/Configuration panel header version (`#app-version` span)
   - Bottom-left corner version display (`#version-info` div) - restored in 2.5.9 alongside the panel heading; live timer status moved to the bottom-right block instead
   - JavaScript `APP_VERSION` constant
   - localStorage configuration version

3. **Calendar Export** (`src/calendarExport.js`)
   - ICS file PRODID field
   - As of 2.5.10, also embeds a link back to the app (the exported schedule's web URL) in each exported VEVENT's `URL:` property and `DESCRIPTION:` text, when `downloadICS`/`copyICSToClipboard` are called with a `sessionUrl`

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

- **2.5.13**: Exported ICS events now also carry an iCab Mobile x-callback-url link (`CalendarExport.generateICabUrl()`) alongside the plain web link added in 2.5.10 - `x-icabmobile://x-callback-url/open?url=<encoded session URL>&destination=currentTab&fullscreen=yes`, both appended to each event's `DESCRIPTION`. Tapping it launches iCab Mobile directly (bypassing Safari entirely, since custom URL schemes are OS-dispatched to the registered app rather than falling through to the browser) with the session loaded fullscreen and, per live testing, the display staying awake. The event's standard `URL:` property is deliberately left as the plain `https://` link rather than replaced, since it's unconfirmed whether every calendar app makes a custom-scheme `URL:` property tappable the way it does for http(s) - the iCab link lives in `DESCRIPTION` as a clearly-labeled second option instead, so the guaranteed-to-work link stays primary.
- **2.5.12**: Exported ICS events (Download ICS / Copy ICS) are now titled "Session 1", "Session 2", etc. instead of "Session Timer - Count Down (35min)" - simpler at a glance in a calendar list. The mode/duration detail ("Count Down timer for 35 minutes") is unchanged and still in each event's `DESCRIPTION`, alongside the app-invocation link added in 2.5.10. Only `CalendarExport.generateICS()`'s `SUMMARY` changed; the Settings-panel calendar preview text and the Fantastical export path (which build their titles separately) are unaffected - flag if those should match too.
- **2.5.11**: Fixed "Add to Home Screen" ignoring the configured schedule's query string (`?segments=...`) and always launching a blank/default timer instead - root cause was `timer.html`'s `<link rel="manifest" href="manifest.json">`. Once a page links a Web App Manifest, iOS Safari stops bookmarking the literal address-bar URL on "Add to Home Screen" and instead launches the manifest's `start_url` (`./timer.html`, no query string) - this is standard manifest behavior dating back to iOS 11.3, not a recent iOS change. Removed the manifest `<link>` from `timer.html` so Add to Home Screen falls back to the legacy behavior: it bookmarks the exact current URL (including any `?s=`/`?segments=` config), with the chromeless/standalone launch still provided by the pre-existing `apple-mobile-web-app-*` meta tags (which iOS has always honored independently of the manifest). This is what actually makes the "configure a schedule, then Add to Home Screen" discreet-presentation workflow documented in the README work. Trade-off: `timer.html` no longer offers a manifest-driven "Install app" prompt on Android/Chrome, and the manifest's `shortcuts`/`screenshots`/`protocol_handlers` fields (the latter already inert on iOS/WebKit - see 2.5.6 and earlier notes) no longer apply to it; `manifest.json` itself is untouched and still linked from `index.html` if a full-manifest entry point is needed later.
- **2.5.10**: "Download ICS" and "Copy ICS" now embed a link back into Session Timer for the exact schedule being exported - the whole-schedule web URL (same one shown in the "Current URL" field, e.g. `?segments=09:00,35,down|09:40,35,down|...`) is added to every exported VEVENT as both the standard `URL:` property (clickable in Apple Calendar/Outlook/Google Calendar) and appended to the `DESCRIPTION:` text (for calendar apps or copy-paste contexts that don't surface `URL:`). Combined with "Add to Home Screen" (see the discreet-presentation notes above), this means a calendar event created from an exported session can launch straight back into that same schedule. The Fantastical export path already had its own per-segment `sessiontimer://` link and is unchanged. `generateICS`/`downloadICS`/`copyICSToClipboard` gained an optional `sessionUrl` parameter; omitting it reproduces the old output byte-for-byte (no `URL:` line, no link in `DESCRIPTION:`).
- **2.5.9**: Reworked the bottom-right timer info into two lines - "Counting down/up N minutes." (the segment's total configured duration) and "N minutes remaining." (live, ticking every second) - replacing the single static line from before. Restored the version number to the bottom-left corner (`#version-info`), which 2.5.8 had repurposed for live status; that status now lives entirely in the bottom-right block instead, and the version shows in both the bottom-left corner and the Configuration panel heading. `update-version.sh` updated to keep both version locations in sync (and its `>v$NEW_VERSION<` substitution no longer has the stray backslash the original script had).
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