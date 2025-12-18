import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.2"
username = "ninja"
password = "Nvnaka7799@"

def repair():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Kill everything
        print("Killing stale processes...")
        client.exec_command("pkill -f uvicorn")
        client.exec_command("pkill -f nuxview")

        # 2. Find where the dist files are
        print("Listing directory structure...")
        stdin, stdout, stderr = client.exec_command("find ~/.nuxview/app -maxdepth 4")
        print(stdout.read().decode())

        # 3. Check repo dir (where installer was run)
        print("Checking for 'dist' in temp repo...")
        stdin, stdout, stderr = client.exec_command("ls -d ~/nuxview_install_tmp/frontend/dist 2>/dev/null")
        print(stdout.read().decode() or "Temp dist not found")

        # 4. Check main.py frontend static path
        print("Checking main.py static path...")
        stdin, stdout, stderr = client.exec_command("grep -C 5 'StaticFiles' ~/.nuxview/app/backend/main.py")
        print(stdout.read().decode())

        # 5. Restart service
        print("Restarting service...")
        client.exec_command("mkdir -p ~/.nuxview/logs")
        stdin, stdout, stderr = client.exec_command("$HOME/.local/bin/nuxview start --host 0.0.0.0")
        print(stdout.read().decode())
        print(stderr.read().decode())

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    repair()
