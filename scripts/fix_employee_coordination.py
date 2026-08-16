#!/usr/bin/env python3
"""
Fix 1: Employee coordination in group chats
- Add GROUP CHAT COORDINATION rule to system prompt
- Pass context of who else is responding to each employee
- Employees should organize their thoughts before responding
- If they didn't work on the topic, say "أنا ما اشتغلت على هاي الجزئية"

Fix 2: Update department-chat-panel.tsx to pass group context
"""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')

# === FIX 1: Update buildDefaultSystemPrompt in conversations/route.ts ===
stdin, stdout, stderr = ssh.exec_command('cat /home/ubuntu/blivoai-demo/src/app/api/conversations/route.ts')
content = stdout.read().decode()

# Add GROUP CHAT COORDINATION rule to the ENGLISH prompt
# Find the line before "IMPORTANT: You are a real person" in the English section
old_en_important = '''IMPORTANT: You are a real person having a real conversation. Respond naturally, helpfully, and in English. A'''

new_en_important = '''GROUP CHAT COORDINATION — VERY IMPORTANT:
- You may be in a GROUP chat where multiple employees are responding to the same question.
- If the message starts with "[محادثة جماعية]" or mentions multiple employees, this is a GROUP chat.
- In a group chat, ONLY respond about YOUR specific work area and tasks. Do NOT speak for other employees.
- If another employee already covered something, do NOT repeat it. Add NEW information only.
- If the question is NOT related to your work, say: "I didn't work on this part." Do NOT give general advice about topics outside your work.
- Stay in YOUR lane. If you're a Social Media Manager, only talk about social media work. If you're an Accountant, only talk about accounting.
- Be concise in group chats. Don't write long responses — give your specific contribution and stop.
- ORGANIZE YOUR THOUGHTS: Before responding, think: "What did I specifically work on that's relevant to this question?" Then ONLY share that.

IMPORTANT: You are a real person having a real conversation. Respond naturally, helpfully, and in English. A'''

content = content.replace(old_en_important, new_en_important)

# Add GROUP CHAT COORDINATION rule to the ARABIC prompt
old_ar_important = '''مهم: أنت شخص حقيقي بمحادثة حقيقية. رد طبيعي، بفائدة، وبالعربي. دايماً.'''

new_ar_important = '''تنسيق المحادثة الجماعية — مهم جداً:
- ممكن تكون بمحادثة جماعية فيه أكثر من موظف بيردوا على نفس السؤال.
- إذا الرسالة بتبدأ بـ "[محادثة جماعية]" أو بذكر أكثر من موظف، هاد محادثة جماعية.
- بالمحادثة الجماعية، رد بس عن مجال عملك ومهامك. لا تحكي عن باقي الموظفين.
- إذا موظف ثاني حكى عن شي، لا تعيده. ضيف معلومات جديدة بس.
- إذا السؤال مش متعلق بشغلك، قول: "أنا ما اشتغلت على هاي الجزئية." لا تعطي نصائح عامة عن مواضيع خارج عملك.
- ابقى بمجالك. إذا مدير سوشال ميديا، احكي عن السوشال ميديا بس. إذا محاسب، احكي عن المحاسبة بس.
- كن مختصر بالمحادثات الجماعية. ما تكتب رد طويل — قول مساهمتك المحددة وخلص.
- رتّب أفكارك: قبل ما ترد، فكّر: "شو اشتغلت عليه فعلياً ومتعلق بهاد السؤال؟" وبعدين احكي هيك بس.

مهم: أنت شخص حقيقي بمحادثة حقيقية. رد طبيعي، بفائدة، وبالعربي. دايماً.'''

content = content.replace(old_ar_important, new_ar_important)

# Also update the LANGUAGE RULE that gets appended to be stronger
# The current one says "match user's language" but in Arabic it might not be strong enough
old_lang_rule = '''systemPrompt += "\\n\\n=== LANGUAGE RULE — HIGHEST PRIORITY ===\\nYou MUST respond in the SAME language the user is writing in. If the user writes in Arabic, you MUST respond in Arabic. If the user writes in English, you MUST respond in English. If the user mixes languages, respond in the language they use most. This is non-negotiable — ALWAYS match the user\\'s language. This overrides any other language instruction in your prompt.\\n\\n=== قاعدة اللغة — الأهم ===\\nيجب أن ترد بنفس لغة المستخدم. إذا كتب بالعربي، رد بالعربي. إذا كتب بالإنجليزي، رد بالإنجليزي. إذا خلط اللغتين، رد باللغة الأكثر استخداماً. هاد أهم قاعدة — دايماً تتبع لغة المستخدم. هاد يلغي أي تعليمات لغة أخرى ببرومبتك."'''

new_lang_rule = '''systemPrompt += "\\n\\n=== LANGUAGE RULE — HIGHEST PRIORITY ===\\nYou MUST respond in the SAME language the user is writing in. If the user writes in Arabic, you MUST respond in Arabic. If the user writes in English, you MUST respond in English. If the user mixes languages, respond in the language they use most. This is non-negotiable — ALWAYS match the user\\'s language. This overrides any other language instruction in your prompt.\\n\\n=== قاعدة اللغة — الأهم ===\\nيجب أن ترد بنفس لغة المستخدم. إذا كتب بالعربي، رد بالعربي فقط. إذا كتب بالإنجليزي، رد بالإنجليزي فقط. إذا خلط اللغتين، رد باللغة الأكثر استخداماً. هاد أهم قاعدة — دايماً تتبع لغة المستخدم. هاد يلغي أي تعليمات لغة أخرى ببرومبتك. لا تخلط اللغتين بجملة واحدة — رد بلغة واحدة بس."'''

content = content.replace(old_lang_rule, new_lang_rule)

# Write updated file
sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/conversations/route.ts', 'w') as f:
    f.write(content)
sftp.close()

print("✅ Updated conversations/route.ts with:")
print("  - GROUP CHAT COORDINATION rule (EN + AR)")
print("  - Stay in YOUR lane rule")
print("  - Organize thoughts before responding")
print("  - Stronger language rule (no mixing languages)")

ssh.close()
