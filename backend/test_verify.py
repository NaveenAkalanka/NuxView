import os
import sys

# Ensure we can import modules in current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from scanner import scan_directory
    print("Scanner module imported successfully.")
except ImportError as e:
    print(f"Import failed: {e}")
    sys.exit(1)

# Scan the parent directory (project root) but shallow
root_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
print(f"Scanning project root: {root_path}")

try:
    # Recursively scan
    node = scan_directory(root_path, max_depth=2, excludes=["node_modules", ".git", "webview"])
    
    if node:
        print(f"Root: {node.name} ({node.path})")
        print(f"Children count: {len(node.children) if node.children else 0}")
        if node.children:
            for child in node.children:
                print(f"  - {child.name}")
    else:
        print("Scan result is None (possibly excluded dict)")

except Exception as e:
    print(f"Scan failed: {e}")
