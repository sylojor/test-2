import paramiko
import time
import sys

def run(client, cmd, timeout=300):
    print(f"\n>>> {cmd}")
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        rc = stdout.channel.recv_exit_status()
        combined = (out + err)[-3000:]
        if combined: print(combined)
        print(f"[RC={rc}]")
        return out, err, rc
    except Exception as e:
        print(f"ERR: {e}")
        return "", str(e), -1

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

for i in range(3):
    try:
        print(f"Connecting... ({i+1})")
        client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=15)
        print("Connected!")
        break
    except:
        time.sleep(3)
        if i == 2: sys.exit(1)

# Use the ubuntu home directory where we have write permissions
DEMO_DIR = "/home/ubuntu/blivoai-demo"

# Step 1: Create demo directory with proper permissions
print("\n=== Step 1: Create demo dir ===")
run(client, f"mkdir -p {DEMO_DIR}")

# Step 2: Clone demo branch
print("\n=== Step 2: Clone demo branch ===")
run(client, f"cd {DEMO_DIR} && git init && git remote add origin https://sylojor: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@github.com/sylojor/new-blivo.git")
run(client, f"cd {DEMO_DIR} && git fetch origin demo && git reset --hard origin/demo")

# Step 3: Create docker-compose for demo (port 3001 on host = 3000 in container)
print("\n=== Step 3: Create docker-compose.yml ===")

DEMO_COMPOSE = '''services:
  demo-chatbot:
    build: .
    container_name: demo-chatbot
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=file:/app/data/demo.db
      - NEXTAUTH_SECRET=demo-secret-BlivoAI2024xyz789abc
      - NEXTAUTH_URL=https://demo.blivoai.com
      - NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com
      - GROQ_API_KEY=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
      - TOGETHER_API_KEY=tgp_v1_RN43bpeWJ_7xfRVez-in0FSDviwfxHzH_CFQDQL76dw
      - RESEND_API_KEY=re_D5EeMxtR_EbKuGxNfJ6CLDmFXNRmT5sFR
    volumes:
      - demo-data:/app/data
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3000').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

volumes:
  demo-data:
'''

stdin, stdout, stderr = client.exec_command(f"cat > {DEMO_DIR}/docker-compose.yml << 'DEMOEOF'\n{DEMO_COMPOSE}\nDEMOEOF")
stdout.read(); stderr.read()
print("docker-compose.yml written")

# Step 4: Update main Caddyfile to route demo to port 3001
print("\n=== Step 4: Update Caddyfile ===")

# The demo container will be on host port 3001
# Caddy needs to proxy demo.blivoai.com to host.docker.internal:3001
# Or we can add the demo container to the same docker network

# First check current Caddyfile
run(client, "cat /home/blivoai/Caddyfile")

# Update Caddyfile - add demo.blivoai.com route
CADDYFILE = '''blivoai.com {
	@dangerous path /.env /.env.* /.git /.git/* /.ssh /.ssh/* /wp-admin /wp-login.php /xmlrpc.php /config.php /phpmyadmin /vendor /docker-compose.yml /package.json
	respond @dangerous 403

	reverse_proxy chatbot:3000 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_down -x-powered-by
		header_down -Server
	}
}

demo.blivoai.com {
	@dangerous path /.env /.env.* /.git /.git/* /.ssh /.ssh/* /wp-admin /wp-login.php /config.php /phpmyadmin /vendor /docker-compose.yml /package.json
	respond @dangerous 403

	reverse_proxy demo-chatbot:3000 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_down -x-powered-by
		header_down -Server
	}
}'''

stdin, stdout, stderr = client.exec_command(f"cat > /home/blivoai/Caddyfile << 'CADDYEOF'\n{CADDYFILE}\nCADDYEOF")
stdout.read(); stderr.read()
print("Caddyfile updated")

# Step 5: Build demo container
print("\n=== Step 5: Build demo container (5-10 min) ===")
run(client, f"cd {DEMO_DIR} && docker compose build --no-cache demo-chatbot", timeout=600)

# Step 6: Connect demo container to main network so Caddy can reach it
print("\n=== Step 6: Start demo + connect to main network ===")
run(client, f"cd {DEMO_DIR} && docker compose up -d")

# Get the main network name
out, _, _ = run(client, "docker network ls | grep blivoai")

# Connect demo container to the blivoai_default network so Caddy can proxy to it
run(client, "docker network connect blivoai_default demo-chatbot 2>/dev/null || echo 'already connected'")

# Restart Caddy with new config
run(client, "cd /home/blivoai && docker compose restart caddy")

# Wait for startup
time.sleep(25)

# Step 7: Verify
print("\n=== Step 7: Verify ===")
run(client, "docker ps")
run(client, "docker logs demo-chatbot --tail 20 2>&1")
run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ && echo '' || echo 'FAIL'")
run(client, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com && echo '' || echo 'FAIL'")
run(client, "curl -s -o /dev/null -w '%{http_code}' https://blivoai.com && echo '' || echo 'FAIL'")

client.close()
print("\nDONE!")
