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
        combined = (out + err)[-2500:]
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
        print(f"Connecting... (attempt {i+1})")
        client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=15)
        print("Connected!")
        break
    except:
        time.sleep(3)
        if i == 2: sys.exit(1)

# Step 1: Create demo directory
print("\n=== Step 1: Create demo project directory ===")
run(client, "mkdir -p /home/blivoai-demo")

# Step 2: Clone the demo branch
print("\n=== Step 2: Clone redesigned project (demo branch) ===")
run(client, "cd /home/blivoai-demo && git init && git remote add origin https://sylojor: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@github.com/sylojor/new-blivo.git")
run(client, "cd /home/blivoai-demo && git fetch origin demo && git checkout -b demo origin/demo")

# Step 3: Create docker-compose for demo (port 3001)
print("\n=== Step 3: Create demo docker-compose.yml ===")

DEMO_COMPOSE = '''services:
  demo-chatbot:
    build: .
    container_name: demo-chatbot
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=file:/app/data/demo.db
      - NEXTAUTH_SECRET=demo-secret-change-in-production-xyz789
      - NEXTAUTH_URL=https://demo.blivoai.com
      - NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com
      - GROQ_API_KEY=${GROQ_API_KEY:-}
      - TOGETHER_API_KEY=${TOGETHER_API_KEY:-}
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

# Write docker-compose
stdin, stdout, stderr = client.exec_command(f"cat > /home/blivoai-demo/docker-compose.yml << 'EOF'\n{DEMO_COMPOSE}\nEOF")
stdout.read(); stderr.read()
print("docker-compose.yml written")

# Step 4: Create Caddyfile that routes demo.blivoai.com to port 3001
print("\n=== Step 4: Update main Caddyfile to separate routes ===")

CADDYFILE = '''blivoai.com {
	@dangerous {
		path /.env /.env.* /.git /.git/* /.aws /.aws/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /config.php /phpmyadmin /phpmyadmin/* /vendor /vendor/* /sites/default/settings.php /app/etc/env.php
	}
	respond @dangerous 403

	@configscan {
		path /docker-compose.yml /docker-compose.yaml /docker-compose.prod.yml /package.json /bun.lock /.env.save /.env.backup
	}
	respond @configscan 403

	@badbot {
		header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
	}
	respond @badbot 403

	reverse_proxy chatbot:3000 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_down -x-powered-by
		header_down -Server
	}
}

demo.blivoai.com {
	@dangerous {
		path /.env /.env.* /.git /.git/* /.aws /.aws/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /config.php /phpmyadmin /phpmyadmin/* /vendor /vendor/* /sites/default/settings.php /app/etc/env.php
	}
	respond @dangerous 403

	@badbot {
		header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
	}
	respond @badbot 403

	reverse_proxy host.docker.internal:3001 {
		header_up Host {host}
		header_up X-Real-IP {remote_host}
		header_down -x-powered-by
		header_down -Server
	}
}'''

stdin, stdout, stderr = client.exec_command(f"cat > /home/blivoai/Caddyfile << 'EOF'\n{CADDYFILE}\nEOF")
stdout.read(); stderr.read()
print("Main Caddyfile updated")

# Step 5: Copy env vars from main project for API keys
print("\n=== Step 5: Create .env for demo ===")
# Get the API keys from the main project
out, _, _ = run(client, "grep -E 'GROQ_API_KEY|TOGETHER_API_KEY|NEXTAUTH_SECRET|RESEND_API_KEY|STRIPE_SECRET_KEY|STRIPE_PUBLISHABLE_KEY' /home/blivoai/.env")

# Create .env for demo with the same API keys
run(client, "cp /home/blivoai/.env /home/blivoai-demo/.env")
# Change DATABASE_URL to SQLite for demo (simpler setup)
run(client, "cd /home/blivoai-demo && sed -i 's|DATABASE_URL=.*|DATABASE_URL=file:/app/data/demo.db|' .env")
# Change NEXTAUTH_URL
run(client, "cd /home/blivoai-demo && sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://demo.blivoai.com|' .env")
# Remove postgres-related vars since demo uses SQLite
run(client, "cd /home/blivoai-demo && sed -i '/POSTGRES_/d' .env")
# Verify
run(client, "head -5 /home/blivoai-demo/.env")

# Step 6: Build demo container (this takes time)
print("\n=== Step 6: Building demo container (5-10 min) ===")
run(client, "cd /home/blivoai-demo && docker compose build --no-cache demo-chatbot", timeout=600)

# Step 7: Start demo container
print("\n=== Step 7: Starting demo container ===")
run(client, "cd /home/blivoai-demo && docker compose up -d")

# Step 8: Restart Caddy with new config
print("\n=== Step 8: Restarting Caddy ===")
run(client, "cd /home/blivoai && docker compose restart caddy")

# Wait
time.sleep(20)

# Step 9: Verify
print("\n=== Step 9: Verifying ===")
run(client, "docker ps")
run(client, "docker logs demo-chatbot --tail 20 2>&1")
run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ && echo '' || echo 'FAIL'")
run(client, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com && echo '' || echo 'FAIL'")
run(client, "curl -s -o /dev/null -w '%{http_code}' https://blivoai.com && echo '' || echo 'FAIL'")

client.close()
print("\nDONE!")
