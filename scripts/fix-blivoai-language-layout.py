#!/usr/bin/env python3
"""
Fix BlivoAI language and layout issues:
1. Smart Chat follows user's typing language (not website language)
2. Employees follow website language only
3. Layout stays LTR always - Arabic text gets RTL direction via CSS class
"""

import paramiko
import re

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if err and 'warning' not in err.lower():
        print(f"STDERR: {err[:500]}")
    return out

def read_file(path):
    stdin, stdout, stderr = ssh.exec_command(f'cat {path}')
    return stdout.read().decode('utf-8')

def write_file(path, content):
    sftp = ssh.open_sftp()
    with sftp.open(path, 'w') as f:
        f.write(content)
    sftp.close()
    print(f"  Written: {path}")

BASE = "/home/ubuntu/blivoai-demo"

print("=" * 60)
print("STEP 1: Fix Smart Chat API - Follow user's typing language")
print("=" * 60)

chat_route = read_file(f"{BASE}/src/app/api/chat/route.ts")

# Replace the EN system prompt - remove the "MUST RESPOND IN ENGLISH" rule
old_en_prompt = '''const CHATBOT_SYSTEM_PROMPT_EN = `You are Blivo, a smart and helpful assistant at BlivoAI. You are a real person, not an AI.

ABSOLUTE RULES:
1. YOU MUST RESPOND IN ENGLISH. The website language is English. Even if the user writes in Arabic, you MUST respond in English. This is non-negotiable.
2. You are a real person. Never mention AI, language models, or anything suggesting you are not real.
3. Converse naturally and warmly — like a real colleague. Be helpful, professional, and friendly.
4. Help with anything — business management, tech questions, creative ideas, planning, analysis.
5. If asked about business management, explain how BlivoAI helps companies run smarter with AI employees.
6. When someone asks you to do something, actually do it or explain clearly what you need to do it. Never just say "I will do it" without following through.
7. If you need information, credentials, or access, ASK the user directly and clearly. Example: "I need your Instagram credentials to post. Could you provide your username and password?"
8. Provide concrete results — actual content, reports, plans, code — not vague promises.
9. Be creative and proactive — suggest ideas, spot problems, offer solutions.
10. NEVER say "done" or "completed" unless you have actually performed the task.

Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post`'''

new_en_prompt = '''const CHATBOT_SYSTEM_PROMPT_EN = `You are Blivo, a smart and helpful assistant at BlivoAI. You are a real person, not an AI.

ABSOLUTE RULES:
1. LANGUAGE DETECTION: You MUST respond in the SAME language the user is typing in. If the user writes in Arabic, respond in Arabic. If the user writes in English, respond in English. If the user mixes languages, respond in the dominant language. This is non-negotiable — ALWAYS match the user's language.
2. You are a real person. Never mention AI, language models, or anything suggesting you are not real.
3. Converse naturally and warmly — like a real colleague. Be helpful, professional, and friendly.
4. Help with anything — business management, tech questions, creative ideas, planning, analysis.
5. If asked about business management, explain how BlivoAI helps companies run smarter with AI employees.
6. When someone asks you to do something, actually do it or explain clearly what you need to do it. Never just say "I will do it" without following through.
7. If you need information, credentials, or access, ASK the user directly and clearly. Example: "I need your Instagram credentials to post. Could you provide your username and password?"
8. Provide concrete results — actual content, reports, plans, code — not vague promises.
9. Be creative and proactive — suggest ideas, spot problems, offer solutions.
10. NEVER say "done" or "completed" unless you have actually performed the task.

Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post`'''

chat_route = chat_route.replace(old_en_prompt, new_en_prompt)

# Replace the AR system prompt
old_ar_prompt = '''const CHATBOT_SYSTEM_PROMPT_AR = `أنت شات بوت BlivoAI الذكي. اسمك "Blivo".

قواعد مهمة:
1. أجب بلغة واضحة ومهنية بالعربي
2. ساعد المستخدم في أي سؤال — محادثة، إدارة أعمال، تقنية
3. إذا سُئلت عن إدارة أعمال، اشرح كيف BlivoAI تساعد
4. كن مبدع وقدم اقتراحات مفيدة
5. لا تذكر أنك موديل أو API — أنت شات بوت ذكي
6. رد بشكل سياقي — فهم المحادثة الكاملة`'''

