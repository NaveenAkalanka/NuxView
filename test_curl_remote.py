import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

hostname = "192.168.1.3"
username = "ninja"
password = "Nvnaka7799@"

def test_curl():
    print(f"Connecting to {username}@{hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        print("Connected.")
        
        # Test local curl
        print("--- Testing Curl Root ---")
        stdin, stdout, stderr = client.exec_command("curl --max-time 5 -v http://127.0.0.1:4897/")
        # We need to wait for it or use communicating wait
        exit_status = stdout.channel.recv_exit_status()
        print("Exit Status:", exit_status)
        print("STDOUT:")
        print(stdout.read().decode(errors='replace'))
        print("STDERR:")
        print(stderr.read().decode(errors='replace'))

        # Test local curl API
        print("--- Testing Curl API Health ---")
        stdin, stdout, stderr = client.exec_command("curl --max-time 5 -v http://127.0.0.1:4897/api/health")
        stdout.channel.recv_exit_status()
        print("STDOUT:")
        print(stdout.read().decode(errors='replace'))
        print("STDERR:")
        print(stderr.read().decode(errors='replace'))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    test_curl()
