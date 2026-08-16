#!/usr/bin/env python3
"""Update sylojor/blivoai GitHub repo — description, topics, homepage, README"""

import urllib.request
import json
import base64

# Read token from git remote
import subprocess
def run(cmd):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd='/home/ubuntu/new-blivo')
    return r.stdout.strip()

TOKEN = run("git remote get-url origin | sed 's|https://||;s|@github.*||'")

HEADERS = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
}

def api(method, url, data=None):
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=HEADERS, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()[:500]}")
        return None

# 1. Update repo metadata
print("Updating repo metadata...")
result = api("PATCH", "https://api.github.com/repos/sylojor/blivoai", {
    "name": "blivoai",
    "description": "BlivoAI — AI Employees Platform for Arabic Businesses | Smart AI workforce: accounting, programming, HR, marketing, customer service & more",
    "homepage": "https://blivoai.com",
    "topics": ["ai-employees", "arabic-ai", "business-automation", "ai-chatbot", "ai-platform", "hr-management", "nextjs", "typescript", "prisma", "tailwindcss", "arabic-nlp", "business-management", "ai-workforce"],
    "has_issues": True,
    "has_projects": True,
    "has_wiki": False,
})
if result:
    print(f"  Description: {result.get('description')}")
    print(f"  Topics: {result.get('topics')}")
    print(f"  Homepage: {result.get('homepage')}")

# 2. Get current README SHA
print("\nGetting current README SHA...")
readme_info = api("GET", "https://api.github.com/repos/sylojor/blivoai/contents/README.md")
if not readme_info:
    print("ERROR: Could not get README info")
    exit(1)

sha = readme_info.get("sha")
print(f"  Current SHA: {sha}")

# 3. New README content
README_CONTENT = r'''<div align="center">

<img src="https://blivoai.com/api/branding/logo.png" alt="BlivoAI Logo" width="80" />

# BlivoAI

### The AI Workforce for Arabic Businesses

[![Website](https://img.shields.io/badge/Website-blivoai.com-8B5CF6?style=for-the-badge&logo=googlechrome&logoColor=white)](https://blivoai.com)
[![Live Demo](https://img.shields.io/badge/Demo-Live_Site-success?style=for-the-badge)](https://blivoai.com/ar)
[![Arabic First](https://img.shields.io/badge/Language-Arabic_First-blue?style=for-the-badge)](https://blivoai.com/ar)
[![Next.js](https://img.shields.io/badge/Tech-Next.js_16-black?style=for-the-badge&logo=next.js)](https://github.com/vercel/next.js)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## About

**BlivoAI** is a comprehensive AI-powered business management platform built specifically for Arabic-speaking businesses. It provides virtual AI employees that handle real business tasks — from accounting and programming to HR management and customer service.

> [!TIP]
> **Try it live:** [blivoai.com](https://blivoai.com) | [blivoai.com/ar](https://blivoai.com/ar)

---

## Features

### AI Employees
Deploy specialized AI employees that handle real business tasks:

| Employee | Role |
|----------|------|
| Accountant | Financial reporting, invoices, expense tracking |
| Programmer | Code generation, debugging, technical tasks |
| Social Media Manager | Content creation, scheduling, analytics |
| HR Manager | Employee management, reports, hiring |
| Marketer | Campaign strategy, market analysis |
| Customer Service | Support tickets, FAQs, client communication |

### Platform Capabilities

- Smart AI chatbot with multi-model support
- Department-based organization
- Complete HR management system
- Project and task management
- Analytics dashboard
- Multi-language (Arabic & English)
- API integration for external services
- Blog & content management system
- Support center with ticketing

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT + Google OAuth |
| Payments | Dodo Payments |
| Email | Resend |
| Reverse Proxy | Caddy |
| Containerization | Docker Compose |

---

## Screenshots

<div align="center">
  <table>
    <tr>
      <td><b>AI Employees Dashboard</b></td>
      <td><b>Smart Chatbot</b></td>
    </tr>
    <tr>
      <td><img src="https://blivoai.com/api/branding/logo.png" width="400" alt="Dashboard" /></td>
      <td><img src="https://blivoai.com/api/branding/logo.png" width="400" alt="Chatbot" /></td>
    </tr>
  </table>
</div>

---

## Pricing

| Plan | Price | AI Employees | Tokens | Departments |
|------|-------|-------------|--------|-------------|
| Free Trial | $0 | 1 | 10,000 | 1 |
| Starter | $59/mo | 5 | 100,000 | 3 |
| Professional | $79/mo | 15 | 300,000 | 10 |
| Enterprise | Custom | Unlimited | Unlimited | Unlimited |

[See full pricing](https://blivoai.com/pricing)

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Docker & Docker Compose (for containerized setup)

### Local Development

```bash
# Clone the repository
git clone https://github.com/sylojor/blivoai.git
cd blivoai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Docker Deployment

```bash
# Clone and start
git clone https://github.com/sylojor/blivoai.git
cd blivoai
docker compose up -d
```

---

## Project Structure

```
blivoai/
+-- prisma/              # Database schema & migrations
+-- public/               # Static assets
+-- src/
|   +-- app/              # Next.js App Router pages
|   |   +-- [lang]/       # Internationalized routes (ar/en)
|   |   +-- api/           # API routes
|   +-- components/       # React components
|   |   +-- landing/       # Public landing page
|   |   +-- chat/          # Chat interface
|   |   +-- dashboard/     # Admin dashboard
|   +-- lib/               # Utilities, DB client, services
+-- support-blivo/         # Support center (separate app)
+-- docker-compose.yml    # Production setup
+-- Dockerfile            # Multi-stage build
```

---

## Links

| Resource | Link |
|----------|------|
| Homepage | [blivoai.com](https://blivoai.com) |
| Arabic Homepage | [blivoai.com/ar](https://blivoai.com/ar) |
| Pricing | [blivoai.com/pricing](https://blivoai.com/pricing) |
| Blog | [blivoai.com/blog](https://blivoai.com/blog) |
| API Docs | [blivoai.com/api-docs](https://blivoai.com/api-docs) |
| Support Center | [support.blivoai.com](https://support.blivoai.com) |
| X (Twitter) | [@blivoai](https://x.com/blivoai) |
| LinkedIn | [BlivoAI](https://www.linkedin.com/company/blivoai) |
| Fiverr | [blivoai](https://www.fiverr.com/blivoai) |

---

## License

This project is proprietary software. All rights reserved.

<div align="center">
  <sub>Built with dedication for Arabic businesses worldwide</sub>
</div>
'''

# 4. Update README
print("\nUpdating README.md...")
encoded_content = base64.b64encode(README_CONTENT.encode()).decode()
result = api("PUT", "https://api.github.com/repos/sylojor/blivoai/contents/README.md", {
    "message": "docs: Update README — reflect BlivoAI as AI Employees Platform",
    "content": encoded_content,
    "sha": sha,
})
if result:
    print(f"  README updated successfully!")
    print(f"  Commit SHA: {result.get('commit', {}).get('sha', 'N/A')}")
else:
    print("  FAILED to update README")

print("\nDone!")
