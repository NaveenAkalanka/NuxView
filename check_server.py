import paramiko
import sys

hostname = "192.168.1.2"
username = "ninja"
password = "Nvnaka7799@"

def check_remote():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password, timeout=10)
        print("Connected.")
        
        # 1. Check if nuxview binary exists (is it installed?)
        stdin, stdout, stderr = client.exec_command("which nuxview")
        nuxview_path = stdout.read().decode().strip()
        
        if not nuxview_path:
            print("NuxView is NOT installed (binary 'nuxview' not found in PATH).")
            # Maybe check /opt/nuxview/venv/bin/nuxview?
        else:
            print(f"NuxView is installed at: {nuxview_path}")

        # 2. Check status via CLI
        print("Checking status via 'nuxview status'...")
        stdin, stdout, stderr = client.exec_command("nuxview status")
        status_output = stdout.read().decode().strip()
        print("Status Output:")
        print(status_output)

        # 3. Double check process list
        print("Checking process list...")
        stdin, stdout, stderr = client.exec_command("ps aux | grep uvicorn | grep -v grep")
        ps_output = stdout.read().decode().strip()
        if ps_output:
            print("Process found:")
            print(ps_output)
        else:
            print("No 'uvicorn' process found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    check_remote()
