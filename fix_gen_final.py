#!/usr/bin/env python3
"""Replace the getApprovalModeDisplay function entirely in employee-generator.ts"""
filepath = '/home/ubuntu/new-blivo/src/lib/employee-generator.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and replace the entire function using text markers
old_start_marker = 'export function getApprovalModeDisplay(mode: string, language?: string): string {'
old_end_marker = 'export function getProjectStatusDisplay'

start_idx = content.find(old_start_marker)
end_idx = content.find(old_end_marker)

if start_idx >= 0 and end_idx >= 0:
    new_function = '''export function getApprovalModeDisplay(mode: string, language?: string): string {
  const isAr = language === "ar"
  const mapAr: Record<string, string> = {
    ALWAYS_APPROVE: "\u0643\u0644 \u0642\u0631\u0627\u0631 \u064a\u062d\u062a\u0627\u062c \u0645\u0648\u0627\u0641\u0642\u0629",
    AUTO_WITH_NOTIFY: "\u064a\u062a\u0635\u0631\u0641 \u0644\u0648\u062d\u062f\u0647 \u0645\u0639 \u0625\u0634\u0639\u0627\u0631",
    AUTO_SILENT: "\u064a\u062a\u0635\u0631\u0641 \u0644\u0648\u062d\u062f\u0647 \u0628\u062f\u0648\u0646 \u0625\u0634\u0639\u0627\u0631",
  }
  const mapEn: Record<string, string> = {
    ALWAYS_APPROVE: "Requires approval for every decision",
    AUTO_WITH_NOTIFY: "Acts autonomously with notification",
    AUTO_SILENT: "Acts autonomously silently",
  }
  return (isAr ? mapAr : mapEn)[mode] ?? mode
}

'''
    content = content[:start_idx] + new_function + content[end_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'SUCCESS: Replaced function from pos {start_idx} to {end_idx}')
else:
    print(f'ERROR: start={start_idx} end={end_idx}')