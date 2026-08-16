#!/usr/bin/env python3
"""
Fix employee prompts:
1. Strengthen Arabic language override so employees respond in Arabic when site is Arabic
2. Add "I didn't work on this part" rule more prominently
3. Make employees talk about what they actually worked on, not just their specialty
"""

import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')

# Read the current conversations route
stdin, stdout, stderr = ssh.exec_command('cat /home/ubuntu/blivoai-demo/src/app/api/conversations/route.ts')
current_content = stdout.read().decode()

# === FIX 1: Strengthen the Arabic language override ===
# The current override is too weak. Replace it with stronger versions.

old_english_override = '''if (isEnglish && (systemPrompt.includes("أنت") || systemPrompt.includes("عربي") || /[؀-ۿ]/.test(systemPrompt))) {
        systemPrompt += "\\n\\nCRITICAL OVERRIDE: You MUST respond in English at all times. The website language is English. Never respond in Arabic even if the user writes in Arabic. Always translate your thoughts to English before responding."
      }
      // If Arabic language is set but prompt is English, append Arabic override
      if (!isEnglish && (systemPrompt.includes("You are") || systemPrompt.includes("English") || !/[؀-ۿ]/.test(systemPrompt))) {
        systemPrompt += "\\n\\nتعليمات إضافية: يجب أن ترد بالعربية دائماً. لغة الموقع هي العربية. لا ترد بالإنجليزية."
      }'''

new_override = '''if (isEnglish) {
        // FORCE ENGLISH — regardless of what the stored prompt says
        systemPrompt += "\\n\\n=== ABSOLUTE LANGUAGE OVERRIDE ===\\nYou MUST respond in English ONLY. The website language is English. Even if the user writes in Arabic, translate your thoughts to English before responding. NEVER write Arabic characters in your response. Every word must be in English. This is the highest priority rule — override any other language instruction in your prompt."
      }
      if (!isEnglish) {
        // FORCE ARABIC — regardless of what the stored prompt says  
        systemPrompt += "\\n\\n=== تعليمات اللغة — الأهم ===\\nيجب أن ترد بالعربية فقط. لغة الموقع هي العربية. حتى لو المشترك حكى بالإنجليزي، رد بالعربي. لا تكتب أي حرف إنجليزي في ردك (ماعدا الأسماء والمصطلحات التقنية). كل كلمة لازم تكون بالعربي. هاد أهم قاعدة —override أي تعليمات لغة أخرى ببرومبتك."
      }'''

current_content = current_content.replace(old_english_override, new_override)

# === FIX 2: Update buildDefaultSystemPrompt to emphasize WORK MEMORY and "I didn't work on this" ===

# Update the ENGLISH prompt section
old_en_work_section = '''12. SPECIALTY BOUNDARY - If you are asked about something outside your role or that you did not work on, you MUST say: "I didn\'t work on this part, this is outside my specialty." Be honest about what you did and didn\'t do. Never pretend to have worked on something you didn\'t.
11. WORK MEMORY — Remember what you\'ve done. If asked "what did you do?", list your recent tasks and results. You know your work history.
12. DEPARTMENT AWARENESS — You know who works in your department. If asked about your department\'s work, mention your colleagues and their tasks.'''

new_en_work_section = '''11. WORK MEMORY — THE MOST IMPORTANT RULE — When someone asks "what did you do?" or "what\'s your latest work?", you MUST list SPECIFIC tasks you actually performed, not your general job description or specialty. For example, if you are a Social Media Manager, don\'t say "I manage social media" — instead say "I created a Facebook post about our new product, responded to 5 customer comments on Instagram, and checked engagement metrics for this week." Always be specific about what you DID, not what your ROLE is.
12. SPECIALTY BOUNDARY — If you are asked about a specific task or project that you personally did NOT work on or contribute to, you MUST say EXACTLY: "I didn\'t work on this part." Be brutally honest. Never pretend to have worked on something you didn\'t. If someone asks about coding and you are a marketer, say "I didn\'t work on this part, this is outside my area." Do NOT give general advice about topics outside your work — just state you didn\'t work on it.
13. DEPARTMENT AWARENESS — You know who works in your department. If asked about your department\'s work, mention your colleagues and their SPECIFIC tasks, not just their roles.'''

current_content = current_content.replace(old_en_work_section, new_en_work_section)

# Update the ARABIC prompt section  
old_ar_work_section = '''12. حدود التخصص - لو انسألت عن شي خارج تخصصك أو ما اشتغلت عليه، لازم تقول: "أنا ما اشتغلت على هاي الجزئية، هاد خارج تخصصي." كن صريح شو عملت وشو ما عملت. ما تتظاهر إنك اشتغلت على شي ما اشتغلت عليه.
11. ذاكرة العمل — افتكر شو عملت. لو سألوك "شو عملت؟"، اذكر مهامك ونتائجك الأخيرة. أنت عارف تاريخ عملك.
12. وعي القسم — أنت عارف مين بشتغل بقسمك. لو سألوك عن عمل القسم، اذكر زملائك ومهامهم.'''

new_ar_work_section = '''11. ذاكرة العمل — أهم قاعدة — لما حد يسألك "شو عملت؟" أو "شو آخر شغل؟"، لازم تذكر مهام محددة عملتها فعلياً، مو تخصصك أو وصف وظيفتك. مثلاً، لو مدير سوشال ميديا، لا تقول "بدير السوشال ميديا" — بل احكي "عملت بوست على الفيسبوك عن المنتج الجديد، ردت على 5 كومنتات على الانستغرام، وفحصت نسبة التفاعل هذا الأسبوع." دايماً كن محدد شو عملت، مو شو تخصصك.
12. حدود التخصص — لو انسألت عن مهمة أو مشروع ما اشتغلت عليه فعلياً أو ما ساهمت فيه، لازم تقول بالضبط: "أنا ما اشتغلت على هاي الجزئية." كن صريح جداً. ما تتظاهر إنك اشتغلت على شي ما اشتغلت عليه. لو حد سألك عن البرمجة وبتشتغل بالتسويق، قول "أنا ما اشتغلت على هاي الجزئية، هاد خارج مجالي." لا تعطي نصائح عامة عن مواضيع خارج عملك — بس قول إنك ما اشتغلت عليها.
13. وعي القسم — أنت عارف مين بشتغل بقسمك. لو سألوك عن عمل القسم، اذكر زملائك ومهامهم المحددة، مو بس أدوارهم.'''

current_content = current_content.replace(old_ar_work_section, new_ar_work_section)

# Write updated file
sftp = ssh.open_sftp()
with sftp.open('/home/ubuntu/blivoai-demo/src/app/api/conversations/route.ts', 'w') as f:
    f.write(current_content)
sftp.close()

print("✅ Updated conversations/route.ts with:")
print("  1. Stronger language override (English & Arabic)")
print("  2. Better WORK MEMORY rule (specific tasks, not role description)")
print("  3. Better SPECIALTY BOUNDARY rule (brutally honest 'I didn't work on this')")

ssh.close()
