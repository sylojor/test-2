#!/usr/bin/env python3
"""Debug DNS resolution between containers."""
import paramiko

SERVER = "141.95.55.5"
USER = "ubuntu"
PASS = "Mghazi@199641"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(SERVER, username=USER, password=PASS, timeout=30)
print("Connected!")

def run(cmd, timeout=15):
    print(f">> {cmd[:150]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors='replace')
    err = stderr.read().decode(errors='replace')
    combined = (out + err).strip()
    if combined:
        for line in combined.split(chr(10))[-15:]:
            print(f"  {line}")
    return combined

print("=== DNS from Caddy container ===")
run("docker exec blivo-caddy nslookup demo-chatbot 2>&1 || docker exec blivo-caddy getent hosts demo-chatbot 2>&1")
run("docker exec blivo-caddy nslookup chatbot 2>&1 || docker exec blivo-caddy getent hosts chatbot 2>&1")

print("\n=== IP addresses ===")
run("docker inspect demo-chatbot --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}'")
run("docker inspect blivo-caddy --format '{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}'")

print("\n=== Try direct IP ===")
CHATBOT_IP = None
result = run("docker inspect demo-chatbot --format '{{(index .NetworkSettings.Networks \"new-blivo_proxy\").IPAddress}}'")
if result.strip():
    CHATBOT_IP = result.strip()
    print(f"  Chatbot IP on proxy network: {CHATBOT_IP}")
    # Update Caddyfile to use IP
    run(f"sed -i 's/reverse_proxy demo-chatbot:3001/reverse_proxy {CHATBOT_IP}:3001/' /home/ubuntu/new-blivo/Caddyfile")
    run("grep 'reverse_proxy' /home/ubuntu/new-blivo/Caddyfile")
    run("docker exec blivo-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
    import time
    time.sleep(3)
    run("curl -skL -o /dev/null -w 'HTTP:%{http_code}' https://blivoai.com/en")

ssh.close()
print("\nDone.")
