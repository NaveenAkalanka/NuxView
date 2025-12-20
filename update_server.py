import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.3"
username = "ninja"
password = "Nvnaka7799@"

def update_remote():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Stop service
        print("Stopping service...")
        client.exec_command("$HOME/.local/bin/nuxview stop")

        # 2. Re-run install to get new code & frontend build
        install_cmd = "curl -sL https://raw.githubusercontent.com/NaveenAkalanka/NuxView/main/remote_install.sh | bash"
        print(f"Running update: {install_cmd}")
        stdin, stdout, stderr = client.exec_command(install_cmd)
        
        # Stream output
        while True:
            line = stdout.readline()
            if not line:
                break
            try:
                print(line.strip())
            except:
                pass 
            
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            print("Update failed.")
            print(stderr.read().decode(errors='replace'))
            return

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
    update_remote()
