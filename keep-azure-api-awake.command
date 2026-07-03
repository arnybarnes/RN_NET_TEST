#!/bin/zsh

set -u

BASE_URL="${BASE_URL:-https://biffnaappserver-bcbagah5g8g9apb3.centralus-01.azurewebsites.net}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-420}"
MAX_CALLS="${MAX_CALLS:-0}"
URL="${BASE_URL%/}${HEALTH_PATH}"

if ! [[ "$INTERVAL_SECONDS" =~ '^[0-9]+$' ]] || [ "$INTERVAL_SECONDS" -lt 300 ] || [ "$INTERVAL_SECONDS" -gt 600 ]; then
    echo "INTERVAL_SECONDS must be a number from 300 to 600."
    echo "Current value: $INTERVAL_SECONDS"
    echo
    read -r "?Press Enter to close..."
    exit 1
fi

if ! [[ "$MAX_CALLS" =~ '^[0-9]+$' ]]; then
    echo "MAX_CALLS must be a non-negative number."
    echo "Current value: $MAX_CALLS"
    echo
    read -r "?Press Enter to close..."
    exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is not installed or not on PATH."
    echo
    read -r "?Press Enter to close..."
    exit 1
fi

CAFFEINATE_PID=""

cleanup() {
    if [ -n "$CAFFEINATE_PID" ]; then
        kill "$CAFFEINATE_PID" >/dev/null 2>&1 || true
    fi
}

stop() {
    echo
    echo "Stopping..."
    cleanup
    exit 130
}

trap cleanup EXIT
trap stop INT TERM

if command -v caffeinate >/dev/null 2>&1; then
    caffeinate -dims -w "$$" &
    CAFFEINATE_PID=$!
else
    echo "Warning: caffeinate is not installed or not on PATH. Continuing without sleep prevention."
    echo
fi

format_duration() {
    local seconds="$1"
    local hours=$(( seconds / 3600 ))
    local minutes=$(( (seconds % 3600) / 60 ))
    local remaining_seconds=$(( seconds % 60 ))

    printf "%02d:%02d:%02d" "$hours" "$minutes" "$remaining_seconds"
}

START_EPOCH=$(date +%s)
CALL_COUNT=0

echo "Keeping Azure API awake with periodic health checks."
echo "Endpoint: $URL"
echo "Interval: $INTERVAL_SECONDS seconds"
echo "Started:  $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo
echo "Close this Terminal window or press Ctrl-C to stop."
echo

while true; do
    CALL_COUNT=$(( CALL_COUNT + 1 ))
    CALL_STARTED=$(date +%s)
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

    RESPONSE=$(curl -fsS --max-time 30 -w '\n%{http_code} %{time_total}' "$URL" 2>&1)
    CURL_EXIT=$?
    CALL_ENDED=$(date +%s)
    ELAPSED=$(format_duration $(( CALL_ENDED - START_EPOCH )))

    if [ "$CURL_EXIT" -eq 0 ]; then
        BODY=$(printf "%s" "$RESPONSE" | sed '$d')
        METRICS=$(printf "%s" "$RESPONSE" | tail -n 1)
        HTTP_CODE="${METRICS%% *}"
        TIME_TOTAL="${METRICS#* }"
        printf "[%s] call #%d | running %s | HTTP %s | %.2fs | %s\n" \
            "$TIMESTAMP" "$CALL_COUNT" "$ELAPSED" "$HTTP_CODE" "$TIME_TOTAL" "$BODY"
    else
        printf "[%s] call #%d | running %s | FAILED | %s\n" \
            "$TIMESTAMP" "$CALL_COUNT" "$ELAPSED" "$RESPONSE"
    fi

    if [ "$MAX_CALLS" -gt 0 ] && [ "$CALL_COUNT" -ge "$MAX_CALLS" ]; then
        echo
        echo "Reached MAX_CALLS=$MAX_CALLS. Exiting."
        break
    fi

    NEXT_CALL_EPOCH=$(( CALL_STARTED + INTERVAL_SECONDS ))
    NOW=$(date +%s)
    SLEEP_SECONDS=$(( NEXT_CALL_EPOCH - NOW ))

    if [ "$SLEEP_SECONDS" -lt 1 ]; then
        SLEEP_SECONDS=1
    fi

    echo "Next health check in $SLEEP_SECONDS seconds."
    echo
    sleep "$SLEEP_SECONDS"
done

echo
echo "Stopped after $(format_duration $(($(date +%s) - START_EPOCH))) and $CALL_COUNT calls."
read -r "?Press Enter to close..."
