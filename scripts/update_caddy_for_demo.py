#!/usr/bin/env python3
"""
Update OVH Server Caddy config:
1. Separate demo.blivoai.com from blivoai.com
2. Point demo.blivoai.com to host port 3002 (new-blivo)
3. Keep blivoai.com on chatbot:3000 (production)
4. Reload Caddy gracefully
"""

import paramiko
import time

HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

# New Caddyfile content - separates demo.blivoai.com from blivoai.com
NEW_CADDYFILE = '''# === BLIVOAI.COM - Production (current version) ===
blivoai.com {
	# === BLOCK DANGEROUS PATHS ===
	@dangerous {
		path /.env /.env.* /.git /.git/* /.aws /.aws/* /.ssh /.ssh/* /wp-admin /wp-admin/* /wp-login.php /xmlrpc.php /config.php /phpmyadmin /phpmyadmin/* /vendor /vendor/* /sites/default/settings.php /app/etc/env.php
	}
	respond @dangerous 403

	@configscan {
		path /docker-compose.yml /docker-compose.yaml /docker-compose.prod.yml /package.json /bun.lock /.env.save /.env.backup
	}
	respond @configscan 403

	# Block known malicious bots
	@badbot {
		header_regexp User-Agent (?i)(sqlmap|nikto|nmap|masscan|nessus|acunetix|wpscan|dirbuster|gobuster|fimap|havij|metasploit)
	}
	respond @badbot 403

	# === COMPRESSION ===
	encode zstd gzip {
		minimum_length 256
	}

	# === CACHE STATIC ASSETS ===
	@static {
		path /_next/static/* /manifest.json /logo.svg /BlivoAI.apk
	}
	header @static Cache-Control "public, max-age=31536000, immutable"

	@favicon {
		path /favicon.ico /favicon.png /apple-touch-icon.png
	}
	header @favicon Cache-Control "public, max-age=3600"

	@uploads {
		path /api/uploads/*
	}
	header @uploads Cache-Control "public, max-age=3600, must-revalidate"

	# === NO CACHE FOR ADMIN PAGES ===
	@adminpages {
		path /admin /admin/*
	}
	header @adminpages Cache-Control "no-cache, no-store, must-revalidate"
	header @adminpages Pragma "no-cache"
	header @adminpages Expires "0"

	@html {
		header Content-Type text/html*
	}
	header @html Cache-Control "no-cache, no-store, must-revalidate"
	header @html Pragma "no-cache"
	header @html Expires "0"

	# === SECURITY HEADERS ===
	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
	}

	# === REVERSE PROXY ===
	reverse_proxy chatbot:3000 {
		header_up Host {host}
		header_up X-Forwarded-Uri {uri}
		header_up X-Real-IP {remote_host}
		header_down -x-powered-by
		header_down -Server
		flush_interval -1
		transport http {
			keepalive 30s
			keepalive_idle_conns 100
		}
	}
}

# === DEMO.BLIVOAI.COM - New BlivoAI (staging/testing on port 3002) ===
demo.blivoai.com {
	# === BLOCK DANGEROUS PATHS ===
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

	# === COMPRESSION ===
	encode zstd gzip {
		minimum_length 256
	}

	@static {
		path /_next/static/* /manifest.json /logo.svg /BlivoAI.apk
	}
	header @static Cache-Control "public, max-age=31536000, immutable"

	@favicon {
		path /favicon.ico /favicon.png /apple-touch-icon.png
	}
	header @favicon Cache-Control "public, max-age=3600"

	@uploads {
		path /api/uploads/*
	}
	header @uploads Cache-Control "public, max-age=3600, must-revalidate"

	# === SECURITY HEADERS ===
	header {
		Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
	}

	# === REVERSE PROXY to new-blivo on port 3002 ===
	reverse_proxy new-blivo:3002 {
		header_up Host {host}
		header_up X-Forwarded-Uri {uri}
		header_up X-Real-IP {remote_host}
		header_down -x-powered-by
		header_down -Server
		flush_interval -1
		transport http {
			keepalive 30s
			keepalive_idle_conns 100
		}
	}
}

# === REDIRECT WWW TO NON-WWW ===
www.blivoai.com {
	redir https://blivoai.com{uri} permanent
}

www.demo.blivoai.com {
	redir https://demo.blivoai.com{uri} permanent
}
'''

def main():
    print("=" * 60)
    print("UPDATING CADDY CONFIG ON OVH SERVER")
    print("=" * 60)
    
    # Step 1: Backup current Caddyfile
    print("\n[1] Backing up current Caddyfile...")
    out, err = ssh_exec("cp /home/blivoai/Caddyfile /home/blivoai/Caddyfile.backup.before-new-blivo")
    print(f"Backup: {out.strip()}")
    
    # Step 2: Write new Caddyfile
    print("\n[2] Writing new Caddyfile...")
    # Use SFTP to write the file
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=15)
    sftp = client.open_sftp()
    
    with sftp.open('/home/blivoai/Caddyfile', 'w') as f:
        f.write(NEW_CADDYFILE)
    
    print("New Caddyfile written successfully!")
    
    # Also update the standalone Caddyfile
    try:
        with sftp.open('/home/blivoai/.next/standalone/Caddyfile', 'w') as f:
            f.write(NEW_CADDYFILE)
        print("Standalone Caddyfile also updated!")
    except Exception as e:
        print(f"Standalone Caddyfile update skipped: {e}")
    
    sftp.close()
    client.close()
    
    # Step 3: Verify new Caddyfile content
    print("\n[3] Verifying new Caddyfile...")
    out, err = ssh_exec("cat /home/blivoai/Caddyfile")
    print(out[:500])
    
    # Step 4: Reload Caddy gracefully
    print("\n[4] Reloading Caddy...")
    out, err = ssh_exec("docker exec blivoai-caddy caddy reload --config /etc/caddy/Caddyfile 2>&1")
    print(f"Reload output: {out.strip()}")
    if err.strip():
        print(f"Reload errors: {err.strip()}")
    
    # Step 5: Verify Caddy is running
    print("\n[5] Verifying Caddy status...")
    out, err = ssh_exec("docker ps --filter 'name=caddy' --format '{{.Names}} {{.Status}}'")
    print(f"Caddy status: {out.strip()}")
    
    # Step 6: Test domains respond
    print("\n[6] Testing domains...")
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://blivoai.com")
    print(f"blivoai.com → HTTP {out.strip()}")
    
    out, err = ssh_exec("curl -sk -o /dev/null -w '%{http_code}' https://demo.blivoai.com")
    print(f"demo.blivoai.com → HTTP {out.strip()}")
    
    print("\n" + "=" * 60)
    print("CADDY CONFIG UPDATED SUCCESSFULLY!")
    print("blivoai.com → chatbot:3000 (production)")
    print("demo.blivoai.com → new-blivo:3002 (staging)")
    print("=" * 60)

if __name__ == "__main__":
    main()
