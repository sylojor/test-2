import paramiko
import time
import sys

def run(client, cmd, timeout=600):
    print(f"\n>>> {cmd}")
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        rc = stdout.channel.recv_exit_status()
        combined = (out + err)[-2500:]
        if combined: print(combined)
        print(f"[RC={rc}]")
        return out, err, rc
    except Exception as e:
        print(f"ERR: {e}")
        return "", str(e), -1

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

for i in range(8):
    try:
        print(f"Connecting... ({i+1})")
        client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=20, banner_timeout=30)
        print("Connected!")
        break
    except Exception as e:
        print(f"Fail: {e}")
        time.sleep(8)

DEMO_DIR = "/home/ubuntu/blivoai-demo"

# Step 1: Pull updated code
print("\n=== Pull updated code ===")
run(client, f"cd {DEMO_DIR} && git fetch origin demo && git reset --hard origin/demo")

# Step 2: Stop old demo container
print("\n=== Stop old demo container ===")
run(client, f"cd {DEMO_DIR} && docker compose down")
run(client, "docker rm -f demo-chatbot 2>/dev/null || true")

# Step 3: Rebuild with fixed Dockerfile
print("\n=== Rebuild demo container ===")
run(client, f"cd {DEMO_DIR} && docker compose build --no-cache demo-chatbot", timeout=600)

# Step 4: Start demo container
print("\n=== Start demo container ===")
run(client, f"cd {DEMO_DIR} && docker compose up -d")

# Step 5: Connect demo to main Caddy network
print("\n=== Connect to Caddy network ===")
time.sleep(10)
run(client, "docker network connect blivoai_default demo-chatbot 2>/dev/null || echo 'checking networks...'")

# Get demo container IP on main network
run(client, "docker inspect demo-chatbot --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null")

# Step 6: Restart Caddy
print("\n=== Restart Caddy ===")
run(client, "cd /home/blivoai && docker compose restart caddy")

# Wait
time.sleep(30)

# Step 7: Verify
print("\n=== Verify ===")
run(client, "docker ps")
run(client, "docker logs demo-chatbot --tail 30 2>&1")
run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ && echo '' || echo 'FAIL'")
run(client, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com && echo '' || echo 'FAIL'")
run(client, "curl -s -o /dev/null -w '%{http_code}' https://blivoai.com && echo '' || echo 'FAIL'")

client.close()
print("\nDONE!")
