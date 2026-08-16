#!/usr/bin/env python3
"""Fix misplaced useLocale() calls - move them inside the component function"""
import re
import os

BASE = "/home/z/my-project"

# Files with parsing errors
BROKEN_FILES = [
    "src/components/dashboard/departments-panel.tsx",
    "src/components/dashboard/meetings-panel.tsx",
    "src/components/dashboard/projects-panel.tsx",
    "src/components/dashboard/token-budget-panel.tsx",
    "src/components/dashboard/work-orders-panel.tsx",
    "src/components/employees/create-employee-dialog.tsx",
    "src/components/employees/employee-setup-dialog.tsx",
]

for fpath in BROKEN_FILES:
    full = os.path.join(BASE, fpath)
    content = open(full).read()
    lines = content.split('\n')
    
    # Find the misplaced "const language = useLocale()" line
    # and find the component function start (export default function)
    locale_line_idx = None
    func_start_idx = None
    
    for i, line in enumerate(lines):
        if line.strip() == 'const language = useLocale()' and not func_start_idx:
            locale_line_idx = i
        if 'export default function' in line or 'function Component' in line or ('function ' in line and '(' in line and 'export' not in line and i > 5):
            if func_start_idx is None:
                func_start_idx = i
    
    if locale_line_idx is not None and func_start_idx is not None and locale_line_idx < func_start_idx:
        # Remove the misplaced line
        lines[locale_line_idx] = ''
        # Find the first line inside the function body (after the opening brace)
        # Look for the opening { of the function
        func_body_start = None
        for i in range(func_start_idx, len(lines)):
            if '{' in lines[i] and func_body_start is None:
                func_body_start = i + 1
                break
        
        if func_body_start:
            # Insert the const language = useLocale() inside the function
            # Find first existing const/let/var declaration inside function
            insert_idx = func_body_start
            for i in range(func_body_start, min(func_body_start + 10, len(lines))):
                stripped = lines[i].strip()
                if stripped.startswith('const') or stripped.startswith('let') or stripped.startswith('[') or stripped.startswith('use') or stripped.startswith('return'):
                    insert_idx = i
                    break
            
            lines.insert(insert_idx, '  const language = useLocale()')
        
        content = '\n'.join(lines)
        # Clean up empty lines that may have been left
        content = re.sub(r'\n\n\n+', '\n\n', content)
        open(full, 'w').write(content)
        print(f"FIXED: {fpath}")
    else:
        print(f"SKIP: {fpath} (locale_line={locale_line_idx}, func_start={func_start_idx})")

print("\nDone!")
