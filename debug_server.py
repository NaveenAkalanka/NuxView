import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.2"
username = "ninja"
password = "Nvnaka7799@"

def debug_remote():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Check /opt/nuxview
        print("Checking /opt/nuxview...")
        stdin, stdout, stderr = client.exec_command("ls -la /opt/nuxview")
        print(stdout.read().decode(errors='replace'))
        print(stderr.read().decode(errors='replace'))

        # 2. Nuke it just in case
        print("Removing /opt/nuxview...")
        sudo_cmd = "echo 'Nvnaka7799@' | sudo -S -p '' rm -rf /opt/nuxview"
        stdin, stdout, stderr = client.exec_command(sudo_cmd)
        stdout.channel.recv_exit_status()

        # 3. Check CLI content
        print("Checking ~/.local/bin/nuxview content...")
        stdin, stdout, stderr = client.exec_command("grep 'INSTALL_ROOT=' $HOME/.local/bin/nuxview -A 5 -B 5")
        print(stdout.read().decode(errors='replace'))

        # 4. Try start again
        print("Starting NuxView...")
        start_cmd = "$HOME/.local/bin/nuxview start --host 0.0.0.0" 
        stdin, stdout, stderr = client.exec_command(start_cmd)
        print(stdout.read().decode(errors='replace'))
        print(stderr.read().decode(errors='replace'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    debug_remote()
