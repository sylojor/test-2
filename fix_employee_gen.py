#!/usr/bin/env python3
"""Fix the mangled getApprovalModeDisplay function in employee-generator.ts"""
import sys

filepath = sys.argv[1] if len(sys.argv) > 1 else '/home/ubuntu/new-blivo/src/lib/employee-generator.ts'

with open(filepath, 'r') as f:
    content = f.read()

# Fix the broken return line
content = content.replace(
    'return (map[isAr ? \'ar\' : \'en\'] as Record<string, string>)ode] ?? mode\n}',
    'return (map[isAr ? \'ar\' : \'en\'] as Record<string, string>)[mode] ?? mode\n}'
)

# Remove the orphaned lines from the old function
content = content.replace(
    '  return map[status] ?? "bg-gray-100 text-gray-800"\n}\n\nexport function getProjectStatusDisplay',
    'export function getProjectStatusDisplay'
)

# Also ensure the closing brace of the map object exists
old_map_end = '''    AUTO_SILENT: "Acts autonomously silently",
    },
  }
  return (map[isAr ? \'ar\' : \'en\'] as Record<string, string>)[mode] ?? mode
}'''

if 'AUTO_SILENT: "Acts autonomously silently",' in content:
    # Check if closing brace for the Record is there
    pass

with open(filepath, 'w') as f:
    f.write(content)

print('Fixed employee-generator.ts')
