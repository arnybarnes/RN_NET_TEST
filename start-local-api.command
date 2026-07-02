#!/bin/zsh

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$SCRIPT_DIR/backend/LocalApi"

if ! command -v dotnet >/dev/null 2>&1; then
    echo "dotnet is not installed or not on PATH."
    echo
    read -r "?Press Enter to close..."
    exit 1
fi

if [ ! -d "$API_DIR" ]; then
    echo "Local API directory not found:"
    echo "$API_DIR"
    echo
    read -r "?Press Enter to close..."
    exit 1
fi

cd "$API_DIR" || exit 1

echo "Starting Local API from:"
echo "$API_DIR"
echo
echo "Expected URL: http://127.0.0.1:5024"
echo

TESTER="$SCRIPT_DIR/html-testers/local/index.html"
if [ -f "$TESTER" ]; then
    read -r "?Launch local tester? [y/N] " LAUNCH_TESTER
    case "$LAUNCH_TESTER" in
        [Yy]*)
            echo "Opening local tester..."
            open "$TESTER"
            ;;
    esac
    echo
fi

dotnet run --launch-profile http
EXIT_CODE=$?

echo
echo "Local API exited with code $EXIT_CODE."
read -r "?Press Enter to close..."
exit "$EXIT_CODE"
