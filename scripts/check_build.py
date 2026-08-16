#!/usr/bin/env python3
"""Check build progress and final status."""
import paramiko
import time

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
print("Connected!")

def run(cmd, timeout=30):
    print(f">> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-10:]:
            print(f"   {line}")
    return combined

# Check build progress multiple times
for i in range(12):  # 12 * 30s = 6 minutes max
    print(f"\n=== Check {i+1}/12 ({(i+1)*30}s) ===")
    
    # Check if build process is still running
    result = run("pgrep -f 'build_app.sh' | wc -l")
    if '0' in result.strip():
        print("   Build process finished!")
        break
    
    # Show build log tail
    run("tail -3 /tmp/build3.log 2>/dev/null")
    time.sleep(30)

# Final status
print("\n=== FINAL STATUS ===")
run("tail -20 /tmp/build3.log 2>/dev/null")
run("docker ps --format 'table {{.Names}}\t{{.Status}}' | grep blivo")
run("curl -s -o /dev/null -w 'HTTP:%{{http_code}}' http://localhost:3000")

# Check env vars in container
print("\n=== Container env check ===")
run("docker exec blivo-app printenv LLM_API_KEY 2>/dev/null | head -c 30")
run("docker exec blivo-app printenv LLM_PROVIDER 2>/dev/null")

ssh.close()
print("\nDone.")
