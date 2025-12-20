import paramiko
import json

hostname = "192.168.1.3"
username = "ninja"
password = "Nvnaka7799@"

def test_node(path):
    print(f"Testing node scan for {path} on {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(hostname, username=username, password=password)
        
        # Curl command to hit local API on server
        cmd = f"curl -s -X POST http://localhost:4897/api/scan/node -H 'Content-Type: application/json' -d '{{\"path\": \"{path}\"}}'"
        stdin, stdout, stderr = client.exec_command(cmd)
        
        res_text = stdout.read().decode()
        if not res_text:
            print("No response from API.")
            return

        try:
            res_json = json.loads(res_text)
            print(json.dumps(res_json, indent=2))
            
            node = res_json.get("node")
            if node:
                children = node.get("children", [])
                print(f"\nFound {len(children)} children for {path}.")
                for child in children[:5]:
                    print(f"  - {child['name']} ({child['path']})")
                if len(children) > 5:
                    print("  - ...")
            else:
                print("\nNo node found in response.")
        except Exception as e:
            print(f"Failed to parse JSON: {res_text}")
            print(f"Error: {e}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    test_node("/etc")
    print("-" * 20)
    test_node("/home")
