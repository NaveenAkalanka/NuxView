#!/bin/bash
set -e

# Detect where we are running from
REPO_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if running as root
if [ "$(id -u)" -eq 0 ]; then
    echo "Running as root. Installing globally to /opt/nuxview..."
    INSTALL_DIR="/opt/nuxview"
    BIN_DIR="/usr/local/bin"
    SUDO=""
else
    echo "Running as user. Installing locally to ~/.nuxview..."
    INSTALL_DIR="$HOME/.nuxview"
    BIN_DIR="$HOME/.local/bin"
    SUDO=""
fi

echo "=== NuxView Installer ==="
echo "Install path: $INSTALL_DIR"
echo "Binary path:  $BIN_DIR"

# 1. Structure
echo "Creating directories..."
mkdir -p "$INSTALL_DIR/app/backend"
mkdir -p "$INSTALL_DIR/app/frontend"
# We don't necessarily need data/logs in global dir, but venv yes
mkdir -p "$BIN_DIR"

# 2. Copy source
echo "Copying application files..."
# Clean old
rm -rf "$INSTALL_DIR/app/backend/"*
rm -rf "$INSTALL_DIR/app/frontend/"*

cp -r "$REPO_DIR/backend/"* "$INSTALL_DIR/app/backend/"

if [ -d "$REPO_DIR/frontend/dist" ]; then
    echo "Copying frontend assets..."
    cp -r "$REPO_DIR/frontend/dist/"* "$INSTALL_DIR/app/frontend/"
else
    echo "WARNING: Frontend dist not found. Build it first!"
fi

# 3. Venv
echo "Setting up Python virtual environment..."
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed."
    exit 1
fi

# Create venv
python3 -m venv "$INSTALL_DIR/venv"
"$INSTALL_DIR/venv/bin/pip" install -U pip
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/app/backend/requirements.txt"

# 4. CLI
echo "Installing CLI binary..."
cp "$REPO_DIR/nuxview" "$BIN_DIR/nuxview"
chmod +x "$BIN_DIR/nuxview"

# Fix permissions if global
if [ "$(id -u)" -eq 0 ]; then
    echo "Fixing permissions for /opt/nuxview..."
    # Allow all users to read/execute in /opt/nuxview so they can run the venv python
    chmod -R 755 "$INSTALL_DIR"
fi

echo "=== Installation Complete ==="
echo "Executable: $BIN_DIR/nuxview"
echo ""
echo "Start with:"
echo "  nuxview start"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo "NOTE: $BIN_DIR is not in your PATH."
fi
