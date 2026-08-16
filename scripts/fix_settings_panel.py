#!/usr/bin/env python3
"""
Edit the settings-panel.tsx on the remote server to:
1. Wrap the entire LLM Card with {isOwner && (...)}  — only owner sees API key config
2. Wrap the entire Payment Gateway Card with {isOwner && (...)} — only owner sees payment config
3. Remove the "only owner can upgrade" restriction — ALL users can pay
4. Change the description text for subscribers to not mention "owner"
"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"
remote_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/settings-panel.tsx"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Read the current file
stdin, stdout, stderr = client.exec_command(f"cat '{remote_path}'")
content = stdout.read().decode()
print(f"Original: {len(content)} chars, {len(content.split(chr(10)))} lines")

# ============================================
# CHANGE 1: Wrap LLM Card with {isOwner && (...)}
# ============================================
# The LLM card starts with:
#       {/* ============================================ */}
#       {/* إعدادات الـ LLM — مع استعراض الموديلز */}
#       {/* ============================================ */}
#       <Card className="bg-card border-border">
# And ends before the Payment Gateway section.
# Find the end of the LLM card — it's the closing </Card> before {/* بوابة الدفع */}

llm_start_marker = "      {/* ============================================ */}\n      {/* إعدادات الـ LLM — مع استعراض الموديلز */}\n      {/* ============================================ */}"
llm_end_marker = "      {/* بوابة الدفع */}"

if llm_start_marker in content and llm_end_marker in content:
    llm_start_idx = content.index(llm_start_marker)
    llm_end_idx = content.index(llm_end_marker)
    
    # Find the </Card> right before the payment section
    # The content between llm_start and llm_end is the LLM section
    llm_section = content[llm_start_idx:llm_end_idx]
    
    # Find the last </Card> in the LLM section
    last_card_close = llm_section.rindex("</Card>")
    llm_content_end = llm_start_idx + last_card_close + len("</Card>")
    
    # Get the whitespace/newlines after </Card> before the payment section
    whitespace_after = content[llm_content_end:llm_end_idx]
    
    # Wrap with isOwner check
    wrapped_llm = "      {isOwner && (\n" + llm_section[:last_card_close + len("</Card>")] + "\n      )}"
    
    content = content[:llm_start_idx] + wrapped_llm + whitespace_after + content[llm_end_idx:]
    print("CHANGE 1: Wrapped LLM section with {isOwner && (...)}")
else:
    print("CHANGE 1: NOT FOUND — could not locate LLM section markers")

# ============================================
# CHANGE 2: Wrap Payment Gateway Card with {isOwner && (...)}
# ============================================
# The Payment section starts with {/* بوابة الدفع */} and ends before the subscription section

payment_start_marker = "      {/* بوابة الدفع */}"
# Find the end — it's before {/* الاشتراك */} or similar
# Let me search for the subscription section marker

# Re-read content after change 1
# Find payment start
if payment_start_marker in content:
    payment_start_idx = content.index(payment_start_marker)
    
    # Find the subscription section — it should come after payment
    # Search for {/* الاشتراك */} or similar
    subscription_markers = [
        "      {/* الاشتراك */}",
        "      {/* Subscription */}",
        "      {/* اشتراك */}",
    ]
    
    subscription_start_idx = None
    for marker in subscription_markers:
        idx = content.find(marker, payment_start_idx)
        if idx > payment_start_idx:
            subscription_start_idx = idx
            break
    
    if not subscription_start_idx:
        # Try to find it by searching for "subscription" card
        sub_search = content.find("Subscription", payment_start_idx)
        if sub_search > payment_start_idx:
            # Look backwards for the Card start
            card_start = content.rfind("<Card", payment_start_idx, sub_search)
            subscription_start_idx = card_start
    
    if subscription_start_idx:
        payment_section = content[payment_start_idx:subscription_start_idx]
        
        # Find last </Card> in payment section
        last_card_close = payment_section.rindex("</Card>")
        payment_content_end = payment_start_idx + last_card_close + len("</Card>")
        
        whitespace_after = content[payment_content_end:subscription_start_idx]
        
        # Wrap with isOwner check
        wrapped_payment = "      {isOwner && (\n" + payment_section[:last_card_close + len("</Card>")] + "\n      )}"
        
        content = content[:payment_start_idx] + wrapped_payment + whitespace_after + content[subscription_start_idx:]
        print("CHANGE 2: Wrapped Payment Gateway section with {isOwner && (...)}")
    else:
        print("CHANGE 2: Could not find subscription section marker")
        # Print surrounding content to help debug
        print("Content around payment end:")
        print(content[payment_start_idx:payment_start_idx+2000])

# ============================================
# CHANGE 3: Remove "only owner can upgrade" restriction
# ============================================
# Find the section that has {isOwner ? (upgrade button) : (warning message)}

old_upgrade_block = """          {isOwner ? (
            <Button
              variant="outline"
              className="w-full border-emerald-600 text-emerald-400 hover:bg-emerald-900/20"
              onClick={() => {
                // Trigger upgrade dialog — navigate to create employee which will show upgrade if limit reached
                // Or just reload to trigger the upgrade dialog from the sidebar
                window.location.reload()
              }}
            >
              {t("settings.subscription.upgrade", language)}
            </Button>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg p-3 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-xs">
                <p className="text-amber-700 dark:text-amber-400 font-medium">
                  {isArabic ? "بس الأونر يقدر يرقّي الاشتراك" : "Only the owner can upgrade"}
                </p>
                <p className="text-amber-600/70 dark:text-amber-400/70 mt-1">
                  {isArabic
                    ? "ترقية الاشتراك والدفع متاحة فقط لصاحب الشركة. تواصل مع الأونر عشان يرقّي."
                    : "Subscription upgrade and payment is only available to the company owner. Contact the owner to upgrade."
                  }
                </p>
              </div>
            </div>
          )}"""

new_upgrade_block = """          <Button
              variant="outline"
              className="w-full border-emerald-600 text-emerald-400 hover:bg-emerald-900/20"
              onClick={() => {
                window.location.reload()
              }}
            >
              {t("settings.subscription.upgrade", language)}
            </Button>"""

if old_upgrade_block in content:
    content = content.replace(old_upgrade_block, new_upgrade_block)
    print("CHANGE 3: Removed owner-only upgrade restriction — ALL users can upgrade")
else:
    print("CHANGE 3: NOT FOUND — upgrade block pattern changed")
    # Try to find isOwner pattern in subscription area
    sub_idx = content.find("isOwner ? (")
    if sub_idx >= 0:
        print(f"Found 'isOwner ? (' at index {sub_idx}")
        print(content[sub_idx-50:sub_idx+300])

# ============================================
# CHANGE 4: Update description text for subscribers
# ============================================
# The subtitle says "إعدادات الذكاء الاصطناعي والشركة"
# For subscribers, it should just say company info
old_subtitle = '        <p className="text-muted-foreground text-sm mt-1">{isArabic ? "إعدادات الذكاء الاصطناعي والشركة" : "AI & Company Settings"}</p>'
new_subtitle = '        <p className="text-muted-foreground text-sm mt-1">{isOwner ? (isArabic ? "إعدادات الذكاء الاصطناعي والشركة" : "AI & Company Settings") : (isArabic ? "إعدادات الشركة والاشتراك" : "Company & Subscription Settings")}</p>'

if old_subtitle in content:
    content = content.replace(old_subtitle, new_subtitle)
    print("CHANGE 4: Updated subtitle for subscribers")

# ============================================
# Write back to server
# ============================================
sftp = client.open_sftp()
with sftp.open(remote_path, 'w') as f:
    f.write(content)
sftp.close()

print(f"\nUpdated: {len(content)} chars, {len(content.split(chr(10)))} lines")
print("File written to server successfully!")

client.close()
