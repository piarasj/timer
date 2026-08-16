#!/bin/bash

# Session Timer Version Update Script
# Updates version across all components to maintain consistency

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <new_version>"
    echo "Example: $0 2.2.4"
    exit 1
fi

NEW_VERSION="$1"

# Validate version format (semantic versioning: X.Y.Z)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version must be in format X.Y.Z (e.g., 2.2.4)"
    exit 1
fi

echo "🔄 Updating Session Timer to version $NEW_VERSION..."

# Update Service Worker
echo "  📦 Updating Service Worker..."
sed -i '' "s/const APP_VERSION = '[^']*';/const APP_VERSION = '$NEW_VERSION';/" sw.js

# Update timer.html (multiple locations)
# NOTE: as of 2.5.9 the version shows in TWO places - the Configuration panel
# heading (#app-version span) and the bottom-left corner (#version-info div,
# restored in 2.5.9 after briefly being repurposed for live timer status in
# 2.5.8; that status display now lives in the bottom-right #timer-info block
# instead, alongside it, not in place of it).
echo "  🌐 Updating HTML app..."
sed -i '' "s/<span id=\"app-version\">[0-9]\+\.[0-9]\+\.[0-9]\+<\/span>/<span id=\"app-version\">$NEW_VERSION<\/span>/" timer.html
sed -i '' "s/>v[0-9]\+\.[0-9]\+\.[0-9]\+</>v$NEW_VERSION</" timer.html
sed -i '' "s/const APP_VERSION = '[^']*';/const APP_VERSION = '$NEW_VERSION';/" timer.html
sed -i '' "s/version: '[^']*'/version: '$NEW_VERSION'/" timer.html

# Update Calendar Export
echo "  📅 Updating Calendar Export..."
sed -i '' "s/Session Timer [0-9]\+\.[0-9]\+\.[0-9]\+/Session Timer $NEW_VERSION/" src/calendarExport.js

# Update macOS Helper
echo "  🖥️  Updating macOS Helper..."
sed -i '' "s/<string>[0-9]\+\.[0-9]\+\.[0-9]\+<\/string>/<string>$NEW_VERSION<\/string>/" macos-helper/SessionTimerHelper/Info.plist

# Update manifest.json (including icon cache-busting query strings, which
# were previously left stale - see VERSION.md history for 2.5.5/2.5.6)
echo "  📋 Updating Manifest..."
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" manifest.json
sed -i '' "s/icon-192\.png?v=[0-9]\+\.[0-9]\+\.[0-9]\+/icon-192.png?v=$NEW_VERSION/" manifest.json
sed -i '' "s/icon-512\.png?v=[0-9]\+\.[0-9]\+\.[0-9]\+/icon-512.png?v=$NEW_VERSION/" manifest.json

echo "✅ Version updated to $NEW_VERSION in all components!"
echo ""
echo "📝 Next steps:"
echo "  1. Test the app locally"
echo "  2. Commit changes: git add -A && git commit -m 'Bump version to $NEW_VERSION'"
echo "  3. If macOS helper changed, rebuild: cd macos-helper && ./build.sh"
echo ""
echo "🔍 Verify with: grep -r '$NEW_VERSION' . --include='*.js' --include='*.html' --include='*.plist'"