#!/bin/bash

# Check if task name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <task-name>"
  echo "Example: $0 document-summarization"
  exit 1
fi

TASK_NAME=$1

# Get current UTC date from World Time API
CURRENT_DATE=$(curl -s 'https://worldtimeapi.org/api/timezone/UTC' | grep -o '"datetime":"[^"]*"' | cut -d'"' -f4 | cut -d'T' -f1)

# Validate date format
if [[ ! $CURRENT_DATE =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Warning: Could not get date from World Time API, falling back to system time"
  CURRENT_DATE=$(TZ=UTC date +%Y-%m-%d)
fi

# Create sessions directory if it doesn't exist
mkdir -p .ai/sessions

# Create session file
SESSION_FILE=".ai/sessions/${CURRENT_DATE}_${TASK_NAME}.md"
cp .ai/sessions/template.md "$SESSION_FILE"

# Update date in session file
sed -i "" "s/Date: .*/Date: ${CURRENT_DATE}/" "$SESSION_FILE"

echo "Created session file: $SESSION_FILE" 