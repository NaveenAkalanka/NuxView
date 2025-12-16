# NuxView

A Linux folder-tree viewer. Scans directories and provides a local web UI to explore the folder structure.

## Features
- **Fast Scanning**: Recursively scans directories to build a JSON tree.
- **Web UI**: Modern React-based interface with search and filtering.
- **CLI Control**: Simple commands to start, stop, and manage the service.
- **LAN Sharing**: Optionally bind to 0.0.0.0 to share with other devices.

## Installation

### Option 1: One-Line Remote Install (Recommended)
If you have pushed this repository to GitHub (or another git server), you can install it on any machine with a single command. 

**Prerequisites**: `git` and `python3` must be installed.

```bash
curl -sL https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/remote_install.sh | bash
```

To install globally (for all users), run with sudo:
```bash
curl -sL https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/remote_install.sh | sudo bash
```

**Important**: Ensure you have committed the built frontend (`frontend/dist`) to your repository, or the remote installer won't have the web UI assets.

### Option 2: Local Install
1. Clone or download this repository.
2. Run the installer:
   ```bash
   chmod +x install.sh
   ./install.sh
   # Or for global install: sudo ./install.sh
   ```

## Usage

### Start
Start the background service:
```bash
nuxview start
```
By default, it runs on http://127.0.0.1:4897.

### Start in LAN Mode
To share with devices on your network:
```bash
nuxview start --host 0.0.0.0
```
The CLI will print the local IP address (e.g. `http://192.168.1.5:4897`).

### Scan a Directory
```bash
nuxview scan /path/to/directory
```

### Check Status
```bash
nuxview status
```

### Stop
```bash
nuxview stop
```

### Uninstall
```bash
nuxview uninstall
```

## Development

### Backend (Python)
Located in `backend/`.
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend (React)
Located in `frontend/`.
```bash
cd frontend
npm install
npm run dev
```
