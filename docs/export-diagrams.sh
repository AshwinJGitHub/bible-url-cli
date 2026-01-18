#!/bin/bash
# Export all draw.io diagrams to SVG for GitHub compatibility
# Requires: draw.io desktop app installed
#   - macOS: brew install --cask drawio
#   - Linux: snap install drawio
#   - Windows: Download from https://github.com/jgraph/drawio-desktop/releases

set -e

DOCS_DIR="$(dirname "$0")"
DRAWIO_CMD=""

# Find draw.io executable
if command -v drawio &> /dev/null; then
    DRAWIO_CMD="drawio"
elif command -v draw.io &> /dev/null; then
    DRAWIO_CMD="draw.io"
elif [ -f "/Applications/draw.io.app/Contents/MacOS/draw.io" ]; then
    DRAWIO_CMD="/Applications/draw.io.app/Contents/MacOS/draw.io"
elif [ -f "/usr/bin/drawio" ]; then
    DRAWIO_CMD="/usr/bin/drawio"
elif [ -f "/snap/bin/drawio" ]; then
    DRAWIO_CMD="/snap/bin/drawio"
else
    echo "Error: draw.io not found. Please install it:"
    echo "  macOS:   brew install --cask drawio"
    echo "  Linux:   snap install drawio"
    echo "  Windows: Download from https://github.com/jgraph/drawio-desktop/releases"
    exit 1
fi

echo "Using draw.io: $DRAWIO_CMD"
echo "Exporting diagrams from: $DOCS_DIR"
echo ""

# Create svg output directory
mkdir -p "$DOCS_DIR/svg"

# Export each .drawio file to SVG
for file in "$DOCS_DIR"/*.drawio; do
    if [ -f "$file" ]; then
        filename=$(basename "$file" .drawio)
        output="$DOCS_DIR/svg/${filename}.svg"
        echo "Exporting: $filename.drawio -> svg/${filename}.svg"
        "$DRAWIO_CMD" --export --format svg --output "$output" "$file" 2>/dev/null || {
            # Try with xvfb for headless environments
            if command -v xvfb-run &> /dev/null; then
                xvfb-run "$DRAWIO_CMD" --export --format svg --output "$output" "$file"
            else
                echo "  Warning: Export failed for $filename"
            fi
        }
    fi
done

echo ""
echo "Done! SVG files exported to: $DOCS_DIR/svg/"
