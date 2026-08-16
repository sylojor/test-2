#!/usr/bin/env python3
"""Update LLM model records in the BlivoAI database"""
import subprocess

SSH_CMD = "/home/z/my-project/scripts/ssh_cmd.py"

# The column names are camelCase in PostgreSQL (Prisma convention)
# We need to use double quotes around them in psql
sql = """UPDATE llm_models SET "baseUrl" = 'https://api.together.xyz/v1', "modelId" = 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo' WHERE provider = 'together';"""

cmd = f'cd ~/blivoai-demo && docker exec demo-postgres psql -U blivoai -d blivoai -c "{sql}"'
result = subprocess.run(['python3', SSH_CMD, cmd], capture_output=True, text=True, timeout=30)
print("stdout:", result.stdout)
print("stderr:", result.stderr)
print("rc:", result.returncode)

# Also add MEDIUM and HEAVY tier models
sql2 = """INSERT INTO llm_models (id, name, provider, "apiKeyValue", "baseUrl", "modelId", tier, "isActive", "isDefault", priority, capabilities, "priceInput", "priceOutput", "maxTokens", "maxContext") VALUES ('together_medium', 'Llama 3.1 70B Turbo', 'together', 'key_CdRDkKrw9HYss3jGUopUW', 'https://api.together.xyz/v1', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'MEDIUM', true, false, 10, '[\"CHAT\",\"CODE\",\"ANALYSIS\"]', 0.088, 0.264, 8192, 128000) ON CONFLICT (id) DO UPDATE SET "baseUrl" = 'https://api.together.xyz/v1', "modelId" = 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo';"""

cmd2 = f'cd ~/blivoai-demo && docker exec demo-postgres psql -U blivoai -d blivoai -c "{sql2}"'
result2 = subprocess.run(['python3', SSH_CMD, cmd2], capture_output=True, text=True, timeout=30)
print("INSERT stdout:", result2.stdout)
print("INSERT stderr:", result2.stderr)
print("INSERT rc:", result2.returncode)

# Verify
verify_cmd = f'cd ~/blivoai-demo && docker exec demo-postgres psql -U blivoai -d blivoai -c "SELECT id, name, provider, modelId, tier, isActive FROM llm_models;"'
result3 = subprocess.run(['python3', SSH_CMD, verify_cmd], capture_output=True, text=True, timeout=30)
print("Verify:", result3.stdout)
