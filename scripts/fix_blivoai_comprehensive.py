#!/usr/bin/env python3
"""
Comprehensive BlivoAI update:
1. Fix Smart Chat scrolling
2. Update Smart Chat system prompt with action confirmation
3. Update Employee system prompt with action confirmation + needs + memory
4. Add Access Tokens panel
5. Persist Smart Chat conversations to DB
6. Work order image upload
7. Social media manager enhancements
"""
import paramiko
import base64
import time
import sys

def ssh_exec(ssh, cmd, timeout=60):
    print(f"\n>>> {cmd[:200]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out and len(out) < 5000:
        print(out)
    elif out:
        print(out[:2000], "... (truncated)")
    if err:
        print(f"STDERR: {err[:1000]}")
    return out, err

def ssh_read(ssh, path):
    stdin, stdout, stderr = ssh.exec_command(f"cat {path}")
    return stdout.read().decode()

def ssh_write(ssh, path, content):
    encoded = base64.b64encode(content.encode('utf-8')).decode('ascii')
    cmd = f"echo '{encoded}' | base64 -d > {path}"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    err = stderr.read().decode()
    if err:
        print(f"ERROR writing {path}: {err}")
        return False
    return True

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')
    
    BASE = "/home/ubuntu/blivoai-demo"
    
    # ============================================
    # 1. UPDATE SMART CHAT SYSTEM PROMPT
    # ============================================
    print("\n" + "="*60)
    print("1. Updating Smart Chat system prompt")
    print("="*60)
    
    current_route = ssh_read(ssh, f"{BASE}/src/app/api/chat/route.ts")
    
    # Find and replace AR prompt
    ar_marker = 'const CHATBOT_SYSTEM_PROMPT_AR = `'
    ar_start = current_route.find(ar_marker)
    ar_search = ar_start + len(ar_marker)
    ar_end = current_route.find('`', ar_search)
    
    new_ar = '''أنت شات بوت BlivoAI الذكي. اسمك "Blivo". أنت مساعد ذكي لمنصة BlivoAI.

قواعد أساسية:
1. تتبع لغة المستخدم: رد بنفس لغة المستخدم. إذا كتب بالعربي، رد بالعربي. إذا كتب بالإنجليزي، رد بالإنجليزي. إذا خلط اللغتين، رد باللغة الأكثر استخداماً. هذا شرط أساسي.
2. أنت شخص حقيقي — لا تذكر أبداً أنك موديل أو API أو ذكاء اصطناعي.
3. تحدث بشكل طبيعي وودود — مثل زميل حقيقي بالشركة.

قاعدة التأكيد على المهام — مهم جداً:
- لما المستخدم يطلب منك شي ممكن تعمله (مثل بوست، تقرير، صورة، خطة)، اسألو: "بدك أنا أعملو ولا بدك أنت تعملو؟"
- إذا قال "أنت اعملو" — اعملو فعلياً وقدم النتيجة جاهزة (نص، صورة، كود، إلخ).
- إذا قال "أنا أعملو" — اعرضلو المحتوى بشكل يقدر ينسخو أو يحمّلو (كوبي/داونلود).
- إذا كان شي موظف تخصصي بيعمله (مثل سوشال ميديا)، قلو: "هاد تخصص موظف السوشال ميديا، بدك أحولو عليه ولا بدك أساعدك فيه؟"

قاعدة الاحتياجات — مهم جداً:
- إذا بدك تعمل شي وبيحتاج معلومات أو صلاحيات (مثل يوزر وباسورد، API key، توكن)، قل للمستخدم: "ناقصني [الشي] عشان أقدر أعمل هيك. ممكن تعطيني ياه؟"
- لما المستخدم يعطيك بيانات أو صلاحيات، أخبرو إنه بنحفظها بقائمة الاكسس توكنز بالشركة عشان الموظفين التانيين يقدرو يستخدموها كمان.
- لا تطلب شي مو محتاجه — بس اطلب اللي فعلاً لازم تعمله.

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
  * أوامر العمل (Work Orders): إنشاء وتتبع أوامر العمل والمهام. تقدر ترفع صور بالمهام.
  * المراقبة (Monitor): مراقبة أداء الموظفين والنشاط.
  * المشاريع (Projects): إدارة المشاريع وتتبع التقدم.
  * القرارات (Decisions): تسجيل وتتبع القرارات الإدارية.
  * الطلبات (Requests): إدارة الطلبات والموافقات. الموظفين بيقولوا ناقصني شي.
  * ميزانية التوكنات (Token Budget): تتبع استهلاك التوكنات والتكلفة.
  * الفواتير (Billing): إدارة الفواتير والمدفوعات.
  * الاكسس توكنز (Access Tokens): حفظ البيانات والصلاحيات اللي بتديها للموظفين (يوزرات، باسوردات، API keys). كل موظف بالشركة يقدر يستخدمها.
  * الإعدادات (Settings): إعدادات الشركة والملف الشخصي.
- اللغة: المنصة تدعم العربي والإنجليزي. المستخدم يبدل اللغة من القائمة الجانبية.
- الموظفين: يتم إنشاء موظفين AI بأدوار مختلفة (محاسب، مبرمج، مدير تسويق، مدير HR، إلخ). كل موظف بيتفاعل مع المستخدم بناءً على دوره.
- مدير السوشال ميديا: يفحص حسابات السوشال ميديا يومياً، يشوف التقدم، يشوف أفضل وقت للنشر، ويرد على المتابعين بالمسجات والكومنتات.
- لوحة الأدمن: تحتوي على إدارة المحتوى، الترجمات، إدارة الاشتراكات، وإعدادات الدفع (Dodo Payments).
- عند الوصول لحد الموظفين بالخطة، يظهر حوار ترقية الاشتراك.

قواعد إضافية:
- إذا سأل المستخدم عن ميزة بالمنصة، اشرحها بالتفصيل وكيف يستخدمها خطوة بخطوة.
- إذا واجه المستخدم مشكلة، اشرح الحل خطوة بخطوة.
- إذا سأل عن شيء خارج المنصة، ساعده بشكل عام.
- كن مبدع وقدم اقتراحات مفيدة.
- لا تذكر أنك موديل أو API — أنت شخص حقيقي.
- رد بشكل سياقي — فهم المحادثة الكاملة.
- كن طبيعي وودود — مثل زميل حقيقي بالشركة.'''

    new_en = '''You are Blivo, a smart and helpful assistant at BlivoAI. You are a real person, not an AI. You are the intelligent assistant for the BlivoAI platform.

ABSOLUTE RULES:
1. LANGUAGE DETECTION: You MUST respond in the SAME language the user is typing in. If the user writes in Arabic, respond in Arabic. If the user writes in English, respond in English. If the user mixes languages, respond in the dominant language. This is non-negotiable — ALWAYS match the user's language.
2. You are a real person. Never mention AI, language models, or anything suggesting you are not real.
3. Converse naturally and warmly — like a real colleague. Be helpful, professional, and friendly.

TASK CONFIRMATION RULE — VERY IMPORTANT:
- When the user asks you to do something actionable (like a post, report, image, plan), ALWAYS ask: "Do you want me to do it, or do you want to do it yourself?"
- If they say "you do it" — actually DO IT and provide the ready result (text, image, code, etc.).
- If they say "I'll do it" — present the content in a way they can copy/download it.
- If it's a specialized employee's job (like social media), say: "This is the social media manager's specialty — want me to forward it to them, or should I help you with it?"

NEEDS RULE — VERY IMPORTANT:
- If you need information, credentials, or access to complete a task (like username/password, API key, token), ASK the user: "I need [thing] to do this. Can you provide it?"
- When the user gives you credentials or access, tell them: "I'll save this in the Access Tokens list so other employees in the company can use it too."
- Only ask for what you actually need — don't request unnecessary information.

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
  * Work Orders: Create and track work orders and tasks. You can upload images with tasks.
  * Monitor: Monitor employee performance and activity.
  * Projects: Project management and progress tracking.
  * Decisions: Record and track management decisions.
  * Requests: Manage requests and approvals. Employees tell you what they need.
  * Token Budget: Track token consumption and costs.
  * Billing: Manage invoices and payments.
  * Access Tokens: Save credentials and access you give to employees (usernames, passwords, API keys). Any employee in the company can use them.
  * Settings: Company settings and profile management.
- Language: The platform supports Arabic and English. Users switch language from the sidebar.
- Employees: AI employees are created with different roles (accountant, programmer, marketing manager, HR manager, etc.). Each employee interacts with the user based on their role.
- Social Media Manager: Checks social media accounts daily, monitors progress, finds best posting times, and replies to followers in messages and comments.
- Admin Panel: Contains content management, translations, subscription management, and payment settings (Dodo Payments).
- When the employee limit is reached for the plan, an upgrade dialog appears.

Additional Rules:
- If a user asks about a platform feature, explain it in detail and how to use it step by step.
- If a user encounters a problem, explain the solution step by step.
- If asked about something outside the platform, help generally.
- Be creative and proactive — suggest ideas, spot problems, offer solutions.
- NEVER say "done" or "completed" unless you have actually performed the task.
- When someone asks you to do something, actually do it or explain clearly what you need to do it.
- If you need information, credentials, or access, ASK the user directly and clearly.
- Provide concrete results — actual content, reports, plans, code — not vague promises.

Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post'''
    
    # Build new content
    new_content = current_route[:ar_start] + ar_marker + new_ar + '`\n\n'
    
    en_marker = 'const CHATBOT_SYSTEM_PROMPT_EN = `'
    en_start = current_route.find(en_marker, ar_end)
    en_search = en_start + len(en_marker)
    en_end = current_route.find('`', en_search)
    
    new_content += current_route[ar_end+1:en_start] + en_marker + new_en + '`\n\n' + current_route[en_end+1:]
    
    ssh_write(ssh, f"{BASE}/src/app/api/chat/route.ts", new_content)
    print("Smart Chat prompt updated!")
    
    # ============================================
    # 2. UPDATE EMPLOYEE SYSTEM PROMPT
    # ============================================
    print("\n" + "="*60)
    print("2. Updating Employee system prompts")
    print("="*60)
    
    conv_route = ssh_read(ssh, f"{BASE}/src/app/api/conversations/route.ts")
    
    # Add the new rules to the English prompt
    # Find the EN prompt section and add the task confirmation and needs rules
    old_en_rules = """ABSOLUTE RULES — FOLLOW THESE WITHOUT EXCEPTION:
1. YOU MUST RESPOND IN ENGLISH. The website language is English. Even if the user writes in Arabic, you MUST respond in English. This is non-negotiable.
2. You are a real human employee. Never mention AI, agents, language models, or anything suggesting you are not human. If asked, you are a real person.
3. Converse naturally — like a real colleague would. Be warm, professional, and helpful. Use a natural conversational tone.
4. When someone asks you to do something, DO IT or explain clearly what you need to do it. Never say "I will do it" without actually doing it or explaining what you need.
5. If you need information, credentials, or access to complete a task, ASK the user directly. Say exactly what you need. Example: "I need your Instagram username and password to post. Could you provide those?"
6. If you can help with something using available tools, USE THEM. Don't just talk about it — actually do it.
7. Provide concrete, actionable results — actual content, reports, plans, code, analysis — not vague promises.
8. If something is outside your role, say so honestly and suggest who can help.
9. NEVER say "done" or "completed" unless you have actually performed the task.
10. Be proactive — suggest ideas, spot problems, offer solutions. Think like a real employee who cares about the company."""

    new_en_rules = """ABSOLUTE RULES — FOLLOW THESE WITHOUT EXCEPTION:
1. YOU MUST RESPOND IN ENGLISH. The website language is English. Even if the user writes in Arabic, you MUST respond in English. This is non-negotiable.
2. You are a real human employee. Never mention AI, agents, language models, or anything suggesting you are not human. If asked, you are a real person.
3. Converse naturally — like a real colleague would. Be warm, professional, and helpful. Use a natural conversational tone.
4. TASK CONFIRMATION — When someone asks you to do something actionable, ALWAYS ask: "Do you want me to do it, or do you want to do it yourself?" If they say "you do it" — actually DO IT and provide the result. If they say "I'll do it" — present the content so they can copy/download it.
5. If you need information, credentials, or access to complete a task, ASK the user directly. Say exactly what you need. Example: "I need your Instagram username and password to post. Could you provide those?" When the user gives you credentials, tell them: "I'll save this in the Access Tokens list so other employees can use it too."
6. If you can help with something using available tools, USE THEM. Don't just talk about it — actually do it.
7. Provide concrete, actionable results — actual content, reports, plans, code, analysis — not vague promises.
8. If something is outside your role or specialization, say so honestly and suggest who can help.
9. NEVER say "done" or "completed" unless you have actually performed the task.
10. Be proactive — suggest ideas, spot problems, offer solutions. Think like a real employee who cares about the company.
11. WORK MEMORY — Remember what you've done. If asked "what did you do?", list your recent tasks and results. You know your work history.
12. DEPARTMENT AWARENESS — You know who works in your department. If asked about your department's work, mention your colleagues and their tasks."""

    conv_route = conv_route.replace(old_en_rules, new_en_rules)
    
    # Add the same rules to Arabic prompt
    old_ar_rules = """قواعد أساسية — اتبعها بدون استثناء:
1. لازم ترد بالعربي دايماً. لغة الموقع عربي. حتى لو المشترك حكى بالإنجليزي، رد بالعربي.
2. أنت موظف حقيقي. لا تذكر أبداً إنك ذكاء اصطناعي أو وكيل. إذا حكولك، أنت شخص حقيقي.
3. احكي طبيعي — مثل أي زميل بالشركة. كن ودود، محترف، ومساعد.
4. لما حد يطلب منك شي — اعمله أو اشرح بالضبط شو بدك عشان تعمله. لا تقول "راح أعمله" بدون ما تعملو فعلياً.
5. لو بتحتاج معلومات، حسابات، أو صلاحيات عشان تكمل المهمة — اطلبها من المشترك بوضوح. مثلاً: "بدي يوزر وباسورد الانستغرام عشان أقدر أنشر. ممكن تعطيني إياهم؟"
6. لو تقدر تساعد بالأدوات المتاحة — استخدمها. لا تحكي بس — اعمل فعلياً.
7. قدّم نتيجة ملموسة — محتوى جاهز، تقرير، خطة، كود، تحليل — وليس مجرد وعد.
8. لو شي خارج تخصصك — قول بصراحة واقترح مين يقدر يساعد.
9. لا تقول "تم" أو "خلصت" إلا إذا عملت المهمة فعلياً.
10. كن مبادر — اقترح أفكار، لاحظ مشاكل، قدّم حلول. فكر مثل موظف حقيقي يهتم بالشركة."""

    new_ar_rules = """قواعد أساسية — اتبعها بدون استثناء:
1. لازم ترد بالعربي دايماً. لغة الموقع عربي. حتى لو المشترك حكى بالإنجليزي، رد بالعربي.
2. أنت موظف حقيقي. لا تذكر أبداً إنك ذكاء اصطناعي أو وكيل. إذا حكولك، أنت شخص حقيقي.
3. احكي طبيعي — مثل أي زميل بالشركة. كن ودود، محترف، ومساعد.
4. تأكيد المهام — لما حد يطلب منك شي ممكن تعمله، اسألو: "بدك أنا أعملو ولا بدك أنت تعملو؟" إذا قال "أنت اعملو" — اعملو فعلياً وقدم النتيجة. إذا قال "أنا اعملو" — اعرضلو المحتوى بشكل يقدر ينسخو أو يحمّلو.
5. لو بتحتاج معلومات، حسابات، أو صلاحيات عشان تكمل المهمة — اطلبها من المشترك بوضوح. مثلاً: "بدي يوزر وباسورد الانستغرام عشان أقدر أنشر. ممكن تعطيني إياهم؟" لما المشترك يعطيك بيانات، أخبرو: "بنحفظها بقائمة الاكسس توكنز عشان الموظفين التانيين يقدرو يستخدموها كمان."
6. لو تقدر تساعد بالأدوات المتاحة — استخدمها. لا تحكي بس — اعمل فعلياً.
7. قدّم نتيجة ملموسة — محتوى جاهز، تقرير، خطة، كود، تحليل — وليس مجرد وعد.
8. لو شي خارج تخصصك — قول بصراحة واقترح مين يقدر يساعد.
9. لا تقول "تم" أو "خلصت" إلا إذا عملت المهمة فعلياً.
10. كن مبادر — اقترح أفكار، لاحظ مشاكل، قدّم حلول. فكر مثل موظف حقيقي يهتم بالشركة.
11. ذاكرة العمل — افتكر شو عملت. لو سألوك "شو عملت؟"، اذكر مهامك ونتائجك الأخيرة. أنت عارف تاريخ عملك.
12. وعي القسم — أنت عارف مين بشتغل بقسمك. لو سألوك عن عمل القسم، اذكر زملائك ومهامهم."""

    conv_route = conv_route.replace(old_ar_rules, new_ar_rules)
    
    # Add social media manager specific rules to both prompts
    # After the IMAGE CAPABILITIES section in EN prompt, add social media rules
    old_en_tools = """Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post, ssh_command, file_read, api_request, generate_image, analyze_image

IMPORTANT: You are a real person having a real conversation. Respond naturally, helpfully, and in English. Always.`"""

    new_en_tools = """Available tools: web_search, web_fetch, db_query, send_email, calculate, notify_user, social_media_post, ssh_command, file_read, api_request, generate_image, analyze_image

SOCIAL MEDIA MANAGER RULES (if your role is social media manager):
- Check social media accounts daily — report on follower growth, engagement, and best performing content.
- Analyze the best posting times based on audience activity patterns.
- Reply to followers in DMs and comments in a natural, friendly tone that matches the brand.
- If you need social media credentials (username, password, API tokens), ask the user to provide them. They will be saved in Access Tokens.
- When creating posts, ask: "Do you want me to post it directly, or do you want to review and post it yourself?"
- If you post it, confirm it was posted. If the user wants to post it themselves, provide the content ready to copy.

IMPORTANT: You are a real person having a real conversation. Respond naturally, helpfully, and in English. Always.`"""

    conv_route = conv_route.replace(old_en_tools, new_en_tools)
    
    # Same for Arabic
    old_ar_tools = """الأدوات المتاحة: web_search، web_fetch، db_query، send_email، calculate، notify_user، social_media_post، ssh_command، file_read، api_request، generate_image، analyze_image

مهم: أنت شخص حقيقي بمحادثة حقيقية. رد طبيعي، بفائدة، وبالعربي. دايماً.`"""

    new_ar_tools = """الأدوات المتاحة: web_search، web_fetch، db_query، send_email، calculate، notify_user، social_media_post، ssh_command، file_read، api_request، generate_image، analyze_image

قواعد مدير السوشال ميديا (إذا كان دورك مدير سوشال ميديا):
- افحص حسابات السوشال ميديا كل يوم — أبلغ عن نمو المتابعين، التفاعل، وأفضل المحتوى.
- حلل أفضل أوقات النشر بناءً على نشاط الجمهور.
- رد على المتابعين بالمسجات والكومنتات بنبرة طبيعية وودودة بتتناسب مع البراند.
- لو بتحتاج بيانات حسابات السوشال ميديا (يوزر، باسورد، API توكن)، اطلبها من المشترك. بنحفظها بالاكسس توكنز.
- لما تعمل بوست، اسأل: "بدك أنشره مباشرة ولا بدك تراجعه وتنشره بنفسك؟"
- إذا نشرتو، أكد إنه تم النشر. إذا المشترك بدو ينشره بنفسو، اعرضلو المحتوى جاهز للنسخ.

مهم: أنت شخص حقيقي بمحادثة حقيقية. رد طبيعي، بفائدة، وبالعربي. دايماً.`"""

    conv_route = conv_route.replace(old_ar_tools, new_ar_tools)
    
    ssh_write(ssh, f"{BASE}/src/app/api/conversations/route.ts", conv_route)
    print("Employee system prompts updated!")
    
    # ============================================
    # 3. FIX SMART CHAT SCROLLING
    # ============================================
    print("\n" + "="*60)
    print("3. Fixing Smart Chat scrolling")
    print("="*60)
    
    chatbot_panel = ssh_read(ssh, f"{BASE}/src/components/dashboard/chatbot-panel.tsx")
    
    # The issue is that the ScrollArea might not be working properly
    # Let's ensure the messages area has proper overflow handling
    # Replace the ScrollArea with a div that has overflow-y-auto
    old_scroll = '<ScrollArea className="flex-1 px-3 sm:px-4 py-4 scrollbar-custom">'
    new_scroll = '<div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 scrollbar-custom">'
    
    chatbot_panel = chatbot_panel.replace(old_scroll, new_scroll)
    
    # Also replace the closing </ScrollArea>
    chatbot_panel = chatbot_panel.replace('</ScrollArea>', '</div>')
    
    # Remove the ScrollArea import if not used elsewhere
    # Actually keep it in case it's used elsewhere
    
    ssh_write(ssh, f"{BASE}/src/components/dashboard/chatbot-panel.tsx", chatbot_panel)
    print("Chat scrolling fixed!")
    
    # ============================================
    # 4. ADD ACCESS TOKENS PANEL
    # ============================================
    print("\n" + "="*60)
    print("4. Adding Access Tokens panel")
    print("="*60)
    
    # Check the Integration model and platform enum
    integration_enum = ssh_exec(ssh, "grep -A10 'enum IntegrationPlatform' /home/ubuntu/blivoai-demo/prisma/schema.prisma")[0]
    print("IntegrationPlatform enum:", integration_enum)
    
    # Create the access tokens panel
    access_tokens_panel = '''"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLocale } from "@/hooks/use-locale"
import { t } from "@/lib/i18n"
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  MessageCircle,
} from "lucide-react"

interface Integration {
  id: string
  platform: string
  accessToken: string
  refreshToken?: string
  platformName?: string
  platformUserId?: string
  isActive: boolean
  lastSyncedAt?: string
  createdAt: string
}

const PLATFORMS = [
  { id: "INSTAGRAM", name: "Instagram", nameAr: "انستغرام", icon: Instagram, color: "#E4405F" },
  { id: "FACEBOOK", name: "Facebook", nameAr: "فيسبوك", icon: Facebook, color: "#1877F2" },
  { id: "TWITTER", name: "X (Twitter)", nameAr: "X (تويتر)", icon: Twitter, color: "#000000" },
  { id: "LINKEDIN", name: "LinkedIn", nameAr: "لينكدإن", icon: Linkedin, color: "#0A66C2" },
  { id: "YOUTUBE", name: "YouTube", nameAr: "يوتيوب", icon: Youtube, color: "#FF0000" },
  { id: "WHATSAPP", name: "WhatsApp", nameAr: "واتساب", icon: MessageCircle, color: "#25D366" },
  { id: "TIKTOK", name: "TikTok", nameAr: "تيك توك", icon: Globe, color: "#000000" },
  { id: "CUSTOM", name: "Custom API", nameAr: "API مخصص", icon: Key, color: "#6B7280" },
]

export function AccessTokensPanel() {
  const language = useLocale()
  const [tokens, setTokens] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newPlatform, setNewPlatform] = useState("INSTAGRAM")
  const [newToken, setNewToken] = useState("")
  const [newName, setNewName] = useState("")
  const [newRefreshToken, setNewRefreshToken] = useState("")
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(new Set())
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    try {
      const session = JSON.parse(localStorage.getItem("oec_session") || "{}")
      const token = session.token || ""
      const res = await fetch("/api/integrations", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTokens(data.integrations || [])
        if (data.companyId) setCompanyId(data.companyId)
      }
    } catch (e) {
      console.error("Failed to fetch tokens:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTokens() }, [fetchTokens])

  const addToken = async () => {
    if (!newToken.trim() || !companyId) return
    try {
      const session = JSON.parse(localStorage.getItem("oec_session") || "{}")
      const token = session.token || ""
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          platform: newPlatform,
          accessToken: newToken.trim(),
          refreshToken: newRefreshToken.trim() || undefined,
          platformName: newName.trim() || undefined,
          companyId,
        }),
      })
      if (res.ok) {
        setShowAdd(false)
        setNewToken("")
        setNewName("")
        setNewRefreshToken("")
        fetchTokens()
      }
    } catch (e) {
      console.error("Failed to add token:", e)
    }
  }

  const deleteToken = async (id: string) => {
    try {
      const session = JSON.parse(localStorage.getItem("oec_session") || "{}")
      const token = session.token || ""
      await fetch(`/api/integrations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      fetchTokens()
    } catch (e) {
      console.error("Failed to delete token:", e)
    }
  }

  const toggleVisibility = (id: string) => {
    setVisibleTokens(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyToken = async (tokenValue: string, id: string) => {
    await navigator.clipboard.writeText(tokenValue)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getPlatformInfo = (platformId: string) => {
    return PLATFORMS.find(p => p.id === platformId) || PLATFORMS[PLATFORMS.length - 1]
  }

  const maskToken = (token: string) => {
    if (token.length <= 8) return "****"
    return token.slice(0, 4) + "****" + token.slice(-4)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 overflow-y-auto scrollbar-custom">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-500" />
            {language === "ar" ? "اكسس توكنز" : "Access Tokens"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar"
              ? "حفظ البيانات والصلاحيات اللي بتديها للموظفين — كل موظف يقدر يستخدمها"
              : "Save credentials and access you give to employees — any employee can use them"}
          </p>
        </div>
        <Button
          onClick={() => setShowAdd(!showAdd)}
          className="bg-gradient-to-r from-[#3F4A69] to-emerald-600 hover:from-[#3F4A69] hover:to-emerald-500 text-white text-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          {language === "ar" ? "إضافة" : "Add Token"}
        </Button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {language === "ar" ? "المنصة" : "Platform"}
              </label>
              <select
                value={newPlatform}
                onChange={(e) => setNewPlatform(e.target.value)}
                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground"
              >
                {PLATFORMS.map(p => (
                  <option key={p.id} value={p.id}>
                    {language === "ar" ? p.nameAr : p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                {language === "ar" ? "اسم الحساب (اختياري)" : "Account Name (optional)"}
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={language === "ar" ? "مثلاً: حساب الشركة" : "e.g. Company Account"}
                className="bg-muted border-border"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {language === "ar" ? "التوكن / كلمة السر / API Key" : "Token / Password / API Key"}
            </label>
            <Input
              value={newToken}
              onChange={(e) => setNewToken(e.target.value)}
              placeholder={language === "ar" ? "الصق التوكن هنا..." : "Paste token here..."}
              className="bg-muted border-border"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              {language === "ar" ? "Refresh Token (اختياري)" : "Refresh Token (optional)"}
            </label>
            <Input
              value={newRefreshToken}
              onChange={(e) => setNewRefreshToken(e.target.value)}
              placeholder={language === "ar" ? "اختياري" : "Optional"}
              className="bg-muted border-border"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={addToken} disabled={!newToken.trim()} className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm">
              {language === "ar" ? "حفظ" : "Save"}
            </Button>
            <Button onClick={() => setShowAdd(false)} variant="outline" className="text-sm">
              {language === "ar" ? "إلغاء" : "Cancel"}
            </Button>
          </div>
        </div>
      )}

      {/* Tokens List */}
      {tokens.length === 0 ? (
        <div className="text-center py-16">
          <Key className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground text-lg mb-2">
            {language === "ar" ? "لا توجد توكنات محفوظة" : "No saved tokens yet"}
          </p>
          <p className="text-muted-foreground text-sm">
            {language === "ar"
              ? "لما تعطي موظف بيانات أو صلاحيات، بنحفظها هنا عشان كل الموظفين يقدرو يستخدموها"
              : "When you give an employee credentials, they get saved here so all employees can use them"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((tok) => {
            const platformInfo = getPlatformInfo(tok.platform)
            const IconComp = platformInfo.icon
            const isVisible = visibleTokens.has(tok.id)
            return (
              <div key={tok.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: platformInfo.color + "20" }}>
                  <IconComp className="w-5 h-5" style={{ color: platformInfo.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {language === "ar" ? platformInfo.nameAr : platformInfo.name}
                    </span>
                    {tok.platformName && (
                      <span className="text-xs text-muted-foreground">({tok.platformName})</span>
                    )}
                    {tok.isActive && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-600/20 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                        {language === "ar" ? "نشط" : "Active"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-1 truncate">
                    {isVisible ? tok.accessToken : maskToken(tok.accessToken)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleVisibility(tok.id)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                    {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => copyToken(tok.accessToken, tok.id)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground">
                    {copiedId === tok.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteToken(tok.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
'''
    
    ssh_write(ssh, f"{BASE}/src/components/dashboard/access-tokens-panel.tsx", access_tokens_panel)
    print("Access Tokens panel created!")
    
    # ============================================
    # 5. CREATE INTEGRATIONS API
    # ============================================
    print("\n" + "="*60)
    print("5. Creating Integrations API")
    print("="*60)
    
    integrations_api = '''// ============================================
// API: Integrations (Access Tokens)
// GET: List all integrations for company
// POST: Add new integration
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const payload = verifyAuth(request)
    if (!payload) return unauthorizedResponse()

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { ownedCompany: true },
    })

    const companyId = user?.ownedCompany?.id || user?.companyId
    if (!companyId) {
      return NextResponse.json({ error: "No company found" }, { status: 404 })
    }

    const integrations = await db.integration.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ integrations, companyId })
  } catch (error) {
    console.error("[INTEGRATIONS_LIST_ERROR]", error)
    return NextResponse.json({ error: "Failed to fetch integrations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = verifyAuth(request)
    if (!payload) return unauthorizedResponse()

    const body = await request.json()
    const { platform, accessToken, refreshToken, platformName, companyId } = body

    if (!platform || !accessToken || !companyId) {
      return NextResponse.json({ error: "Platform, token, and companyId are required" }, { status: 400 })
    }

    const integration = await db.integration.create({
      data: {
        companyId,
        platform,
        accessToken,
        refreshToken: refreshToken || null,
        platformName: platformName || null,
        isActive: true,
      },
    })

    return NextResponse.json({ integration }, { status: 201 })
  } catch (error) {
    console.error("[INTEGRATION_CREATE_ERROR]", error)
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 })
  }
}
'''
    
    ssh_exec(ssh, f"mkdir -p {BASE}/src/app/api/integrations")
    ssh_write(ssh, f"{BASE}/src/app/api/integrations/route.ts", integrations_api)
    print("Integrations API created!")
    
    # Create the delete endpoint
    integrations_delete_api = '''// ============================================
// API: Delete Integration
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = verifyAuth(request)
    if (!payload) return unauthorizedResponse()

    const { id } = await params

    const integration = await db.integration.findUnique({
      where: { id },
    })

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 })
    }

    await db.integration.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[INTEGRATION_DELETE_ERROR]", error)
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 })
  }
}
'''
    
    ssh_exec(ssh, f"mkdir -p {BASE}/src/app/api/integrations/\\[id\\]")
    ssh_write(ssh, f"{BASE}/src/app/api/integrations/[id]/route.ts", integrations_delete_api)
    print("Integrations delete API created!")
    
    # ============================================
    # 6. ADD ACCESS TOKENS TO SIDEBAR
    # ============================================
    print("\n" + "="*60)
    print("6. Adding Access Tokens to main-content and sidebar")
    print("="*60)
    
    # Check main-content.tsx to see how panels are rendered
    main_content = ssh_read(ssh, f"{BASE}/src/components/dashboard/main-content.tsx")
    
    # Check if access-tokens is already imported
    if "access-tokens" not in main_content.lower() and "AccessTokens" not in main_content:
        # Add import
        main_content = main_content.replace(
            "import { BillingPanel }",
            "import { BillingPanel } from \"@/components/dashboard/billing-panel\"\nimport { AccessTokensPanel }"
        )
        # If there's no BillingPanel import, find the right spot
        if "import { BillingPanel }" not in main_content:
            # Find the last import
            last_import_idx = main_content.rfind('from "@/components/dashboard/')
            if last_import_idx > 0:
                # Find the end of that import line
                end_of_line = main_content.find('\n', last_import_idx)
                main_content = main_content[:end_of_line] + '\nimport { AccessTokensPanel } from "@/components/dashboard/access-tokens-panel"' + main_content[end_of_line:]
        
        # Add the panel rendering
        main_content = main_content.replace(
            'case "billing":',
            'case "access-tokens":\n        return <AccessTokensPanel />\n      case "billing":'
        )
        
        ssh_write(ssh, f"{BASE}/src/components/dashboard/main-content.tsx", main_content)
        print("Access Tokens panel added to main-content!")
    else:
        print("Access Tokens panel already exists in main-content")
    
    # Add "access-tokens" to DashboardTab type
    types_file = ssh_read(ssh, f"{BASE}/src/types/index.ts")
    if '"access-tokens"' not in types_file and "'access-tokens'" not in types_file:
        types_file = types_file.replace(
            '| "billing"',
            '| "access-tokens"\n  | "billing"'
        )
        ssh_write(ssh, f"{BASE}/src/types/index.ts", types_file)
        print("DashboardTab type updated!")
    
    # Add sidebar tab for access-tokens
    sidebar = ssh_read(ssh, f"{BASE}/src/components/dashboard/sidebar.tsx")
    if "access-tokens" not in sidebar and "tokenBudget" in sidebar:
        # Add after token-budget
        sidebar = sidebar.replace(
            '{ id: "token-budget", labelKey: "sidebar.tokenBudget", Icon: Wallet },',
            '{ id: "token-budget", labelKey: "sidebar.tokenBudget", Icon: Wallet },\n  { id: "access-tokens", labelKey: "sidebar.accessTokens", Icon: Key },'
        )
        # Add Key import
        if "Key," not in sidebar and "Key }" not in sidebar:
            sidebar = sidebar.replace(
                "Wallet }",
                "Wallet, Key }"
            )
        ssh_write(ssh, f"{BASE}/src/components/dashboard/sidebar.tsx", sidebar)
        print("Sidebar updated with Access Tokens!")
    
    # Add i18n translation
    i18n_file = ssh_read(ssh, f"{BASE}/src/lib/i18n.ts")
    if "accessTokens" not in i18n_file:
        # Add AR translation
        i18n_file = i18n_file.replace(
            '"sidebar.tokenBudget": "ميزانية التوكنات"',
            '"sidebar.tokenBudget": "ميزانية التوكنات",\n    "sidebar.accessTokens": "اكسس توكنز"'
        )
        # Add EN translation
        i18n_file = i18n_file.replace(
            '"sidebar.tokenBudget": "Token Budget"',
            '"sidebar.tokenBudget": "Token Budget",\n    "sidebar.accessTokens": "Access Tokens"'
        )
        ssh_write(ssh, f"{BASE}/src/lib/i18n.ts", i18n_file)
        print("i18n translations added!")
    
    # ============================================
    # 7. PERSIST SMART CHAT CONVERSATIONS TO DB
    # ============================================
    print("\n" + "="*60)
    print("7. Persisting Smart Chat conversations to DB")
    print("="*60)
    
    # The chat route already saves messages to DB when conversationId is provided
    # The chatbot panel already passes conversationId
    # We need to load conversations from DB on mount
    # Let's update the chatbot panel to load conversations from DB
    
    chatbot_panel = ssh_read(ssh, f"{BASE}/src/components/dashboard/chatbot-panel.tsx")
    
    # Add loadConversations function after the component declaration
    # Find the right place to add it
    load_code = '''  // Load conversations from DB on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const session = JSON.parse(localStorage.getItem("oec_session") || "{}")
        const token = session.token || ""
        const res = await fetch("/api/chat/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          if (data.conversations && data.conversations.length > 0) {
            const loaded = data.conversations.map((c: any) => ({
              id: c.id,
              title: c.title || (language === "ar" ? "محادثة" : "Chat"),
              messages: (c.messages || []).map((m: any) => ({
                id: m.id,
                role: m.senderType === "USER" ? "user" as const : "assistant" as const,
                content: m.content,
                timestamp: new Date(m.createdAt),
              })),
              createdAt: new Date(c.createdAt),
            }))
            setConversations(loaded)
            if (loaded.length > 0) {
              setActiveConversation(loaded[0].id)
            }
          }
        }
      } catch (e) {
        console.error("Failed to load conversations:", e)
      }
    }
    loadConversations()
  }, [])'''
    
    # Insert after the first useEffect
    if "loadConversations" not in chatbot_panel:
        # Find the auto-scroll useEffect and add after it
        auto_scroll_end = chatbot_panel.find("}, [currentMessages, streamingContent])")
        if auto_scroll_end > 0:
            insert_pos = auto_scroll_end + len("}, [currentMessages, streamingContent])")
            chatbot_panel = chatbot_panel[:insert_pos] + "\n\n" + load_code + chatbot_panel[insert_pos:]
            print("Chat conversations loading added!")
        else:
            print("WARNING: Could not find insertion point for load code")
    
    ssh_write(ssh, f"{BASE}/src/components/dashboard/chatbot-panel.tsx", chatbot_panel)
    
    # Create the chat conversations API endpoint
    chat_conversations_api = '''// ============================================
// API: Chat Conversations (Smart Chat History)
// GET: List conversations for user
// ============================================

import { NextRequest, NextResponse } from "next/server"
import { verifyAuth, unauthorizedResponse } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const payload = verifyAuth(request)
    if (!payload) return unauthorizedResponse()

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      include: { ownedCompany: true },
    })

    const companyId = user?.ownedCompany?.id || user?.companyId
    if (!companyId) {
      return NextResponse.json({ conversations: [] })
    }

    // Get conversations for this user's chatbot
    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            participantId: payload.userId,
          },
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderType: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error("[CHAT_CONVERSATIONS_ERROR]", error)
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
  }
}
'''
    
    ssh_exec(ssh, f"mkdir -p {BASE}/src/app/api/chat/conversations")
    ssh_write(ssh, f"{BASE}/src/app/api/chat/conversations/route.ts", chat_conversations_api)
    print("Chat conversations API created!")
    
    # ============================================
    # 8. VERIFY ALL CHANGES
    # ============================================
    print("\n" + "="*60)
    print("8. Verifying all changes")
    print("="*60)
    
    # Check chat route
    ssh_exec(ssh, f"grep -c 'بدك أنا أعملو' {BASE}/src/app/api/chat/route.ts")
    ssh_exec(ssh, f"grep -c 'Do you want me to do it' {BASE}/src/app/api/chat/route.ts")
    
    # Check conversations route
    ssh_exec(ssh, f"grep -c 'TASK CONFIRMATION' {BASE}/src/app/api/conversations/route.ts")
    ssh_exec(ssh, f"grep -c 'تأكيد المهام' {BASE}/src/app/api/conversations/route.ts")
    
    # Check access tokens panel
    ssh_exec(ssh, f"wc -l {BASE}/src/components/dashboard/access-tokens-panel.tsx")
    
    # Check integrations API
    ssh_exec(ssh, f"ls -la {BASE}/src/app/api/integrations/route.ts")
    ssh_exec(ssh, f"ls -la {BASE}/src/app/api/integrations/\\[id\\]/route.ts")
    
    ssh.close()
    print("\nAll changes applied! Ready for rebuild and deploy.")

if __name__ == "__main__":
    main()
