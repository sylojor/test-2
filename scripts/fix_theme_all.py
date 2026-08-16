#!/usr/bin/env python3
"""
Fix theme consistency across ALL pages in BlivoAI.
Replace hardcoded dark colors with theme-aware CSS variable equivalents.

Mapping:
- bg-slate-950 → bg-background
- bg-slate-900/80 → bg-card/80
- bg-slate-900 → bg-card
- bg-slate-800/50 → bg-muted/50
- bg-slate-800 → bg-muted
- bg-slate-700 → bg-input
- text-white (NOT on colored buttons) → text-foreground
- text-slate-200 → text-foreground
- text-slate-300 → text-secondary-foreground
- text-slate-400 → text-muted-foreground
- text-slate-500 → text-muted-foreground
- text-slate-600 → text-muted-foreground
- border-slate-800 → border-border
- border-slate-700 → border-border
- border-slate-600 → border-border
- placeholder:text-slate-500 → placeholder:text-muted-foreground
"""

import paramiko
import re

# Files to fix (dashboard panels + chat panels)
FILES_TO_FIX = [
    # Chat panels
    "/home/ubuntu/blivoai-demo/src/components/chat/department-chat-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/chat/chat-panel.tsx",
    # Dashboard panels
    "/home/ubuntu/blivoai-demo/src/components/dashboard/chatbot-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/access-tokens-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/billing-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/decisions-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/departments-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/employees-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/hr-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/meetings-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/monitor-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/overview-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/projects-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/requests-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/settings-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/setup-wizard.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/sidebar.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/talk-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/token-budget-panel.tsx",
    "/home/ubuntu/blivoai-demo/src/components/dashboard/work-orders-panel.tsx",
    # Employee dialogs
    "/home/ubuntu/blivoai-demo/src/components/employees/create-employee-dialog.tsx",
    "/home/ubuntu/blivoai-demo/src/components/employees/employee-setup-dialog.tsx",
    # Auth pages
    "/home/ubuntu/blivoai-demo/src/components/auth/login-page.tsx",
    "/home/ubuntu/blivoai-demo/src/components/auth/sign-up-page.tsx",
]

