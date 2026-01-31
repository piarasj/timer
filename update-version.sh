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
echo "  🌐 Updating HTML app..."
sed -i '' "s/>v[0-9]\+\.[0-9]\+\.[0-9]\+</>\v$NEW_VERSION</" timer.html
sed -i '' "s/const APP_VERSION = '[^']*';/const APP_VERSION = '$NEW_VERSION';/" timer.html
sed -i '' "s/version: '[^']*'/version: '$NEW_VERSION'/" timer.html

# Update Calendar Export
echo "  📅 Updating Calendar Export..."
sed -i '' "s/Session Timer [0-9]\+\.[0-9]\+\.[0-9]\+/Session Timer $NEW_VERSION/" src/calendarExport.js

# Update macOS Helper
echo "  🖥️  Updating macOS Helper..."
sed -i '' "s/<string>[0-9]\+\.[0-9]\+\.[0-9]\+<\/string>/<string>$NEW_VERSION<\/string>/" macos-helper/SessionTimerHelper/Info.plist

# Update manifest.json
echo "  📋 Updating Manifest..."
sed -i '' "s/\"version\": \"[^\"]*\"/\"version\": \"$NEW_VERSION\"/" manifest.json

echo "✅ Version updated to $NEW_VERSION in all components!"
echo ""
echo "📝 Next steps:"
echo "  1. Test the app locally"
echo "  2. Commit changes: git add -A && git commit -m 'Bump version to $NEW_VERSION'"
echo "  3. If macOS helper changed, rebuild: cd macos-helper && ./build.sh"
echo ""
echo "🔍 Verify with: grep -r '$NEW_VERSION' . --include='*.js' --include='*.html' --include='*.plist'"