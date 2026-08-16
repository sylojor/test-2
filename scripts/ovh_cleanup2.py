import paramiko

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASS, timeout=15)
    
    # Remove demo directory with sudo
    print("Removing demo directory with sudo...")
    stdin, stdout, stderr = ssh.exec_command("sudo rm -rf /home/blivoai/demo", timeout=15)
    stdin.write(PASS + "\n")
    stdin.flush()
    output = stdout.read().decode('utf-8').strip()
    print(f"Result: {output[:200]}")
    
    # Verify
    stdin, stdout, stderr = ssh.exec_command("ls /home/blivoai/demo 2>&1 || echo 'DEMO REMOVED ✅'", timeout=10)
    output = stdout.read().decode('utf-8').strip()
    print(f"Check: {output}")
    
    # Remove nginx with sudo
    print("\nRemoving nginx with sudo...")
    stdin, stdout, stderr = ssh.exec_command("sudo systemctl stop nginx && sudo systemctl disable nginx && sudo apt remove -y nginx nginx-common nginx-core 2>&1 | tail -5", timeout=60)
    stdin.write(PASS + "\n")
    stdin.flush()
    output = stdout.read().decode('utf-8').strip()
    print(f"Result: {output[:300]}")
    
    # Check nginx gone
    stdin, stdout, stderr = ssh.exec_command("which nginx 2>/dev/null || echo 'NGINX REMOVED ✅'", timeout=10)
    output = stdout.read().decode('utf-8').strip()
    print(f"Nginx: {output}")
    
    # Remove unused Docker volumes
    print("\nCleaning unused Docker volumes...")
    stdin, stdout, stderr = ssh.exec_command("docker volume prune -f 2>&1", timeout=30)
    output = stdout.read().decode('utf-8').strip()
    print(f"Result: {output}")
    
    # Remove unused networks
    print("\nCleaning unused Docker networks...")
    stdin, stdout, stderr = ssh.exec_command("docker network prune -f 2>&1", timeout=30)
    output = stdout.read().decode('utf-8').strip()
    print(f"Result: {output}")
    
    # Final check - disk and running services
    print("\n=== FINAL STATUS ===")
    stdin, stdout, stderr = ssh.exec_command("df -h / && echo '---' && docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' && echo '---' && free -h && echo '---' && ss -tlnp | grep -E '3000|3001|80|443'", timeout=15)
    output = stdout.read().decode('utf-8').strip()
    print(output)

except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()

