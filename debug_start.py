import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.2"
username = "ninja"
password = "Nvnaka7799@"

def debug():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # 1. Ensure logs dir exists
        print("Ensuring logs dir...")
        client.exec_command("mkdir -p ~/.nuxview/logs")
        
        # 2. Check the command that fails
        print("Checking venv python...")
        stdin, stdout, stderr = client.exec_command("~/.nuxview/venv/bin/python --version")
        print("Python:", stdout.read().decode().strip() or stderr.read().decode().strip())

        # 3. Try to start in foreground for 5 seconds to catch errors
        print("Starting in FOREGROUND to catch errors...")
        # Note: We need to use full path to the app
        cmd = "export PYTHONPATH=$HOME/.nuxview/app/backend:$PYTHONPATH && ~/.nuxview/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 4897 --app-dir ~/.nuxview/app/backend"
        
        stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
        
        # Wait a bit
        try:
            print("STDOUT (First 10 lines):")
            for _ in range(10):
                line = stdout.readline()
                if not line: break
                print(line.strip())
            
            print("STDERR:")
            print(stderr.read().decode(errors='replace'))
        except Exception as e:
            print(f"Captured output or timed out: {e}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    debug()
