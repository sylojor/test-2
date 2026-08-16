#!/usr/bin/env python3
"""Move misplaced 'const language = useLocale()' from top-level to inside component function"""
import re, os

BASE = "/home/z/my-project"
FILES = [
    "src/components/auth/login-page.tsx",
    "src/components/auth/sign-up-page.tsx",
    "src/components/chat/chat-panel.tsx",
    "src/components/chat/department-chat-panel.tsx",
    "src/components/dashboard/decisions-panel.tsx",
    "src/components/dashboard/employees-panel.tsx",
    "src/components/dashboard/hr-panel.tsx",
    "src/components/dashboard/monitor-panel.tsx",
    "src/components/dashboard/overview-panel.tsx",
    "src/components/dashboard/requests-panel.tsx",
    "src/components/dashboard/settings-panel.tsx",
    "src/components/dashboard/setup-wizard.tsx",
    "src/components/dashboard/talk-panel.tsx",
    "src/components/dashboard/token-budget-panel.tsx",
    "src/components/landing/landing-page.tsx",
]

for fpath in FILES:
    full = os.path.join(BASE, fpath)
    content = open(full).read()
    lines = content.split('\n')
    
    # Find the misplaced line
    locale_idx = None
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == 'const language = useLocale()':
            # Check if it's inside a function (there should be a function definition before it)
            has_func_before = False
            for j in range(i-1, max(0, i-30), -1):
                if 'function ' in lines[j] or '=> {' in lines[j] or lines[j].strip().endswith(') {'):
                    has_func_before = True
                    break
            if not has_func_before:
                locale_idx = i
                break
    
    if locale_idx is None:
        print(f"OK: {fpath}")
        continue
    
    # Find the component function
    func_idx = None
    for i, line in enumerate(lines):
        # Look for: export default function XXX, function XXX, const XXX = (), etc.
        if re.search(r'export\s+default\s+function|function\s+\w+\s*\(|const\s+\w+\s*=\s*\(|export\s+function', line):
            func_idx = i
            break
    
    if func_idx is None:
        # Try looking for the "return" statement as indicator of component body
        for i, line in enumerate(lines):
            if 'return (' in line or 'return <' in line:
                func_idx = i - 5  # approximate
                break
    
    if func_idx is None:
        print(f"WARN: {fpath} - can't find component function")
        continue
    
    # Find the opening brace of the function
    brace_idx = None
    for i in range(func_idx, min(func_idx + 5, len(lines))):
        if '{' in lines[i]:
            brace_idx = i
            break
    
    if brace_idx is None:
        print(f"WARN: {fpath} - can't find function opening brace")
        continue
    
    # Remove the misplaced line
    lines[locale_idx] = ''
    
    # Insert after the opening brace (add 2 spaces indentation)
    lines.insert(brace_idx + 1, '  const language = useLocale()')
    
    # Clean up empty lines
    content = '\n'.join(lines)
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    open(full, 'w').write(content)
    print(f"FIXED: {fpath}")

print("\nDone!")
