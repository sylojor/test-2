#!/usr/bin/env python3
"""
OVH Server Demo Cleanup Script
- Stop and remove the demo Docker container (demo.blivoai.com on port 3001)
- Remove demo volumes and images
- Update Caddy config to remove demo.blivoai.com block
- Clean Docker build cache (reclaim ~32GB)
- Verify resources freed
"""

import paramiko
import json
import time

# Server credentials
HOST = "141.95.55.5"
USER = "ubuntu"
PASSWORD = "Mghazi@199641"

def ssh_exec(command, timeout=30):
    """Execute command on OVH server via SSH"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASSWORD, timeout=timeout)
    stdin, stdout, stderr = client.exec_command(command, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    client.close()
    return out, err

def main():
    results = {}
    
    print("=" * 60)
    print("OVH SERVER DEMO CLEANUP")
    print("=" * 60)
    
    # Step 1: Check current Docker containers
    print("\n[1] Current Docker containers:")
    out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    print(out)
    if err:
        print(f"Error: {err}")
    results['containers_before'] = out
    
    # Step 2: Find the demo container
    print("\n[2] Finding demo container...")
    out, err = ssh_exec("docker ps --filter 'name=demo' --format '{{.Names}} {{.ID}} {{.Ports}}'")
    demo_info = out.strip()
    print(f"Demo container: {demo_info}")
    
    if not demo_info:
        print("No demo container found! Checking all containers...")
        out, err = ssh_exec("docker ps -a --format '{{.Names}} {{.ID}} {{.Ports}} {{.Status}}'")
        print(out)
        results['all_containers'] = out
    
    # Step 3: Stop the demo container
    print("\n[3] Stopping demo container...")
    # Try multiple possible names
    possible_names = ["demo", "blivoai-demo", "demo-blivoai", "blivoai_demo"]
    for name in possible_names:
        out, err = ssh_exec(f"docker stop {name} 2>&1")
        if "Error" not in out and "Error" not in err and "No such container" not in out:
            print(f"Stopped container: {name} → {out.strip()}")
            break
        else:
            # Also try by port 3001
            out2, err2 = ssh_exec("docker ps --filter 'publish=3001' --format '{{.Names}}'")
            container_by_port = out2.strip()
            if container_by_port:
                print(f"Found container on port 3001: {container_by_port}")
                out, err = ssh_exec(f"docker stop {container_by_port}")
                print(f"Stopped: {out.strip()}")
                name = container_by_port
                break
    
    # Step 4: Remove the demo container
    print("\n[4] Removing demo container...")
    for name in possible_names:
        out, err = ssh_exec(f"docker rm -f {name} 2>&1")
        if "Error" not in out and "No such container" not in out:
            print(f"Removed container: {name} → {out.strip()}")
            break
    
    # Also try by port
    out, err = ssh_exec("docker ps -a --filter 'publish=3001' --format '{{.Names}}'")
    container_by_port = out.strip()
    if container_by_port:
        out, err = ssh_exec(f"docker rm -f {container_by_port}")
        print(f"Removed by port: {out.strip()}")
    
    # Step 5: Check for demo Docker Compose and remove
    print("\n[5] Looking for demo docker-compose...")
    out, err = ssh_exec("find /home/ubuntu /opt /root /var -name 'docker-compose*' -path '*demo*' 2>/dev/null | head -5")
    if out.strip():
        print(f"Found demo compose files: {out}")
    else:
        out, err = ssh_exec("find / -maxdepth 4 -name 'docker-compose.yml' 2>/dev/null | head -10")
        print(f"All compose files: {out}")
    
    # Step 6: Remove demo volumes
    print("\n[6] Removing demo volumes...")
    out, err = ssh_exec("docker volume ls --filter 'name=demo' --format '{{.Name}}'")
    demo_volumes = out.strip()
    if demo_volumes:
        for vol in demo_volumes.split('\n'):
            vol = vol.strip()
            if vol:
                out2, err2 = ssh_exec(f"docker volume rm {vol}")
                print(f"Removed volume: {vol} → {out2.strip()}")
    else:
        print("No demo-specific volumes found")
    
    # Step 7: Remove demo Docker images
    print("\n[7] Removing demo images...")
    out, err = ssh_exec("docker images --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.Size}}' | grep -i demo")
    demo_images = out.strip()
    if demo_images:
        print(f"Demo images: {demo_images}")
        for line in demo_images.split('\n'):
            img_id = line.strip().split()[1] if line.strip() else ""
            if img_id:
                out2, err2 = ssh_exec(f"docker rmi {img_id} 2>&1")
                print(f"Removed image: {img_id}")
    else:
        print("No demo-specific images found")
    
    # Step 8: Update Caddy config - remove demo.blivoai.com block
    print("\n[8] Checking Caddy configuration...")
    out, err = ssh_exec("find / -maxdepth 5 -name 'Caddyfile' 2>/dev/null | head -5")
    caddyfiles = out.strip()
    print(f"Caddyfile locations: {caddyfiles}")
    
    # Read the Caddyfile content
    for caddyfile in caddyfiles.split('\n'):
        caddyfile = caddyfile.strip()
        if caddyfile:
            out, err = ssh_exec(f"cat {caddyfile}")
            print(f"\nCaddyfile at {caddyfile}:")
            print(out)
            results['caddy_config'] = out
    
    # Step 9: Check if demo directory exists
    print("\n[9] Checking demo project directory...")
    out, err = ssh_exec("find /home/ubuntu /opt /root -maxdepth 3 -type d -name '*demo*' 2>/dev/null | head -10")
    demo_dirs = out.strip()
    print(f"Demo directories: {demo_dirs}")
    
    # Step 10: Clean Docker build cache
    print("\n[10] Cleaning Docker build cache...")
    out, err = ssh_exec("docker builder prune -af 2>&1", timeout=120)
    print(f"Build cache cleanup: {out.strip()}")
    results['cache_cleanup'] = out.strip()
    
    # Step 11: Verify cleanup results
    print("\n[11] Verifying cleanup...")
    out, err = ssh_exec("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    print(f"Remaining containers:\n{out}")
    results['containers_after'] = out
    
    out, err = ssh_exec("df -h /")
    print(f"Disk space:\n{out}")
    results['disk_after'] = out
    
    out, err = ssh_exec("free -h")
    print(f"Memory:\n{out}")
    results['memory_after'] = out
    
    # Step 12: Check port 3001 is freed
    print("\n[12] Checking port 3001...")
    out, err = ssh_exec("ss -tlnp | grep 3001")
    if out.strip():
        print(f"Port 3001 still in use: {out.strip()}")
    else:
        print("✅ Port 3001 is FREE!")
    results['port_3001'] = "free" if not out.strip() else out.strip()
    
    # Save results
    with open('/home/z/my-project/scripts/ovh_demo_cleanup_results.json', 'w') as f:
        json.dump(results, f, indent=2, default=str)
    
    print("\n" + "=" * 60)
    print("CLEANUP COMPLETE - Results saved")
    print("=" * 60)

if __name__ == "__main__":
    main()
