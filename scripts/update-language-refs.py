#!/usr/bin/env python3
"""Update all component files to use useLocale() instead of useDashboardStore().language"""
import re
import os

FILES = [
    "src/components/landing/landing-page.tsx",
    "src/components/chat/department-chat-panel.tsx",
    "src/components/chat/chat-panel.tsx",
    "src/components/auth/login-page.tsx",
    "src/components/auth/sign-up-page.tsx",
    "src/components/employees/create-employee-dialog.tsx",
    "src/components/employees/employee-setup-dialog.tsx",
    "src/components/dashboard/settings-panel.tsx",
    "src/components/dashboard/decisions-panel.tsx",
    "src/components/dashboard/token-budget-panel.tsx",
    "src/components/dashboard/work-orders-panel.tsx",
    "src/components/dashboard/sidebar.tsx",
    "src/components/dashboard/employees-panel.tsx",
    "src/components/dashboard/monitor-panel.tsx",
    "src/components/dashboard/requests-panel.tsx",
    "src/components/dashboard/projects-panel.tsx",
    "src/components/dashboard/overview-panel.tsx",
    "src/components/dashboard/main-content.tsx",
    "src/components/dashboard/hr-panel.tsx",
    "src/components/dashboard/setup-wizard.tsx",
    "src/components/dashboard/departments-panel.tsx",
    "src/components/dashboard/meetings-panel.tsx",
    "src/components/dashboard/talk-panel.tsx",
    "src/app/[lang]/page.tsx",
]

BASE = "/home/z/my-project"

for fpath in FILES:
    full = os.path.join(BASE, fpath)
    if not os.path.exists(full):
        print(f"SKIP: {fpath} not found")
        continue
    
    content = open(full).read()
    original = content
    
    # 1. Add useLocale import if language is used
    if "language" in content and "useLocale" not in content:
        # Find the last import line and add after it
        import_lines = [i for i, line in enumerate(content.split('\n')) if line.strip().startswith('import')]
        if import_lines:
            last_import_idx = import_lines[-1]
            lines = content.split('\n')
            lines.insert(last_import_idx + 1, 'import { useLocale } from "@/hooks/use-locale"')
            content = '\n'.join(lines)
    
    # 2. Replace useDashboardStore().language with useLocale()
    # Pattern: const { ... language ... } = useDashboardStore()
    # We need to extract language from the destructured object and replace it
    
    # Pattern: const { xxx, language, yyy } = useDashboardStore()
    pattern = r'const\s*\{([^}]*)\}\s*=\s*useDashboardStore\(\)'
    match = re.search(pattern, content)
    if match:
        destructured = match.group(1)
        # Check if language is in the destructured list
        items = [item.strip() for item in destructured.split(',')]
        has_language = any(item == 'language' or item.startswith('language') for item in items)
        
        if has_language:
            # Remove language from the destructured list
            new_items = [item for item in items if item != 'language' and not item.startswith('language')]
            new_destructured = ', '.join(new_items)
            
            if new_destructured:
                new_line = f'const {{ {new_destructured} }} = useDashboardStore()'
            else:
                # If language was the only item, remove the whole line
                # But add const language = useLocale()
                new_line = ''
            
            content = content.replace(match.group(0), new_line if new_line else '')
            
            # Add const language = useLocale() after the remaining useDashboardStore line or separately
            if new_line:
                content = content.replace(new_line, new_line + '\n  const language = useLocale()')
            else:
                # Find a good place to add it (after the imports)
                lines = content.split('\n')
                # Find first non-import, non-comment line
                insert_idx = 0
                for i, line in enumerate(lines):
                    stripped = line.strip()
                    if stripped and not stripped.startswith('import') and not stripped.startswith('//') and not stripped.startswith('export') and not stripped.startswith('"use'):
                        insert_idx = i
                        break
                lines.insert(insert_idx, '  const language = useLocale()')
                content = '\n'.join(lines)
    
    # 3. Replace standalone language references that use store
    # e.g., useDashboardStore().language → useLocale()  
    content = re.sub(r'useDashboardStore\(\)\.language', 'useLocale()', content)
    
    # 4. Replace {language === "ar" ? "rtl" : "ltr"} patterns
    # Since lang comes from URL, we can simplify
    content = content.replace('{language === "ar" ? "rtl" : "ltr"}', '"rtl" // dynamic from URL')
    
    # 5. Remove unused Language import from i18n if present
    content = re.sub(r',\s*Language\s*from\s*"@/lib/i18n"', ' from "@/lib/i18n"', content)
    content = re.sub(r'import\s+type\s+Language\s+from\s*"@/lib/i18n"\s*\n', '', content)
    
    # 6. Remove setLanguage references since language is now from URL
    content = re.sub(r',\s*setLanguage[^)]*\)', '', content)  # remove from destructuring
    
    # Only write if changed
    if content != original:
        open(full, 'w').write(content)
        print(f"UPDATED: {fpath}")
    else:
        print(f"NO CHANGE: {fpath}")

print("\nDone!")
