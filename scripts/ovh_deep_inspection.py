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
        "docker_compose_yml": "cat /home/blivoai/docker-compose.yml",
        "docker_compose_demo": "cat /home/blivoai/demo/docker-compose.yml 2>/dev/null || echo 'no demo compose'",
        "prisma_schema": "cat /home/blivoai/prisma/schema.prisma",
        "nginx_config": "cat /etc/nginx/nginx.conf 2>/dev/null || echo 'no nginx.conf'",
        "nginx_sites": "ls /etc/nginx/sites-enabled/ 2>/dev/null && cat /etc/nginx/sites-enabled/* 2>/dev/null || echo 'no sites'",
        "ufw_rules": "ufw status verbose 2>/dev/null || echo 'no ufw'",
        "iptables_rules": "iptables -L INPUT -n 2>/dev/null | head -20 || echo 'no iptables'",
        "docker_logs_chatbot": "docker logs 7205cc6ada4d_blivoai-chatbot --tail 20 2>&1",
        "docker_logs_caddy": "docker logs blivoai-caddy --tail 20 2>&1",
        "postgres_data_size": "docker exec blivoai-postgres du -sh /var/lib/postgresql/data 2>/dev/null || echo 'cant check pg size'",
        "postgres_db_size": "docker exec blivoai-postgres psql -U blivoai -d blivoai -c \"SELECT pg_database_size('blivoai');\" 2>/dev/null || echo 'cant query pg'",
        "postgres_tables": "docker exec blivoai-postgres psql -U blivoai -d blivoai -c \"\\dt\" 2>/dev/null || echo 'cant list tables'",
        "postgres_user_count": "docker exec blivoai-postgres psql -U blivoai -d blivoai -c \"SELECT COUNT(*) FROM \\\"User\\\";\" 2>/dev/null || echo 'cant count users'",
        "postgres_conversation_count": "docker exec blivoai-postgres psql -U blivoai -d blivoai -c \"SELECT COUNT(*) FROM \\\"Conversation\\\";\" 2>/dev/null || echo 'cant count'",
        "caddy_running_config": "curl -s localhost:2019/config/ 2>/dev/null | python3 -m json.tool 2>/dev/null || echo 'cant get caddy config'",
        "docker_networks": "docker network ls",
        "docker_compose_env": "cat /home/blivoai/.env",
        "swap_status": "swapon --show 2>/dev/null || echo 'no swap'",
        "big_files": "du -sh /home/blivoai/* 2>/dev/null | sort -rh | head -15",
        "disk_inodes": "df -i /",
        "docker_disk_usage": "docker system df",
        "process_memory": "ps aux --sort=-%mem | head -10",
        "fail2ban_status": "fail2ban-client status 2>/dev/null || echo 'no fail2ban'",
    }
    
    results = {}
    for name, cmd in commands.items():
        try:
            stdin, stdout, stderr = ssh.exec_command(cmd, timeout=15)
            output = stdout.read().decode('utf-8').strip()
            error = stderr.read().decode('utf-8').strip()
            results[name] = output if output else (error if error else "empty")
        except Exception as e:
            results[name] = f"Error: {str(e)}"
    
    for name, result in results.items():
        print(f"\n{'='*50}")
        print(f"  {name.upper()}")
        print(f"{'='*50}")
        # Limit output length
        if len(result) > 2000:
            print(result[:2000] + "... (truncated)")
        else:
            print(result)

    with open('/home/z/my-project/scripts/ovh_deep_state.json', 'w') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

except Exception as e:
    print(f"Connection error: {e}")
finally:
    ssh.close()

