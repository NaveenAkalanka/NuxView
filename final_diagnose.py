import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.3"
username = "ninja"
password = "Nvnaka7799@"

def final_diagnose():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Check if process is running
        print("--- Processes ---")
        stdin, stdout, stderr = client.exec_command("ps aux | grep uvicorn | grep -v grep")
        print(stdout.read().decode(errors='replace') or "None")

        # 2. Check logs
        print("--- Logs ---")
        stdin, stdout, stderr = client.exec_command("tail -n 20 ~/.nuxview/logs/nuxview.log")
        print(stdout.read().decode(errors='replace') or "No log content")

        # 3. Check ports
        print("--- Ports ---")
        stdin, stdout, stderr = client.exec_command("ss -tuln | grep 4897")
        print(stdout.read().decode(errors='replace') or "Port 4897 is NOT listening")

        # 4. Check firewall
        print("--- Firewall ---")
        client.exec_command("echo 'Nvnaka7799@' | sudo -S -p '' ufw status")
        stdin, stdout, stderr = client.exec_command("echo 'Nvnaka7799@' | sudo -S -p '' ufw status")
        print(stdout.read().decode(errors='replace') or "UFW status check failed")

        # 5. Try to START if not running
        print("--- Auto-Start Attempt ---")
        client.exec_command("mkdir -p ~/.nuxview/logs")
        client.exec_command("$HOME/.local/bin/nuxview start --host 0.0.0.0")
        import time
        time.sleep(2)
        stdin, stdout, stderr = client.exec_command("ps aux | grep uvicorn | grep -v grep")
        print("Process List After Start:", stdout.read().decode(errors='replace') or "STILL NOT RUNNING")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    final_diagnose()
