import paramiko
import json

HOST = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, username=USER, password=PASS, timeout=15)
    
    commands = {
        "system_info": "uname -a && cat /etc/os-release | head -5",
        "cpu_info": "lscpu | grep -E 'CPU\(s\)|Model name|Architecture'",
        "ram_total": "free -h",
        "disk_usage": "df -h / && df -h /home",
        "docker_ps": "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}'",
        "docker_stats": "docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'",
        "docker_compose": "docker compose ls",
        "docker_volumes": "docker volume ls",
        "running_services": "systemctl list-units --type=service --state=running | head -20",
        "ports_listening": "ss -tlnp | grep -v '127.0.0'",
        "caddy_config": "cat /home/blivoai/Caddyfile 2>/dev/null || cat /etc/caddy/Caddyfile 2>/dev/null || echo 'No Caddyfile found'",
        "blivoai_dir": "ls -la /home/blivoai/ 2>/dev/null || ls -la /opt/blivoai/ 2>/dev/null || echo 'No blivoai dir found'",
        "env_file": "cat /home/blivoai/.env 2>/dev/null | grep -v 'KEY\|SECRET\|PASSWORD' | head -20 || echo 'No .env found'",
        "memory_detail": "cat /proc/meminfo | head -10",
        "load_avg": "cat /proc/loadavg",
        "uptime": "uptime",
        "docker_images": "docker images --format 'table {{.Repository}}\t{{.Tag}}\t{{.Size}}'",
        "network_connections": "ss -s",
        "firewall": "ufw status 2>/dev/null || iptables -L -n 2>/dev/null | head -20",
        "nginx_check": "which nginx 2>/dev/null || echo 'No nginx'",
        "node_version": "which node 2>/dev/null && node -v 2>/dev/null || echo 'No node'",
        "git_repos": "ls -la /home/blivoai/.git 2>/dev/null && git -C /home/blivoai remote -v 2>/dev/null || echo 'No git repo'",
    }
    
    results = {}
    for name, cmd in commands.items():
        try:
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=10)
            output = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            results[name] = output if output else (error if error else "empty")
        except Exception as e:
            results[name] = f"Error: {str(e)}"
    
    # Print results nicely
    for name, result in results.items():
        print(f"\n{'='*50}")
        print(f"  {name.upper()}")
        print(f"{'='*50}")
        print(result)
    
    # Save to JSON
    with open('/home/z/my-project/scripts/ovh_server_state.json', 'w') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

except Exception as e:
    print(f"Connection error: {e}")
finally:
    ssh.close()

