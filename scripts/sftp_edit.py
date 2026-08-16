#!/usr/bin/env python3
"""
SFTP Download/Edit/Upload tool for remote server files.
Downloads a file, applies edits, uploads back.
Uses absolute paths (~/blivoai-demo = /home/ubuntu/blivoai-demo)
"""

import paramiko
import sys
import os

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"
remote_base = "/home/ubuntu/blivoai-demo"

def get_sftp():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=username, password=password)
    sftp = client.open_sftp()
    return client, sftp

def download_file(remote_path: str, local_path: str):
    """Download a file from remote server via SFTP"""
    client, sftp = get_sftp()
    
    # Use absolute path
    if not remote_path.startswith("/"):
        remote_path = remote_base + "/" + remote_path
    
    sftp.get(remote_path, local_path)
    sftp.close()
    client.close()
    print(f"Downloaded: {remote_path} -> {local_path}")

def upload_file(local_path: str, remote_path: str):
    """Upload a file to remote server via SFTP"""
    client, sftp = get_sftp()
    
    # Use absolute path
    if not remote_path.startswith("/"):
        remote_path = remote_base + "/" + remote_path
    
    sftp.put(local_path, remote_path)
    sftp.close()
    client.close()
    print(f"Uploaded: {local_path} -> {remote_path}")

def read_remote_file(remote_path: str) -> str:
    """Read a remote file and return its contents"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=username, password=password)
    
    if not remote_path.startswith("/"):
        remote_path = remote_base + "/" + remote_path
    
    stdin, stdout, stderr = client.exec_command(f"cat '{remote_path}'")
    content = stdout.read().decode()
    err = stderr.read().decode()
    if err and "No such file" not in err:
        print(f"STDERR: {err}")
    client.close()
    return content

def write_remote_file(remote_path: str, content: str):
    """Write content directly to a remote file using SFTP"""
    client, sftp = get_sftp()
    
    # Use absolute path
    if not remote_path.startswith("/"):
        remote_path = remote_base + "/" + remote_path
    
    with sftp.open(remote_path, 'w') as f:
        f.write(content)
    sftp.close()
    client.close()
    print(f"Written: {remote_path} ({len(content)} bytes)")

if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "help"
    
    if action == "download":
        remote_path = sys.argv[2]
        local_path = sys.argv[3]
        download_file(remote_path, local_path)
    elif action == "upload":
        local_path = sys.argv[2]
        remote_path = sys.argv[3]
        upload_file(local_path, remote_path)
    elif action == "read":
        remote_path = sys.argv[2]
        content = read_remote_file(remote_path)
        print(content)
    elif action == "write":
        remote_path = sys.argv[2]
        content_file = sys.argv[3]
        with open(content_file, 'r') as f:
            content = f.read()
        write_remote_file(remote_path, content)
    else:
        print("Usage: sftp_edit.py [download|upload|read|write] <args>")
        print("  download <remote_path> <local_path>")
        print("  upload <local_path> <remote_path>")
        print("  read <remote_path>")
        print("  write <remote_path> <local_content_file>")
