#!/bin/bash

# Generate Calendar Script
# Creates ICS files from SessionTimer segments for automation workflows
# Usage: ./generateCalendar.sh segments.json [output.ics]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JQ_PATH=$(which jq)
ICALBUDDY_PATH=$(which icalBuddy)

# Check dependencies
if [[ ! -x "$JQ_PATH" ]]; then
    echo "Error: jq not found. Install with: brew install jq"
    exit 1
fi

if [[ ! -x "$ICALBUDDY_PATH" ]]; then
    echo "Warning: icalBuddy not found. Install with: brew install ical-buddy"
    echo "Continuing without preview functionality..."
    ICALBUDDY_PATH=""
fi

# Parse arguments
INPUT_FILE="${1:-segments.json}"
OUTPUT_FILE="${2:-session-timer-$(date +%Y%m%d-%H%M%S).ics}"

if [[ ! -f "$INPUT_FILE" ]]; then
    echo "Error: Input file '$INPUT_FILE' not found"
    echo ""
    echo "Usage: $0 <segments.json> [output.ics]"
    echo ""
    echo "Example segments.json format:"
    echo '['
    echo '  {"time": "09:00", "duration": 30, "mode": "up"},'
    echo '  {"time": "10:30", "duration": 45, "mode": "down"}'
    echo ']'
    exit 1
fi

echo "SessionTimer Calendar Generator"
echo "Input: $INPUT_FILE"
echo "Output: $OUTPUT_FILE"
echo ""

# Generate ICS content using jq
generate_ics() {
    local segments_json="$1"
    local title="${2:-Session Timer}"
    local now=$(date -u +"%Y%m%dT%H%M%SZ")
    local uid="sessiontimer-$(date +%s)"
    
    echo "BEGIN:VCALENDAR"
    echo "VERSION:2.0"
    echo "PRODID:-//Session Timer//Session Timer CLI//EN"
    echo "CALSCALE:GREGORIAN"
    echo "METHOD:PUBLISH"
    
    # Process each segment
    echo "$segments_json" | jq -r '.[] | @base64' | while read -r segment_b64; do
        local segment=$(echo "$segment_b64" | base64 --decode)
        local time=$(echo "$segment" | jq -r '.time')
        local duration=$(echo "$segment" | jq -r '.duration')
        local mode=$(echo "$segment" | jq -r '.mode // "down"')
        local index=$(echo "$segments_json" | jq --argjson seg "$segment" 'map(. == $seg) | index(true)')
        
        # Calculate start and end times
        local hour=$(echo "$time" | cut -d: -f1)
        local minute=$(echo "$time" | cut -d: -f2)
        
        # Create today's date with specified time
        local start_time=$(date -j -f "%H:%M" "$time" "+%Y%m%dT%H%M%S")
        local end_timestamp=$(($(date -j -f "%Y%m%dT%H%M%S" "$start_time" "+%s") + (duration * 60)))
        local end_time=$(date -j -f "%s" "$end_timestamp" "+%Y%m%dT%H%M%S")
        
        local mode_text=""
        if [[ "$mode" == "up" ]]; then
            mode_text="Count Up"
        else
            mode_text="Count Down"
        fi
        
        echo "BEGIN:VEVENT"
        echo "UID:$uid-$index@sessiontimer.local"
        echo "DTSTAMP:$now"
        echo "DTSTART:${start_time}"
        echo "DTEND:${end_time}"
        echo "SUMMARY:$title - $mode_text (${duration}min)"
        echo "DESCRIPTION:Session Timer: $mode_text timer for $duration minutes"
        echo "CATEGORIES:PRODUCTIVITY,TIMER"
        echo "STATUS:CONFIRMED"
        echo "END:VEVENT"
    done
    
    echo "END:VCALENDAR"
}

# Read and validate JSON
if ! SEGMENTS=$(cat "$INPUT_FILE" | jq '.'); then
    echo "Error: Invalid JSON in $INPUT_FILE"
    exit 1
fi

# Generate ICS
echo "Generating ICS content..."
ICS_CONTENT=$(generate_ics "$SEGMENTS")

# Write to file
echo "$ICS_CONTENT" > "$OUTPUT_FILE"

echo "✓ ICS file created: $OUTPUT_FILE"

# Show preview if icalBuddy is available
if [[ -n "$ICALBUDDY_PATH" ]]; then
    echo ""
    echo "Event Preview:"
    echo "─────────────"
    echo "$SEGMENTS" | jq -r '.[] | "• \(.time) - \(.mode // "down" | if . == "up" then "Count Up" else "Count Down" end) (\(.duration)min)"'
    echo ""
fi

# Generate URLs for easy access
BASE_URL="https://piarasj.github.io/timer/timer-v2.html"
echo "Generated URLs:"
echo "──────────────"

# Single segment URL (if only one segment)
SEGMENT_COUNT=$(echo "$SEGMENTS" | jq 'length')
if [[ "$SEGMENT_COUNT" == "1" ]]; then
    SEGMENT=$(echo "$SEGMENTS" | jq -r '.[0]')
    TIME=$(echo "$SEGMENT" | jq -r '.time')
    DURATION=$(echo "$SEGMENT" | jq -r '.duration')
    MODE=$(echo "$SEGMENT" | jq -r '.mode // "down"')
    
    echo "Web URL:"
    echo "$BASE_URL?s=a,$TIME,$DURATION&mode=$MODE"
    echo ""
    echo "Custom scheme:"
    echo "sessiontimer://timer?s=a,$TIME,$DURATION&mode=$MODE"
else
    # Multiple segments URL
    SEGMENTS_PARAM=$(echo "$SEGMENTS" | jq -r 'map("\(.time),\(.duration),\(.mode // "down")") | join("|")' | sed 's/ /%20/g')
    
    echo "Web URL:"
    echo "$BASE_URL?segments=$SEGMENTS_PARAM"
    echo ""
    echo "Custom scheme:"
    echo "sessiontimer://segments?data=$SEGMENTS_PARAM"
fi

echo ""
echo "✓ Calendar generation complete!"
echo ""
echo "To import:"
echo "• Double-click $OUTPUT_FILE to import to Calendar.app"
echo "• Or use: open '$OUTPUT_FILE'"
echo "• For Fantastical: Open the generated URLs above"
