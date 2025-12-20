import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.3"
username = "ninja"
password = "Nvnaka7799@"

def check():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Check index.html exists
        print("--- Frontend Check ---")
        stdin, stdout, stderr = client.exec_command("ls -l ~/.nuxview/app/frontend/dist/index.html")
        print(stdout.read().decode(errors='replace') or "index.html MISSING")

        # 2. Check main.py path
        print("--- Backend Check ---")
        stdin, stdout, stderr = client.exec_command("ls -l ~/.nuxview/app/backend/main.py")
        print(stdout.read().decode(errors='replace') or "main.py MISSING")

        # 3. Check logs again (with sudo just in case)
        print("--- Log Content ---")
        stdin, stdout, stderr = client.exec_command("cat ~/.nuxview/logs/nuxview.log")
        print(stdout.read().decode(errors='replace') or "Log is empty")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    check()
