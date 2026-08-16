#!/usr/bin/env python3
"""
Bulk fix dashboard light mode colors + logout button
"""

import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('141.95.55.5', username='ubuntu', password='Mghazi@199641')
sftp = ssh.open_sftp()

BASE = '/home/ubuntu/blivoai-demo/src'

def read_file(path):
    with sftp.open(path, 'r') as f:
        return f.read().decode('utf-8')

def write_file(path, content):
    with sftp.open(path, 'w') as f:
        f.write(content.encode('utf-8'))

def fix_dark_colors(content):
    """Replace hardcoded dark-mode colors with theme-aware variables"""
    
    # === Backgrounds ===
    content = content.replace('bg-slate-950', 'bg-background')
    content = content.replace('bg-slate-900', 'bg-card')
    content = content.replace('bg-slate-900/50', 'bg-card/50')
    content = content.replace('bg-slate-900/80', 'bg-card/80')
    content = content.replace('bg-slate-800', 'bg-muted')
    content = content.replace('bg-slate-800/50', 'bg-muted/50')
    content = content.replace('bg-slate-800/80', 'bg-muted/80')
    content = content.replace('bg-slate-700', 'bg-muted')
    
    # === Text Colors ===
    # Primary text
    content = content.replace('text-white font-semibold', 'text-foreground font-semibold')
    content = content.replace('text-white font-medium', 'text-foreground font-medium')
    content = content.replace('text-white font-bold', 'text-foreground font-bold')
    content = content.replace('text-white text-', 'text-foreground text-')
    content = content.replace('text-white ', 'text-foreground ')
    content = content.replace('text-white"', 'text-foreground"')
    
    # Muted text (slate-400, slate-500, slate-600)
    content = content.replace('text-slate-300', 'text-foreground')
    content = content.replace('text-slate-400', 'text-muted-foreground')
    content = content.replace('text-slate-500', 'text-muted-foreground')
    content = content.replace('text-slate-600', 'text-muted-foreground')
    
    # === Hover ===
    content = content.replace('hover:text-white', 'hover:text-foreground')
    content = content.replace('hover:bg-white/5', 'hover:bg-muted/30')
    content = content.replace('hover:bg-white/8', 'hover:bg-muted/50')
    content = content.replace('hover:bg-white/10', 'hover:bg-muted/50')
    content = content.replace('hover:bg-slate-800', 'hover:bg-muted')
    content = content.replace('hover:bg-slate-800/50', 'hover:bg-muted/50')
    content = content.replace('hover:bg-slate-700', 'hover:bg-muted')
    
    # === Borders ===
    content = content.replace('border-slate-800', 'border-border')
    content = content.replace('border-slate-700', 'border-border')
    content = content.replace('border-slate-600', 'border-border')
    content = content.replace('border-white/5', 'border-border/10')
    content = content.replace('border-white/10', 'border-border/20')
    
    # === Input/Select placeholder ===
    content = content.replace('placeholder:text-slate-500', 'placeholder:text-muted-foreground')
    
    # === Badge dual-mode colors ===
    # Emerald
    content = content.replace('bg-emerald-900/30 text-emerald-400', 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400')
    # Blue
    content = content.replace('bg-blue-900/30 text-blue-400', 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400')
    # Red
    content = content.replace('bg-red-900/30 text-red-400', 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400')
    # Yellow
    content = content.replace('bg-yellow-900/30 text-yellow-400', 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400')
    # Green
    content = content.replace('bg-green-900/30 text-green-400', 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400')
    # Purple
    content = content.replace('bg-purple-900/30 text-purple-400', 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400')
    
    # === Sidebar specific ===
    content = content.replace('glass-dark', 'bg-card/80 backdrop-blur-sm')
    
    return content

# Files to fix (dashboard components only)
files_to_fix = [
    f'{BASE}/components/dashboard/sidebar.tsx',
    f'{BASE}/components/dashboard/overview-panel.tsx',
    f'{BASE}/components/dashboard/employee-detail-panel.tsx',
    f'{BASE}/components/dashboard/access-tokens-panel.tsx',
    f'{BASE}/components/dashboard/available-employees-panel.tsx',
    f'{BASE}/components/dashboard/payments-panel.tsx',
    f'{BASE}/components/dashboard/work-orders-panel.tsx',
    f'{BASE}/components/dashboard/talk-panel.tsx',
    f'{BASE}/components/dashboard/departments-panel.tsx',
    f'{BASE}/components/dashboard/employees-panel.tsx',
    f'{BASE}/components/dashboard/settings-panel.tsx',
    f'{BASE}/components/dashboard/monitor-panel.tsx',
    f'{BASE}/components/dashboard/decisions-panel.tsx',
    f'{BASE}/components/dashboard/requests-panel.tsx',
    f'{BASE}/components/dashboard/token-budget-panel.tsx',
    f'{BASE}/components/dashboard/chatbot-panel.tsx',
    f'{BASE}/components/dashboard/hr-panel.tsx',
    f'{BASE}/components/dashboard/meetings-panel.tsx',
    f'{BASE}/components/chat/chat-panel.tsx',
    f'{BASE}/components/chat/department-chat-panel.tsx',
    f'{BASE}/app/[lang]/page.tsx',
]

# Fix page.tsx separately (add visible logout button + fix colors)
page_path = f'{BASE}/app/[lang]/page.tsx'
page = read_file(page_path)

# Fix colors in the dashboard layout area (the top bar and overall layout)
# Only fix the dashboard section (after "// المرحلة 4: Dashboard")
dashboard_idx = page.find('// المرحلة 4: Dashboard')
if dashboard_idx >= 0:
    landing_part = page[:dashboard_idx]
    dashboard_part = page[dashboard_idx:]
    dashboard_part = fix_dark_colors(dashboard_part)
    page = landing_part + dashboard_part

write_file(page_path, page)
print(f"Fixed: page.tsx")

# Fix all dashboard component files
for filepath in files_to_fix:
    if filepath == page_path:
        continue  # Already fixed
    
    try:
        content = read_file(filepath)
        fixed = fix_dark_colors(content)
        if content != fixed:
            write_file(filepath, fixed)
            print(f"Fixed: {filepath.split('/')[-1]}")
        else:
            print(f"No changes: {filepath.split('/')[-1]}")
    except Exception as e:
        print(f"Error: {filepath.split('/')[-1]} - {e}")

# ============================================
# Fix Logout Button - make it more visible
# ============================================
print("\nFixing logout button visibility...")

page = read_file(page_path)

# Make the logout button more visible with a proper button style
# Find the current logout button and make it more prominent
old_logout = '''<button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive text-xs transition-colors min-h-[44px] flex items-center gap-1.5 px-2 rounded-lg hover:bg-muted/50"
              aria-label={t("sidebar.logout", lang)}"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t("sidebar.logout", lang)}</span>
            </button>'''

new_logout = '''<Button
              variant="ghost"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors min-h-[44px] flex items-center gap-1.5 px-3 font-medium"
              aria-label={t("sidebar.logout", lang)}"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("sidebar.logout", lang)}</span>
            </Button>'''

page = page.replace(old_logout, new_logout)
write_file(page_path, page)
print("Logout button fixed - using proper Button component with visible text")

# ============================================
# Deploy
# ============================================
print("\nDeploying...")

ssh.exec_command('cd ~/blivoai-demo && docker compose down 2>&1')
time.sleep(5)

stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose build --no-cache 2>&1', timeout=180)
build_output = stdout.read().decode('utf-8')
if 'ERROR' in build_output or 'error' in build_output.lower():
    print("BUILD ERROR:")
    # Find the error
    for line in build_output.split('\n'):
        if 'error' in line.lower() or 'ERROR' in line:
            print(line)
else:
    print("Build successful!")

stdin, stdout, stderr = ssh.exec_command('cd ~/blivoai-demo && docker compose up -d 2>&1')
stdout.read()
time.sleep(20)

# Check site
import urllib.request
try:
    r = urllib.request.urlopen('https://demo.blivoai.com/ar/', timeout=10)
    print(f"AR site: HTTP {r.status}")
except Exception as e:
    print(f"AR site: {e}")

try:
    r = urllib.request.urlopen('https://demo.blivoai.com/en/', timeout=10)
    print(f"EN site: HTTP {r.status}")
except Exception as e:
    print(f"EN site: {e}")

sftp.close()
ssh.close()
print("\nDone!")