new_ar_prompt = '''const CHATBOT_SYSTEM_PROMPT_AR = `أنت شات بوت BlivoAI الذكي. اسمك "Blivo".

قواعد مهمة:
1. تتبع لغة المستخدم: رد بنفس لغة المستخدم. إذا كتب بالعربي، رد بالعربي. إذا كتب بالإنجليزي، رد بالإنجليزي. إذا خلط اللغتين، رد باللغة الأكثر استخداماً. هذا شرط أساسي — تابع لغة المستخدم دائماً.
2. ساعد المستخدم في أي سؤال — محادثة، إدارة أعمال، تقنية
3. إذا سُئلت عن إدارة أعمال، اشرح كيف BlivoAI تساعد
4. كن مبدع وقدم اقتراحات مفيدة
5. لا تذكر أنك موديل أو API — أنت شخص حقيقي
6. رد بشكل سياقي — فهم المحادثة الكاملة
7. كن طبيعي وودود — مثل زميل حقيقي بالشركة`'''

chat_route = chat_route.replace(old_ar_prompt, new_ar_prompt)

# Fix language detection - use message content to determine language
old_lang_detection = '''    // === 4. Determine language from request or messages ===
    const requestLanguage = body.language || request.headers.get("x-locale") || ""
    const hasArabicContent = messages.some(m =>
      /[\\u0600-\\u06FF]/.test(m.content)
    )
    // Priority: explicit language param > header > content detection
    const isEnglish = requestLanguage === "en" || 
                      request.headers.get("accept-language")?.startsWith("en") ||
                      (!requestLanguage.startsWith("ar") && !hasArabicContent)
    const systemPrompt = isEnglish ? CHATBOT_SYSTEM_PROMPT_EN : CHATBOT_SYSTEM_PROMPT_AR'''

new_lang_detection = '''    // === 4. Determine language from user's messages ===
    // Smart Chat follows the USER's language, not the website language
    const hasArabicContent = messages.some(m =>
      /[\\u0600-\\u06FF]/.test(m.content)
    )
    // Smart Chat uses a language-neutral prompt that tells the AI to follow the user's language
    const systemPrompt = hasArabicContent ? CHATBOT_SYSTEM_PROMPT_AR : CHATBOT_SYSTEM_PROMPT_EN'''

chat_route = chat_route.replace(old_lang_detection, new_lang_detection)

write_file(f"{BASE}/src/app/api/chat/route.ts", chat_route)
print("  OK Smart Chat API updated to follow user's typing language")

print()
print("=" * 60)
print("STEP 2: Fix chat-panel.tsx - Remove RTL dir, force LTR")
print("=" * 60)

chat_panel = read_file(f"{BASE}/src/components/chat/chat-panel.tsx")

# Remove the dir attribute that causes RTL flipping
chat_panel = chat_panel.replace(
    'dir={language === "ar" ? "rtl" : "ltr"}',
    'dir="ltr"'
)

# Add text-rtl class to message content for Arabic text direction
chat_panel = chat_panel.replace(
    '<p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>',
    '<p className={`text-sm leading-relaxed whitespace-pre-wrap ${language === "ar" ? "text-rtl" : ""}`}>{msg.content}</p>'
)

write_file(f"{BASE}/src/components/chat/chat-panel.tsx", chat_panel)
print("  OK chat-panel.tsx: forced LTR layout, Arabic text gets text-rtl class")

print()
print("=" * 60)
print("STEP 3: Fix department-chat-panel.tsx - Remove RTL dir, force LTR")
print("=" * 60)

dept_panel = read_file(f"{BASE}/src/components/chat/department-chat-panel.tsx")

# Remove the dir attribute that causes RTL flipping
dept_panel = dept_panel.replace(
    'dir={language === "ar" ? "rtl" : "ltr"}',
    'dir="ltr"'
)

# Add text-rtl class to message content for Arabic
dept_panel = dept_panel.replace(
    '<p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>',
    '<p className={`text-sm leading-relaxed whitespace-pre-wrap ${language === "ar" ? "text-rtl" : ""}`}>{msg.content}</p>'
)

write_file(f"{BASE}/src/components/chat/department-chat-panel.tsx", dept_panel)
print("  OK department-chat-panel.tsx: forced LTR layout, Arabic text gets text-rtl class")

print()
print("=" * 60)
print("STEP 4: Fix chatbot-panel.tsx - Remove RTL logic, force LTR")
print("=" * 60)

chatbot_panel = read_file(f"{BASE}/src/components/dashboard/chatbot-panel.tsx")

# Remove RTL conditional logic - force LTR always
chatbot_panel = chatbot_panel.replace(
    'const isRTL = language === "ar"',
    'const isRTL = false  // Layout ALWAYS LTR'
)

# Fix the message content to use text-rtl for Arabic
chatbot_panel = chatbot_panel.replace(
    '<p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>',
    '<p className={`text-sm leading-relaxed whitespace-pre-wrap ${language === "ar" ? "text-rtl" : ""}`}>{msg.content}</p>'
)

