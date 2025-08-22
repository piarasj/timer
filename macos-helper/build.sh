#!/bin/bash

# Build script for SessionTimer Helper
# Updated for new project structure

echo "Building SessionTimer Helper..."

# Create build directory
BUILD_DIR="$(dirname "$0")/build"
APP_NAME="SessionTimer Helper.app"
APP_PATH="$BUILD_DIR/$APP_NAME"

mkdir -p "$BUILD_DIR"
mkdir -p "$APP_PATH/Contents/MacOS"
mkdir -p "$APP_PATH/Contents/Resources"

# Copy Info.plist
cp "$(dirname "$0")/SessionTimerHelper/Info.plist" "$APP_PATH/Contents/"

# Compile Swift code
echo "Compiling Swift code..."
xcrun swiftc -o "$APP_PATH/Contents/MacOS/SessionTimerHelper" "$(dirname "$0")/SessionTimerHelper/main.swift"

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo "App built at: $APP_PATH"
    echo ""
    echo "To install and register the URL handler:"
    echo "1. Copy the app to /Applications/:"
    echo "   cp -r '$APP_PATH' /Applications/"
    echo ""
    echo "2. Register the URL scheme by running the app once:"
    echo "   open '/Applications/$APP_NAME'"
    echo ""
    echo "3. Test with:"
    echo "   open 'sessiontimer://timer?s=a,03:57,5&mode=up'"
else
    echo "❌ Build failed!"
    exit 1
fi