def fix_theme_colors(content):
    """Replace hardcoded dark colors with theme-aware equivalents."""
    
    # === BACKGROUND replacements ===
    # Order matters: more specific patterns first
    
    # bg-slate-950 → bg-background
    content = re.sub(r'bg-slate-950', 'bg-background', content)
    
    # bg-slate-900/80 → bg-card/80, bg-slate-900/50 → bg-card/50
    content = re.sub(r'bg-slate-900/(\d+)', r'bg-card/\1', content)
    # bg-slate-900 → bg-card
    content = re.sub(r'bg-slate-900\b', 'bg-card', content)
    
    # bg-slate-800/50 → bg-muted/50, etc
    content = re.sub(r'bg-slate-800/(\d+)', r'bg-muted/\1', content)
    # bg-slate-800 → bg-muted
    content = re.sub(r'bg-slate-800\b', 'bg-muted', content)
    
    # bg-slate-700 → bg-input
    content = re.sub(r'bg-slate-700', 'bg-input', content)
    
    # bg-slate-600 → bg-secondary (keep for some elements)
    content = re.sub(r'bg-slate-600', 'bg-secondary', content)
    
    # bg-slate-500 → bg-secondary
    content = re.sub(r'bg-slate-500', 'bg-secondary', content)
    
    # === TEXT replacements ===
    # text-slate-200 → text-foreground
    content = re.sub(r'text-slate-200', 'text-foreground', content)
    
    # text-slate-300 → text-secondary-foreground
    content = re.sub(r'text-slate-300', 'text-secondary-foreground', content)
    
    # text-slate-400 → text-muted-foreground
    content = re.sub(r'text-slate-400', 'text-muted-foreground', content)
    
    # text-slate-500 → text-muted-foreground
    content = re.sub(r'text-slate-500', 'text-muted-foreground', content)
    
    # text-slate-600 → text-muted-foreground
    content = re.sub(r'text-slate-600', 'text-muted-foreground', content)
    
    # text-white → text-foreground (BUT NOT on colored buttons like bg-emerald-600 text-white)
    # We need to be careful: text-white on bg-emerald-600, bg-blue-600 etc should stay
    # Only replace standalone text-white that's not preceded by a colored bg
    # Strategy: replace text-white with text-foreground, but restore it on buttons
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        # If line has a colored bg (emerald, blue, red, purple, etc.) + text-white, keep text-white
        has_colored_bg = bool(re.search(r'bg-emerald|bg-blue|bg-red|bg-purple|bg-indigo|bg-pink|bg-orange|bg-rose|bg-green|bg-yellow|bg-cyan|bg-teal|bg-primary|bg-destructive|bg-brand', line))
        if has_colored_bg and 'text-white' in line:
            new_lines.append(line)
        else:
            # Replace text-white with text-foreground
            line = re.sub(r'\btext-white\b', 'text-foreground', line)
            new_lines.append(line)
    content = '\n'.join(new_lines)
    
    # === BORDER replacements ===
    content = re.sub(r'border-slate-800', 'border-border', content)
    content = re.sub(r'border-slate-700', 'border-border', content)
    content = re.sub(r'border-slate-600', 'border-border', content)
    
    # === PLACEHOLDER replacements ===
    content = re.sub(r'placeholder:text-slate-500', 'placeholder:text-muted-foreground', content)
    content = re.sub(r'placeholder:text-slate-400', 'placeholder:text-muted-foreground', content)
    
    # === HOVER replacements ===
    content = re.sub(r'hover:bg-slate-800', 'hover:bg-muted', content)
    content = re.sub(r'hover:bg-slate-700', 'hover:bg-muted', content)
    content = re.sub(r'hover:bg-slate-600', 'hover:bg-secondary', content)
    content = re.sub(r'hover:text-white', 'hover:text-foreground', content)
    content = re.sub(r'hover:text-slate-300', 'hover:text-foreground', content)
    content = re.sub(r'hover:text-slate-400', 'hover:text-muted-foreground', content)
    
    # === RING replacements ===
    content = re.sub(r'ring-slate-800', 'ring-border', content)
    content = re.sub(r'ring-slate-700', 'ring-border', content)
    
    # === FOCUS replacements ===
    content = re.sub(r'focus:bg-slate-800', 'focus:bg-muted', content)
    content = re.sub(r'focus:bg-slate-700', 'focus:bg-muted', content)
    
    # === SHADOW replacements ===
    content = re.sub(r'shadow-emerald-500/10', 'shadow-primary/10', content)
    content = re.sub(r'shadow-emerald-500/20', 'shadow-primary/20', content)
    
    # === SPECIFIC patterns that need special handling ===
    # "text-emerald-400" and "text-emerald-600" are accent colors, keep them
    
    return content


ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')

sftp = ssh.open_sftp()

fixed_count = 0
for filepath in FILES_TO_FIX:
    try:
        with sftp.open(filepath, 'r') as f:
            content = f.read().decode()
        
        original = content
        fixed = fix_theme_colors(content)
        
        if fixed != original:
            with sftp.open(filepath, 'w') as f:
                f.write(fixed)
            fixed_count += 1
            # Count changes
            changes = sum(1 for a, b in zip(original.split('\n'), fixed.split('\n')) if a != b)
            short_name = filepath.split('/')[-1]
            print(f"  ✅ Fixed {short_name} ({changes} lines changed)")
        else:
            short_name = filepath.split('/')[-1]
            print(f"  ⏭️  {short_name} (no changes needed)")
    except Exception as e:
        short_name = filepath.split('/')[-1]
        print(f"  ❌ Error fixing {short_name}: {e}")

sftp.close()
print(f"\n✅ Fixed {fixed_count} files total!")

ssh.close()