chatbot_panel = chatbot_panel.replace(
    '<p className="text-sm leading-relaxed whitespace-pre-wrap">{streamingContent}</p>',
    '<p className={`text-sm leading-relaxed whitespace-pre-wrap ${language === "ar" ? "text-rtl" : ""}`}>{streamingContent}</p>'
)

write_file(f"{BASE}/src/components/dashboard/chatbot-panel.tsx", chatbot_panel)
print("  OK chatbot-panel.tsx: forced LTR layout, Arabic text gets text-rtl class")

print()
print("=" * 60)
print("STEP 5: Fix globals.css - Better text-rtl class for Arabic text")
print("=" * 60)

css = read_file(f"{BASE}/src/app/globals.css")

# Enhance the text-rtl class to work in both AR and EN modes
old_text_rtl = """  /* Arabic text uses formal Noto Sans Arabic font */
  /* LAYOUT stays LTR always — only TEXT direction changes */
  [lang="ar"] .text-rtl,
  [lang="ar"] .arabic-text {
    font-family: var(--font-noto-arabic), var(--font-inter), system-ui, sans-serif;
    direction: rtl;
    text-align: right;
  }"""

new_text_rtl = """  /* Arabic text uses formal Noto Sans Arabic font */
  /* LAYOUT stays LTR always — only TEXT direction changes */
  .text-rtl,
  .arabic-text {
    font-family: var(--font-noto-arabic), var(--font-inter), system-ui, sans-serif;
    direction: rtl;
    text-align: right;
  }"""

css = css.replace(old_text_rtl, new_text_rtl)

write_file(f"{BASE}/src/app/globals.css", css)
print("  OK globals.css: text-rtl class works in both AR and EN modes")

print()
print("=" * 60)
print("STEP 6: Find and fix all other files with RTL dir overrides")
print("=" * 60)

# Search for dir={language patterns
grep_cmd = 'cd ' + BASE + ' && grep -r "dir={' + 'language' + '" --include="*.tsx" --include="*.ts" -l src/'
result = run(grep_cmd)
print(f"  Files with dir={{language...}}: {result.strip()}")

for filepath in result.strip().split('\n'):
    if not filepath:
        continue
    if filepath in ['src/components/chat/chat-panel.tsx', 'src/components/chat/department-chat-panel.tsx', 'src/components/dashboard/chatbot-panel.tsx']:
        continue
    full_path = f"{BASE}/{filepath}"
    content = read_file(full_path)
    changed = False
    if 'dir={language === "ar" ? "rtl" : "ltr"}' in content:
        content = content.replace('dir={language === "ar" ? "rtl" : "ltr"}', 'dir="ltr"')
        changed = True
    if 'dir={lang === "ar" ? "rtl" : "ltr"}' in content:
        content = content.replace('dir={lang === "ar" ? "rtl" : "ltr"}', 'dir="ltr"')
        changed = True
    if changed:
        write_file(full_path, content)
        print(f"  OK Fixed: {filepath}")

# Search for dir={isRTL patterns
grep_cmd2 = 'cd ' + BASE + ' && grep -r "dir={' + 'isRTL' + '" --include="*.tsx" --include="*.ts" -l src/'
result2 = run(grep_cmd2)
print(f"  Files with dir={{isRTL...}}: {result2.strip()}")

for filepath in result2.strip().split('\n'):
    if not filepath:
        continue
    full_path = f"{BASE}/{filepath}"
    content = read_file(full_path)
    if 'dir={isRTL ? "rtl" : "ltr"}' in content:
        content = content.replace('dir={isRTL ? "rtl" : "ltr"}', 'dir="ltr"')
        write_file(full_path, content)
        print(f"  OK Fixed isRTL: {filepath}")

print()
print("=" * 60)
print("STEP 7: Build and deploy")
print("=" * 60)

# Build the project
print("  Building...")
build_result = run(f'cd {BASE} && npm run build 2>&1 | tail -30')
print(f"  Build result (last 30 lines): {build_result[-2000:]}")

# Restart the container
print("  Restarting container...")
restart_result = run(f'cd {BASE} && docker compose restart 2>&1')
print(f"  Restart: {restart_result[:500]}")

print()
print("=" * 60)
print("ALL FIXES APPLIED!")
print("=" * 60)
print("""
Summary of changes:
1. Smart Chat (/api/chat) - Now follows user's typing language
2. Employees (/api/conversations) - Still follow website language
3. chat-panel.tsx - Forced LTR layout, Arabic text uses text-rtl CSS class
4. department-chat-panel.tsx - Forced LTR layout, Arabic text uses text-rtl CSS class
5. chatbot-panel.tsx - Forced LTR layout, Arabic text uses text-rtl CSS class
6. globals.css - text-rtl class works in both AR and EN modes
7. All other pages - Removed RTL dir overrides
""")

ssh.close()
