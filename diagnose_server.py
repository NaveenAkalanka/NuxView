import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.2"
username = "ninja"
password = "Nvnaka7799@"

def diagnose():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Check if process is running
        print("Checking processes...")
        stdin, stdout, stderr = client.exec_command("ps aux | grep uvicorn")
        print(stdout.read().decode(errors='replace'))

        # 2. Check logs dir
        print("Checking logs dir...")
        stdin, stdout, stderr = client.exec_command("ls -la ~/.nuxview/logs")
        print(stdout.read().decode(errors='replace'))
        print(stderr.read().decode(errors='replace'))

        # 3. Check open ports
        print("Checking listening ports (ss -tuln)...")
        stdin, stdout, stderr = client.exec_command("ss -tuln | grep 4897")
        print(stdout.read().decode(errors='replace'))

        # 4. Check firewall (ufw) -- requires sudo
        print("Checking UFW status...")
        sudo_cmd = "echo 'Nvnaka7799@' | sudo -S -p '' ufw status"
        stdin, stdout, stderr = client.exec_command(sudo_cmd)
        print(stdout.read().decode(errors='replace'))

        # 5. Try curl localhost
        print("Curling localhost...")
        stdin, stdout, stderr = client.exec_command("curl -v http://127.0.0.1:4897/api/health")
        print(stdout.read().decode(errors='replace'))
        print(stderr.read().decode(errors='replace'))
        
        # 6. Attempt Fix: Create logs dir if missing
        print("Ensuring logs dir exists...")
        client.exec_command("mkdir -p ~/.nuxview/logs")
        
        # 7. Attempt Fix: Restart
        print("Restarting service...")
        client.exec_command("$HOME/.local/bin/nuxview stop")
        stdin, stdout, stderr = client.exec_command("$HOME/.local/bin/nuxview start --host 0.0.0.0")
        print(stdout.read().decode(errors='replace'))
        print(stderr.read().decode(errors='replace'))


    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    diagnose()
