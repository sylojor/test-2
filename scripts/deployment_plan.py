"""
BlivoAI Deployment Plan Generator
Creates a comprehensive plan for running new-blivo alongside existing BlivoAI
on the same OVH server (8GB RAM, 4 vCPU, 75GB) with zero disruption.
"""

import json

plan = {
    "server_specs": {
        "ram": "8GB",
        "cpu": "4 vCores",
        "storage": "75GB",
        "current_usage_estimate": {
            "docker_containers": "~500MB RAM (chatbot + caddy)",
            "next_js_app": "~300MB RAM",
            "sqlite_db": "~50MB storage",
            "total_used_ram": "~1GB",
            "available_ram": "~6-7GB"
        }
    },
    
    "current_setup": {
        "containers": ["app-chatbot (port 3000)", "app-caddy (ports 80/443)"],
        "database": "SQLite (chatbot.db)",
        "reverse_proxy": "Caddy → auto SSL via Cloudflare",
        "cdn": "Cloudflare (blivoai.com)",
        "app_framework": "Next.js standalone output + Bun build + Node.js runtime"
    },
    
    "dual_deployment_strategy": {
        "phase_1_testing": {
            "name": "Parallel Testing Phase",
            "description": "Run new-blivo on port 3001 while current BlivoAI stays on port 3000",
            "steps": [
                "1. Clone new-blivo to OVH server at /home/new-blivo/",
                "2. Create docker-compose.new.yml with port 3001 mapping",
                "3. Build and start new-blivo container (app-chatbot-new)",
                "4. Access new version at http://SERVER_IP:3001 (no Caddy, direct access)",
                "5. Test thoroughly without affecting production",
                "6. Current BlivoAI continues serving users on port 80/443 normally"
            ],
            "risk_level": "ZERO - current BlivoAI is completely unaffected",
            "ram_impact": "Additional ~300-500MB for second Next.js container"
        },
        
        "phase_2_switch": {
            "name": "Production Switch Phase",
            "description": "Switch Caddy to point to new-blivo instead of old",
            "steps": [
                "1. Update Caddyfile: change reverse_proxy from chatbot:3000 to chatbot-new:3001",
                "2. Caddy reloads config automatically (no restart needed)",
                "3. New-blivo is now live on blivoai.com",
                "4. Keep old container running for 24h as backup (can switch back instantly)",
                "5. After 24h, stop old container if everything works"
            ],
            "risk_level": "LOW - instant rollback by changing Caddyfile back",
            "downtime": "0 seconds - Caddy hot-reloads config"
        },
        
        "phase_3_cleanup": {
            "name": "Cleanup Phase",
            "description": "Remove old version and optimize",
            "steps": [
                "1. Stop and remove old docker containers",
                "2. Remove old code from /home/blivoai/",
                "3. Rename new-blivo directories to final names",
                "4. Free up ~500MB RAM and disk space"
            ]
        }
    },
    
    "docker_compose_new": {
        "description": "New docker-compose for parallel deployment",
        "port_mapping": "3001:3000 (external port 3001 → internal port 3000)",
        "container_name": "app-chatbot-new",
        "volume": "new-chatbot-data (separate from old)"
    },
    
    "database_migration": {
        "current": "SQLite (single file chatbot.db)",
        "target": "PostgreSQL with company_id isolation (multi-tenant)",
        "migration_path": [
            "Phase 1: Keep SQLite for testing new UI",
            "Phase 2: Add PostgreSQL container to docker-compose",
            "Phase 3: Migrate data from SQLite → PostgreSQL",
            "Phase 4: Add company_id field to all relevant models",
            "Phase 5: Switch DATABASE_URL to PostgreSQL"
        ],
        "ram_impact": "PostgreSQL container adds ~200-300MB RAM"
    },
    
    "risk_analysis": {
        "total_ram_needed": {
            "current_blivoai": "~1GB",
            "new_blivoai_testing": "~500MB",
            "postgresql_if_added": "~300MB",
            "total_max": "~1.8GB",
            "available": "~6GB",
            "safety_margin": "PLENTY - 8GB server can handle both + PostgreSQL"
        },
        "disk_needed": {
            "current_usage": "~5-10GB (app + db + docker images)",
            "new_container": "~2-3GB (docker image)",
            "postgresql_data": "~1-2GB",
            "total_max": "~15GB",
            "available": "75GB",
            "safety_margin": "PLENTY - 60GB+ free space"
        },
        "port_conflicts": "NONE - new app on 3001, old on 3000",
        "database_conflicts": "NONE - separate SQLite files, later separate PostgreSQL schemas"
    },
    
    "critical_checks": [
        "✅ Ports: Old=3000, New=3001 — NO conflict",
        "✅ RAM: 8GB total, ~1.8GB needed — 6.2GB free (PLENTY)",
        "✅ Disk: 75GB total, ~15GB needed — 60GB free (PLENTY)",
        "✅ Database: Separate volumes — NO data mixing",
        "✅ Caddy: Hot-reload config — ZERO downtime switch",
        "✅ Rollback: Change 1 line in Caddyfile — instant revert",
        "✅ Cloudflare: No changes needed during testing phase",
        "⚠️ Need OVH server IP to proceed with SSH deployment"
    ]
}

print(json.dumps(plan, indent=2, ensure_ascii=False))
