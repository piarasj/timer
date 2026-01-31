# Version Management

This document describes the version management system for Session Timer.

## Current Version: 2.2.3

## Components with Version Numbers

The following files contain version numbers that must be kept in sync:

1. **Service Worker** (`sw.js`)
   - `APP_VERSION` constant - used for cache naming
   - **Critical**: Mismatched versions cause PWA caching issues

2. **Main Application** (`timer.html`)
   - Display version in bottom-left corner
   - Settings panel header version
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
2. `timer.html` - Four locations:
   - `version-info` div content 
   - `app-version` span content
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

- **2.2.3**: Version synchronization and management system implemented
- **2.2.2**: Previous main branch state
- **2.4.3**: Local test branch (out of sync - corrected)