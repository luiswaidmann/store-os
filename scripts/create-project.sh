#!/bin/zsh

set -e

PROJECT_ID="$1"
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$BASE_DIR/templates/project-template"
TARGET_DIR="$BASE_DIR/projects/$PROJECT_ID"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./scripts/create-project.sh <project-id>"
  exit 1
fi

if [ -d "$TARGET_DIR" ]; then
  echo "Project already exists: $TARGET_DIR"
  exit 1
fi

cp -R "$TEMPLATE_DIR"/. "$TARGET_DIR"

sed -i '' "s/example-store/$PROJECT_ID/g" "$TARGET_DIR/project.json"

echo "Created project: $PROJECT_ID"
echo "Location: $TARGET_DIR"
