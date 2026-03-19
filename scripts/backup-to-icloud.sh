#!/bin/zsh

set -e

SRC="$HOME/Projects/store-os"
DEST_BASE="$HOME/Library/Mobile Documents/com~apple~CloudDocs/Backups/store-os"
LATEST="$DEST_BASE/latest"
SNAPSHOTS="$DEST_BASE/snapshots"
STAMP=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$LATEST"
mkdir -p "$SNAPSHOTS"

rm -rf "$LATEST"/*

rsync -av --delete \
  --exclude ".git" \
  --exclude ".DS_Store" \
  --exclude "node_modules" \
  --exclude "dist" \
  --exclude "build" \
  --exclude ".next" \
  --exclude ".cache" \
  --exclude "tmp" \
  "$SRC"/ "$LATEST"/

cd "$HOME/Projects" || exit 1
zip -r "$SNAPSHOTS/store-os_$STAMP.zip" "store-os" \
  -x "*.DS_Store*" \
  -x "*/.git/*" \
  -x "*/node_modules/*" \
  -x "*/dist/*" \
  -x "*/build/*" \
  -x "*/.next/*" \
  -x "*/.cache/*" \
  -x "*/tmp/*"

echo "Backup completed successfully."
echo "Latest copy: $LATEST"
echo "Snapshot zip: $SNAPSHOTS/store-os_$STAMP.zip"
