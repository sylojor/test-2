import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASS, timeout=15)
    
    print("=" * 50)
    print("  STEP 1: STOPPING & REMOVING DEMO")
    print("=" * 50)
    
    # Stop demo containers
    cmds = [
        # Stop demo docker compose
        "cd /home/blivoai/demo && docker compose down --remove-orphans 2>&1",
        # Remove demo containers
        "docker rm -f blivoai-demo-chatbot 2>&1 || echo 'no demo container'",
        # Remove demo images
        "docker rmi demo-chatbot-demo 2>&1 || echo 'no demo image'",
        # Remove demo volumes
        "docker volume rm demo_chatbot-data demo_demo-chatbot-data demo_demo-data demo_caddy-config demo_caddy-data 2>&1 || echo 'some volumes already removed'",
        # Remove demo networks
        "docker network rm demo_default 2>&1 || echo 'network already removed'",
        # Delete demo directory
        "rm -rf /home/blivoai/demo",
        # Also remove old blivoai demo volumes
        "docker volume rm blivoai_demo-chatbot-data 2>&1 || echo 'already removed'",
        # Verify demo is gone
        "docker ps --format '{{.Names}}' | grep -i demo || echo 'NO demo containers running'",
    ]
    
    for cmd in cmds:
        print(f"\n> {cmd.split('&&')[0] if '&&' in cmd else cmd[:60]}...")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        result = output or error or "OK"
        print(f"  {result[:200]}")
    
    print("\n" + "=" * 50)
    print("  STEP 2: CLEANING DOCKER BUILD CACHE")
    print("=" * 50)
    
    # Clean Docker build cache (32GB reclaimable!)
    cmds2 = [
        "docker builder prune -af --verbose 2>&1 | tail -5",
        "docker system prune -f 2>&1 | tail -3",
        # Remove dangling images
        "docker image prune -af 2>&1 | tail -3",
    ]
    
    for cmd in cmds2:
        print(f"\n> {cmd[:60]}...")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=120)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        result = output or error or "OK"
        print(f"  {result[:300]}")
    
    print("\n" + "=" * 50)
    print("  STEP 3: CHECK RESULTS")
    print("=" * 50)
    
    cmds3 = [
        # Check disk after cleanup
        "df -h /",
        # Check docker disk usage
        "docker system df",
        # Check running containers
        "docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}'",
        # Check ports listening
        "ss -tlnp | grep -E '3000|3001|3002|80|443'",
        # Check demo dir removed
        "ls /home/blivoai/demo 2>&1 || echo 'DEMO DIR REMOVED ✅'",
    ]
    
    for cmd in cmds3:
        print(f"\n> {cmd[:60]}...")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
        output = stdout.read().decode('utf-8').strip()
        print(f"  {output[:300]}")
    
    # Also remove old nginx default site (not needed since Caddy handles everything)
    print("\n" + "=" * 50)
    print("  STEP 4: REMOVE NGINX (CADDY REPLACES IT)")
    print("=" * 50)
    
    cmds4 = [
        "systemctl stop nginx 2>&1 || echo 'nginx not running'",
        "systemctl disable nginx 2>&1 || echo 'nginx not enabled'",
        "apt remove -y nginx nginx-common 2>&1 | tail -5 || echo 'nginx removal skipped'",
        # Verify nginx gone
        "which nginx 2>/dev/null || echo 'NGINX REMOVED ✅'",
    ]
    
    for cmd in cmds4:
        print(f"\n> {cmd[:60]}...")
        stdin, stdout, stderr = ssh.exec_command(cmd, timeout=30)
        output = stdout.read().decode('utf-8').strip()
        error = stderr.read().decode('utf-8').strip()
        result = output or error or "OK"
        print(f"  {result[:200]}")

except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
    print("\n\nDONE! Server cleaned up ✅")

