
<p align="center">
  <img src="https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/frontend/public/NuxView-white.svg" alt="NuxView Logo" width="150" />
</p>

<h1 align="center">NuxView</h1>

<p align="center">
  <strong>Visualize Your System.</strong><br>
  A powerful, beautiful, and intuitive file explorer for Linux servers.
</p>

<p align="center">
  <a href="https://buymeacoffee.com/naveenakalanka" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 145px !important;" >
  </a>
</p>

---

## What is NuxView?

**NuxView** is a modern web-based file system visualizer designed to demystify CLI structures. Instead of staring at `ls -la` output, NuxView provides a node-based interactive graph and a deep-dive analysis of your server's file system.

It's built for **SysAdmins**, **Developers**, and **Linux Enthusiasts** who want crystal-clear visibility into their machines.

## ✨ Features

- **🌐 Interactive Graph Visualization**: See your folders as nodes in a tree. Zoom, pan, and dragging nodes to understand structure logic.
- **📁 Deep Explorer**: A side-panel file explorer that supports infinite nesting and huge directory trees with smooth performance.
- **🔍 Full System Scan**: Parallel processing backend scans thousands of files in seconds to give you instant insights.
- **🔐 Permission Analysis**: Visualize file permissions, ownership (UID/GID), and modification times instantly.
- **🎨 Modern UI**: Built with a sleek, dark-themed interface featuring glassmorphism and neon accents.
- **📱 Mobile Responsive**: Fully functional on mobile devices with a touch-optimized layout.

---

## 📋 Prerequisites & Precautions

Before installing NuxView, ensure your system is ready:

### 1. Check & Install Required Tools
Run these commands to verify you have the necessary tools:

- **Verify curl & git**:
  ```bash
  command -v curl || (echo "Please install curl" && sudo apt update && sudo apt install curl -y)
  command -v git || (echo "Please install git" && sudo apt update && sudo apt install git -y)
  ```
- **Verify Python 3 & Venv**:
  ```bash
  python3 --version || sudo apt install python3 -y
  # Crucial for Ubuntu/Debian:
  dpkg -s python3-venv >/dev/null 2>&1 || sudo apt install python3-venv -y
  ```

### 2. Precautions
- **Port Availability**: NuxView uses port **4897**. Check if it's free:
  ```bash
  ss -tuln | grep 4897
  ```
- **Existing Instance**: If updating, stop the current service first:
  ```bash
  nuxview stop
  ```
- **Permissions**: Installs to `~/.nuxview` by default. No `sudo` required for standard installation.

---

## 🚀 Installation

### One-Line Installer (Recommended)

Run this command on your Linux server to install and start NuxView automatically:

```bash
curl -sL https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/remote_install.sh | bash
```

The app will start on port `4897` (e.g., `http://your-server-ip:4897`).

---

## 📖 How to Use

Once installed, you can manage NuxView using the `nuxview` command:

### Core Commands
- **Start the server** (Accessible on the local network):
  ```bash
  nuxview start
  # Or with custom host/port
  nuxview start --host 192.168.1.x --port 5000
  ```
- **Check status**:
  ```bash
  nuxview status
  ```
- **Stop the server**:
  ```bash
  nuxview stop
  ```

### Advanced Usage
- **Trigger a custom scan**:
  ```bash
  nuxview scan /var/log
  ```
- **Remove NuxView**:
  ```bash
  nuxview uninstall
  ```

---

## 🛠 Tech Stack

- **Frontend**: React, Vite, React Flow (Visualization), Lucide Icons
- **Backend**: FastAPI (Python), Uvicorn, Parallel Processing
- **Styling**: Vanilla CSS (Custom Theme Variables), Glassmorphism

---

## 🔒 Security

NuxView is designed as a **monitoring and visualization tool**.
- **Read-Only**: It does not modify, delete, or upload files.
- **Local Access**: By default, it binds to `0.0.0.0`. It is recommended to use it behind a VPN or SSH Tunnel for public servers.
- **No External Calls**: The app runs entirely on your server. No data is sent to the cloud (except the optional Feedback form which uses Web3Forms).

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

Designed & Developed by **Naveen Akalanka**.

---

<p align="center">
  <a href="https://buymeacoffee.com/naveenakalanka" target="_blank">
    <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 50px !important;width: 181px !important;" >
  </a>
</p>

<p align="center">
  <sub>© 2025 NuxView Project. MIT License.</sub>
</p>
