import paramiko
import sys
import io

# Fix encoding for Windows console (if possible) otherwise just handle decoding carefully
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.2"
username = "ninja"
password = "Nvnaka7799@"

def deploy():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 2. Deploy command (skip re-installing deps if already done, but command is safe to re-run)
        install_cmd = "curl -sL https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/remote_install.sh | bash"
        
        print(f"Running install: {install_cmd}")
        stdin, stdout, stderr = client.exec_command(install_cmd)
        
        # Stream output
        while True:
            # Read bytes to avoid decoding partial chunks
            line = stdout.readline()
            if not line:
                break
            # Strip and print safely
            try:
                print(line.strip())
            except:
                pass 
            
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            print("Install script failed.")
            print(stderr.read().decode(errors='replace'))
            
            # Check if it was just because it's running?
            # No, install.sh doesn't fail if running, just maybe overwrites.

        # 3. Start it
        print("Starting NuxView...")
        start_cmd = "$HOME/.local/bin/nuxview start --host 0.0.0.0" 
        stdin, stdout, stderr = client.exec_command(start_cmd)
        print(stdout.read().decode(errors='replace'))
        err = stderr.read().decode(errors='replace')
        if err:
             print("STDERR:", err)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    deploy()
