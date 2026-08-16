#!/usr/bin/env python3
"""Deploy a single file to the BlivoAI server via base64 encoding"""
import subprocess
import sys
import base64
import os

SSH_CMD = "/home/z/my-project/scripts/ssh_cmd.py"

def deploy_file(remote_path, local_content_file=None, inline_content=None):
    """Deploy file content to remote server"""
    if local_content_file:
        with open(local_content_file, 'r') as f:
            content = f.read()
    elif inline_content:
        content = inline_content
    else:
        print("No content provided!")
        return False
    
    encoded = base64.b64encode(content.encode('utf-8')).decode('ascii')
    cmd = f'echo "{encoded}" | base64 -d > {remote_path}'
    result = subprocess.run(
        f'python3 {SSH_CMD} "{cmd}"',
        shell=True, capture_output=True, text=True, timeout=60
    )
    
    if result.returncode != 0:
        print(f"ERROR deploying {remote_path}: {result.stderr}")
        return False
    print(f"  ✓ Deployed {remote_path} ({len(content)} bytes)")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python deploy_file.py <remote_path> <local_file>")
        sys.exit(1)
    
    remote_path = sys.argv[1]
    local_file = sys.argv[2]
    success = deploy_file(remote_path, local_content_file=local_file)
    sys.exit(0 if success else 1)
