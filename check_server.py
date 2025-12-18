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
        
        # 1. Check if nuxview binary exists at the known local path
        local_bin_path = "/home/ninja/.local/bin/nuxview"
        stdin, stdout, stderr = client.exec_command(f"ls -l {local_bin_path}")
        exists = stdout.read().decode().strip()
        
        if not exists:
            print(f"NuxView binary NOT found at {local_bin_path}")
        else:
            print(f"NuxView binary found at: {local_bin_path}")

        # 2. Check status via full path
        print("Checking status via full path...")
        stdin, stdout, stderr = client.exec_command(f"{local_bin_path} status")
        status_output = stdout.read().decode().strip()
        print("Status Output:")
        print(status_output)

        # 3. Double check process list (broad grep)
        print("Checking process list (broad grep)...")
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
