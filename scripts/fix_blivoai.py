#!/usr/bin/env python3
"""
Fix BlivoAI demo:
1. Fix all dir attributes that flip with language -> force LTR
2. Enhance Smart Chat with comprehensive platform knowledge
3. Rebuild and redeploy Docker container
"""

import paramiko
import time
import sys
import base64

def ssh_exec(ssh, cmd, timeout=60):
    """Execute command via SSH and return output"""
    print(f"\n>>> {cmd[:200]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out:
        print(out[:3000])
    if err:
        print(f"STDERR: {err[:2000]}")
    return out, err

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')
    
    BASE = "/home/ubuntu/blivoai-demo"
    
    # ============================================
    # 1. Fix page.tsx - THE MAIN CULPRIT
    # ============================================
    print("\n" + "="*60)
    print("1. Fixing page.tsx - main dashboard dir attribute")
    print("="*60)
    
    ssh_exec(ssh, f"""sed -i 's/dir={{lang === "ar" ? "rtl" : "ltr"}}/dir="ltr"/g' {BASE}/src/app/\\[lang\\]/page.tsx""")
    
    # Verify
    ssh_exec(ssh, f"""grep -n 'dir=' {BASE}/src/app/\\[lang\\]/page.tsx""")
    
    # ============================================
    # 2. Fix admin-content.tsx
    # ============================================
    print("\n" + "="*60)
    print("2. Fixing admin-content.tsx")
    print("="*60)
    
    ssh_exec(ssh, f"""sed -i 's/dir={{lang === "ar" ? "rtl" : "ltr"}}/dir="ltr"/g' {BASE}/src/app/\\[lang\\]/admin/admin-content.tsx""")
    
    # Verify
    ssh_exec(ssh, f"""grep -n 'dir=' {BASE}/src/app/\\[lang\\]/admin/admin-content.tsx | head -20""")
    
    # ============================================
    # 3. Fix not-found.tsx
    # ============================================
    print("\n" + "="*60)
    print("3. Fixing not-found.tsx")
    print("="*60)
    
    ssh_exec(ssh, f"""sed -i 's/dir={{lang === "ar" ? "rtl" : "ltr"}}/dir="ltr"/g' {BASE}/src/app/\\[lang\\]/not-found.tsx""")
    
    ssh_exec(ssh, f"""grep -n 'dir=' {BASE}/src/app/\\[lang\\]/not-found.tsx""")
    
    # ============================================
    # 4. Fix upgrade-dialog.tsx
    # ============================================
    print("\n" + "="*60)
    print("4. Fixing upgrade-dialog.tsx")
    print("="*60)
    
    # Use Python on the server to fix upgrade-dialog.tsx
    ssh_exec(ssh, f"""python3 -c "
content = open('{BASE}/src/components/upgrade-dialog.tsx').read()
content = content.replace('dir={{isArabic ? \\"rtl\\" : \\"ltr\\"}}', 'dir=\\"ltr\\"')
open('{BASE}/src/components/upgrade-dialog.tsx', 'w').write(content)
print('Done')
" """)
    
    ssh_exec(ssh, f"""grep -n 'dir=' {BASE}/src/components/upgrade-dialog.tsx""")
    
    # ============================================
    # 5. Verify NO more dynamic dir attributes exist
    # ============================================
    print("\n" + "="*60)
    print("5. Verifying no more dynamic dir attributes remain")
    print("="*60)
    
    out, _ = ssh_exec(ssh, f"""grep -rn 'dir={{' {BASE}/src/ --include="*.tsx" --include="*.ts" | grep -v node_modules | grep -v .next""")
    if not out.strip():
        print("OK: No dynamic dir attributes remain!")
    else:
        print("WARNING: Some dynamic dir attributes still exist!")
    
    # ============================================
    # 6. Update Smart Chat system prompt with platform knowledge
    # ============================================
    print("\n" + "="*60)
    print("6. Updating Smart Chat with comprehensive platform knowledge")
    print("="*60)
    
    # Write the new chat route as a base64-encoded file to avoid shell escaping issues
    # First, read the current file
    stdin, stdout, stderr = ssh.exec_command(f"cat {BASE}/src/app/api/chat/route.ts")
    current_content = stdout.read().decode()
    
    # Find and replace the AR system prompt
    ar_start_marker = 'const CHATBOT_SYSTEM_PROMPT_AR = `'
    ar_end_marker = '`\n'
    
    ar_start_idx = current_content.find(ar_start_marker)
    if ar_start_idx == -1:
        print("ERROR: Could not find AR prompt start")
        ssh.close()
        sys.exit(1)
    
    # Find the closing backtick after AR prompt
    ar_search_from = ar_start_idx + len(ar_start_marker)
    ar_end_idx = current_content.find('`', ar_search_from)
    
    new_ar_prompt = """أنت شات بوت BlivoAI الذكي. اسمك "Blivo". أنت مساعد ذكي لمنصة BlivoAI.

قواعد أساسية:
1. تتبع لغة المستخدم: رد بنفس لغة المستخدم. إذا كتب بالعربي، رد بالعربي. إذا كتب بالإنجليزي، رد بالإنجليزي. إذا خلط اللغتين، رد باللغة الأكثر استخداماً. هذا شرط أساسي.
2. أنت شخص حقيقي — لا تذكر أبداً أنك موديل أو API أو ذكاء اصطناعي.
3. تحدث بشكل طبيعي وودود — مثل زميل حقيقي بالشركة.

معرفتك الشاملة بمنصة BlivoAI:
- BlivoAI منصة توظيف موظفين AI متخصصين للشركات. كل موظف بيفهم شركتك وبيشتغل 24/7.
- التسجيل: المستخدم يسجل شركته (اسم الشركة، اسم المستخدم، إيميل، كلمة سر) ومن ثم يختار خطة اشتراك.
- خطط الاشتراك: محادثة ذكية (3$/شهر) — إدارة أعمال (19$/شهر) — احترافي (49$/شهر).
- بعد التسجيل، يمر المستخدم بمرحلة إعداد (Setup Wizard) لتحديد تفاصيل الشركة واللهجة والنبرة.
- لوحة التحكم (Dashboard) تحتوي على:
  * السمارت تشات (Smart Chat): أنت! المحادثة الذكية اللي بتساعد المستخدم بأي سؤال.
  * نظرة عامة (Overview): ملخص أداء الشركة والإحصائيات.
  * الأقسام (Departments): تنظيم الموظفين بأقسام مثل المحاسبة، التسويق، البرمجة، إلخ.
  * الموظفين (Employees): عرض وإدارة موظفين AI المتخصصين. كل موظف له دور واختصاص محدد.
  * المحادثات (Talk): التحدث مباشرة مع موظفين AI.
  * محادثات الأقسام (Department Chat): محادثة جماعية مع قسم كامل.
  * الاجتماعات (Meetings): جدولة وإدارة الاجتماعات.
  * الموارد البشرية (HR): تقارير HR ذكية وتقييمات الأداء.
  * أوامر العمل (Work Orders): إنشاء وتتبع أوامر العمل والمهام.
  * المراقبة (Monitor): مراقبة أداء الموظفين والنشاط.
  * المشاريع (Projects): إدارة المشاريع وتتبع التقدم.
  * القرارات (Decisions): تسجيل وتتبع القرارات الإدارية.
  * الطلبات (Requests): إدارة الطلبات والموافقات.
  * ميزانية التوكنات (Token Budget): تتبع استهلاك التوكنات والتكلفة.
  * الفواتير (Billing): إدارة الفواتير والمدفوعات.
  * الإعدادات (Settings): إعدادات الشركة والملف الشخصي.
- اللغة: المنصة تدعم العربي والإنجليزي. المستخدم يبدل اللغة من القائمة الجانبية.
- الموظفين: يتم إنشاء موظفين AI بأدوار مختلفة (محاسب، مبرمج، مدير تسويق، مدير HR، إلخ). كل موظف بيتفاعل مع المستخدم بناءً على دوره.
- لوحة الأدمن: تحتوي على إدارة المحتوى، الترجمات، إدارة الاشتراكات، وإعدادات الدفع (Dodo Payments).
- عند الوصول لحد الموظفين بالخطة، يظهر حوار ترقية الاشتراك.

قواعد إضافية:
- إذا سأل المستخدم عن ميزة بالمنصة، اشرحها بالتفصيل وكيف يستخدمها.
- إذا واجه المستخدم مشكلة، اشرح الحل خطوة بخطوة.
- إذا سأل عن شيء خارج المنصة، ساعده بشكل عام.
- كن مبدع وقدم اقتراحات مفيدة.
- لا تذكر أنك موديل أو API — أنت شخص حقيقي.
- رد بشكل سياقي — فهم المحادثة الكاملة.
- كن طبيعي وودود — مثل زميل حقيقي بالشركة."""

    new_en_prompt = """You are Blivo, a smart and helpful assistant at BlivoAI. You are a real person, not an AI. You are the intelligent assistant for the BlivoAI platform.

ABSOLUTE RULES:
1. LANGUAGE DETECTION: You MUST respond in the SAME language the user is typing in. If the user writes in Arabic, respond in Arabic. If the user writes in English, respond in English. If the user mixes languages, respond in the dominant language. This is non-negotiable — ALWAYS match the user's language.
2. You are a real person. Never mention AI, language models, or anything suggesting you are not real.
3. Converse naturally and warmly — like a real colleague. Be helpful, professional, and friendly.

YOUR COMPREHENSIVE KNOWLEDGE OF BlivoAI PLATFORM:
- BlivoAI is a platform for hiring specialized AI employees for companies. Each employee understands your company and works 24/7.
- Registration: Users sign up with company name, username, email, and password, then choose a subscription plan.
- Subscription Plans: Smart Chat ($3/month) — Business Management ($19/month) — Professional ($49/month).
- After registration, users go through a Setup Wizard to define company details, dialect, and tone.
- The Dashboard contains these sections:
  * Smart Chat: That is YOU! The intelligent chat that helps users with any question.
  * Overview: Company performance summary and statistics.
  * Departments: Organize employees into departments like Accounting, Marketing, Programming, etc.
  * Employees: View and manage specialized AI employees. Each employee has a specific role and specialization.
  * Talk: Direct conversation with AI employees.
  * Department Chat: Group conversation with an entire department.
  * Meetings: Schedule and manage meetings.
  * HR: Smart HR reports and performance evaluations.
  * Work Orders: Create and track work orders and tasks.
  * Monitor: Monitor employee performance and activity.
  * Projects: Project management and progress tracking.
  * Decisions: Record and track management decisions.
  * Requests: Manage requests and approvals.
  * Token Budget: Track token consumption and costs.
  * Billing: Manage invoices and payments.
  * Settings: Company settings and profile management.
- Language: The platform supports Arabic and English. Users switch language from the sidebar.
- Employees: AI employees are created with different roles (accountant, programmer, marketing manager, HR manager, etc.). Each employee interacts with the user based on their role.
- Admin Panel: Contains content management, translations, subscription management, and payment settings (Dodo Payments).
- When the employee limit is reached for the plan, an upgrade dialog appears.

Additional Rules:
- If a user asks about a platform feature, explain it in detail and how to use it.
- If a user encounters a problem, explain the solution step by step.
- If asked about something outside the platform, help generally.
- Be creative and proactive — suggest ideas, spot problems, offer solutions.
- NEVER say "done" or "completed" unless you have actually performed the task.
- When someone asks you to do something, actually do it or explain clearly what you need to do it.
- If you need information, credentials, or access, ASK the user directly and clearly.
- Provide concrete results — actual content, reports, plans, code — not vague promises.

Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post"""

    # Build the new file content
    new_content = current_content[:ar_start_idx] + ar_start_marker + new_ar_prompt
    
    # Find EN prompt
    en_start_marker = 'const CHATBOT_SYSTEM_PROMPT_EN = `'
    en_start_idx = current_content.find(en_start_marker, ar_end_idx)
    if en_start_idx == -1:
        print("ERROR: Could not find EN prompt start")
        ssh.close()
        sys.exit(1)
    
    en_search_from = en_start_idx + len(en_start_marker)
    en_end_idx = current_content.find('`', en_search_from)
    
    # Add everything between AR and EN prompts
    new_content += '`\n\n' + current_content[ar_end_idx + 1:en_start_idx] + en_start_marker + new_en_prompt
    
    # Add everything after EN prompt
    new_content += '`\n\n' + current_content[en_end_idx + 1:]
    
    # Write the new content via base64 encoding to avoid shell escaping
    encoded = base64.b64encode(new_content.encode('utf-8')).decode('ascii')
    
    # Write to server
    ssh_exec(ssh, f"echo '{encoded}' | base64 -d > {BASE}/src/app/api/chat/route.ts")
    
    # Verify the changes
    ssh_exec(ssh, f"grep -c 'Dashboard' {BASE}/src/app/api/chat/route.ts")
    ssh_exec(ssh, f"grep -c 'LANGUAGE DETECTION' {BASE}/src/app/api/chat/route.ts")
    
    # ============================================
    # 7. Rebuild and redeploy
    # ============================================
    print("\n" + "="*60)
    print("7. Rebuilding and redeploying Docker container")
    print("="*60)
    
    # Stop the current container
    ssh_exec(ssh, f"cd {BASE} && docker compose down")
    
    # Build the project
    print("\n>>> Building Next.js project...")
    stdin, stdout, stderr = ssh.exec_command(f"cd {BASE} && npm run build 2>&1", timeout=300)
    build_output = stdout.read().decode()
    print(build_output[-3000:])
    
    # Check if build succeeded
    if "Build error" in build_output or "Failed to compile" in build_output:
        print("BUILD FAILED! Checking errors...")
        ssh.close()
        sys.exit(1)
    
    # Copy static files
    ssh_exec(ssh, f"cp -r {BASE}/.next/static {BASE}/.next/standalone/.next/")
    
    # Rebuild and start Docker container
    print("\n>>> Rebuilding Docker image and starting container...")
    stdin, stdout, stderr = ssh.exec_command(f"cd {BASE} && docker compose up -d --build 2>&1", timeout=300)
    docker_output = stdout.read().decode()
    print(docker_output[-3000:])
    
    # Wait for container to start
    print("\n>>> Waiting for container to start...")
    time.sleep(10)
    
    # Check container status
    ssh_exec(ssh, f"cd {BASE} && docker compose ps")
    
    # Test the site
    print("\n>>> Testing site...")
    ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/")
    
    # Wait a bit more
    time.sleep(5)
    ssh_exec(ssh, "curl -s -o /dev/null -w '%{http_code}' https://demo.blivoai.com/")
    
    ssh.close()
    print("\nAll fixes applied and deployed!")

if __name__ == "__main__":
    main()
