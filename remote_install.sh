#!/bin/bash
# Installation script for NuxView
# Usage: curl -sL https://raw.githubusercontent.com/YOUR_USER/NuxView/main/remote_install.sh | bash

REPO_URL="${NUXVIEW_REPO:-https://github.com/NaveenAkalanka/NuxView.git}"
BRANCH="${NUXVIEW_BRANCH:-main}"
TEMP_DIR=$(mktemp -d)

echo "=== NuxView Remote Installer ==="
echo "Source: $REPO_URL ($BRANCH)"

# Check for git
if ! command -v git &> /dev/null; then
    echo "Error: git is required."
    exit 1
fi

echo "Downloading..."
git clone -b "$BRANCH" "$REPO_URL" "$TEMP_DIR" > /dev/null 2>&1

if [ ! -f "$TEMP_DIR/install.sh" ]; then
    echo "Error: install.sh not found in the repository."
    rm -rf "$TEMP_DIR"
    exit 1
fi

echo "Running local installer..."
cd "$TEMP_DIR"
chmod +x install.sh

# Forward to the actual install script
# We preserve the current user context (sudo or not)
./install.sh

echo "Cleaning up..."
cd /
rm -rf "$TEMP_DIR"

echo "Done."
