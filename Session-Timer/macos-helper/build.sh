#!/bin/bash

# Build script for SessionTimer Helper macOS app
# This creates a .app bundle that registers the sessiontimer:// URL scheme

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_DIR="$SCRIPT_DIR/build"
APP_NAME="SessionTimer Helper"
BUNDLE_DIR="$BUILD_DIR/$APP_NAME.app"

echo "Building SessionTimer Helper..."

# Clean previous build
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Create app bundle structure
mkdir -p "$BUNDLE_DIR/Contents/MacOS"
mkdir -p "$BUNDLE_DIR/Contents/Resources"

# Copy Info.plist
cp "$SCRIPT_DIR/SessionTimerHelper/Info.plist" "$BUNDLE_DIR/Contents/"

# Compile Swift executable
echo "Compiling Swift executable..."
swiftc -o "$BUNDLE_DIR/Contents/MacOS/SessionTimerHelper" \
       "$SCRIPT_DIR/SessionTimerHelper/main.swift"

# Make executable
chmod +x "$BUNDLE_DIR/Contents/MacOS/SessionTimerHelper"

echo "Build complete: $BUNDLE_DIR"
echo ""
echo "To install:"
echo "1. Copy '$APP_NAME.app' to /Applications/"
echo "2. Run once to register URL scheme: open '/Applications/$APP_NAME.app'"
echo "3. Test with: open 'sessiontimer://timer?s=a,14:30,40&mode=down'"
echo ""
echo "The helper will redirect sessiontimer:// URLs to your web-based timer."
