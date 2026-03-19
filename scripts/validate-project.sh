#!/bin/zsh

PROJECT_ID="$1"
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TARGET_DIR="$BASE_DIR/projects/$PROJECT_ID"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./scripts/validate-project.sh <project-id>"
  exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
  echo "Project not found: $TARGET_DIR"
  exit 1
fi

if [ ! -f "$TARGET_DIR/project.json" ]; then
  echo "Missing file: $TARGET_DIR/project.json"
  exit 1
fi

echo "Checking required folders..."

MISSING=0

for dir in input research manifests theme content assets exports notes; do
  if [ ! -d "$TARGET_DIR/$dir" ]; then
    echo "Missing folder: $TARGET_DIR/$dir"
    MISSING=1
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo "Validation failed for project: $PROJECT_ID"
  exit 1
fi

echo "Validation passed for project: $PROJECT_ID"
echo "Location: $TARGET_DIR"
