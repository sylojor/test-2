import paramiko
import time

def run(client, cmd, timeout=600):
    print(f"\n>>> {cmd[:100]}...")
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        rc = stdout.channel.recv_exit_status()
        combined = (out + err)[-2000:]
        if combined: print(combined)
        print(f"[RC={rc}]")
        return out, err, rc
    except Exception as e:
        print(f"ERR: {e}")
        return "", str(e), -1

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

for i in range(10):
    try:
        print(f"Connecting... ({i+1})")
        client.connect('141.95.55.5', port=22, username='ubuntu', password='Mghazi@199641', timeout=20, banner_timeout=30)
        print("Connected!")
        break
    except:
        time.sleep(8)

DEMO = "/home/ubuntu/blivoai-demo"

# Pull latest code but keep our custom docker-compose.yml and .env
# Strategy: pull code, then overwrite docker-compose.yml and .env

print("\n=== Step 1: Pull latest code ===")
run(client, f"cd {DEMO} && git fetch origin demo && git reset --hard origin/demo")

print("\n=== Step 2: Write custom docker-compose.yml for demo ===")
DEMO_COMPOSE = """services:
  demo-chatbot:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: demo-chatbot
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=file:/app/data/demo.db
      - NEXTAUTH_SECRET=demo-secret-BlivoAI2024xyz789abc
      - NEXTAUTH_URL=https://demo.blivoai.com
      - NEXT_PUBLIC_SITE_URL=https://demo.blivoai.com
      - NODE_ENV=production
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
"""

stdin, stdout, stderr = client.exec_command(f"cat > {DEMO}/docker-compose.yml << 'COMPOSEEOF'\n{DEMO_COMPOSE}\nCOMPOSEEOF")
stdout.read(); stderr.read()
print("docker-compose.yml written")

# Verify
run(client, f"cat {DEMO}/docker-compose.yml")

print("\n=== Step 3: Build demo container ===")
out, err, rc = run(client, f"cd {DEMO} && docker compose build --no-cache demo-chatbot", timeout=600)

if rc == 0:
    print("BUILD SUCCESS!")
else:
    print(f"BUILD FAILED! RC={rc}")
    print(f"Error: {err[-500:]}")

# Start
print("\n=== Step 4: Start demo ===")
run(client, f"cd {DEMO} && docker compose up -d")

# Connect to Caddy network
time.sleep(15)
run(client, "docker network connect blivoai_default demo-chatbot 2>&1 || echo 'already connected'")

# Restart Caddy  
run(client, "cd /home/blivoai && docker compose restart caddy")

time.sleep(25)

print("\n=== Step 5: Verify ===")
run(client, "docker ps")
run(client, "docker logs demo-chatbot --tail 20 2>&1")
run(client, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/ && echo '' || echo 'FAIL'")
run(client, "curl -s -o /dev/null -w '%{http_code}' https://blivoai.com && echo '' || echo 'FAIL'")

# Final check: demo.blivoai.com
print("\nExternal demo check:")
run(client, "curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com && echo '' || echo 'FAIL'")

client.close()
print("\nDONE!")
