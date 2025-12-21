
# NuxView

![NuxView Banner](https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/frontend/public/NuxView.svg)

> **Visualize Your System.**  
> A powerful, beautiful, and intuitive file explorer for Linux servers.

[Live Demo](http://192.168.1.3:4897) | [Install](#installation) | [Features](#features)

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

## 🚀 Installation

### Option 1: One-Line Installer (Recommended)

Run this command on your Linux server to install and start NuxView automatically:

```bash
curl -sL https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/remote_install.sh | bash
```

The app will start on port `4897` (e.g., `http://your-server-ip:4897`).

### Option 2: Manual Installation (Development)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/NaveenAkalanka/NuxView.git
   cd NuxView
   ```

2. **Backend Setup (Python)**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup (React/Vite)**
   ```bash
   cd ../frontend
   npm install
   npm run build
   ```

4. **Run Application**
   ```bash
   # From root directory
   ./start.sh 
   # OR manually:
   uvicorn backend.main:app --host 0.0.0.0 --port 4897
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
  <sub>© 2025 NuxView Project. MIT License.</sub>
</p>
