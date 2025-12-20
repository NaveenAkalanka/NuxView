import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.3"
username = "ninja"
password = "Nvnaka7799@"

def diagnose():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Broad search for nuxview
        print("Searching for 'nuxview' binary/dir...")
        commands = [
            "which nuxview",
            "ls -d ~/.nuxview 2>/dev/null",
            "find ~ -name nuxview 2>/dev/null",
            "ls -la /usr/local/bin/nuxview 2>/dev/null",
            "ls -la /opt/nuxview 2>/dev/null"
        ]
        
        for cmd in commands:
            print(f"Running: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode().strip()
            if out:
                print(f"Result: {out}")
            else:
                print("Result: None")

        # 2. Check running processes
        print("Checking for running uvicorn processes...")
        stdin, stdout, stderr = client.exec_command("ps aux | grep uvicorn | grep -v grep")
        print(stdout.read().decode().strip() or "None found")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    diagnose()
