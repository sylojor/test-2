#!/usr/bin/env python3
"""Run a command on the remote server via SSH (paramiko)"""

import paramiko
import sys

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

def run_command(cmd: str, timeout: int = 300):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port=22, username=username, password=password)
    
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    exit_code = stdout.channel.recv_exit_status()
    client.close()
    
    if out:
        print(out)
    if err:
        print(f"[STDERR]: {err}")
    print(f"[EXIT CODE]: {exit_code}")
    return exit_code, out, err

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "echo 'No command specified'"
    timeout = int(sys.argv[2]) if len(sys.argv) > 2 else 300
    run_command(cmd, timeout)
