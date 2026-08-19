#!/usr/bin/env python3
"""Restore the accidentally deleted getEmployeeStatusColor function"""
filepath = '/home/ubuntu/new-blivo/src/lib/employee-generator.ts'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Insert getEmployeeStatusColor before getProjectStatusDisplay
status_color_fn = '''export function getEmployeeStatusColor(status: string): string {
  const map: Record<string, string> = {
    SETUP: "bg-yellow-100 text-yellow-800",
    ACTIVE: "bg-green-100 text-green-800",
    PAUSED: "bg-gray-100 text-gray-800",
    AWAITING_APPROVAL: "bg-orange-100 text-orange-800",
    REPLACED: "bg-blue-100 text-blue-800",
    DELETED: "bg-red-100 text-red-800",
  }
  return map[status] ?? "bg-gray-100 text-gray-800"
}

'''

marker = 'export function getProjectStatusDisplay'
idx = content.find(marker)
if idx >= 0:
    content = content[:idx] + status_color_fn + content[idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS: Restored getEmployeeStatusColor')
else:
    print('ERROR: Marker not found')
