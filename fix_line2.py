#!/usr/bin/env python3
filepath = '/home/ubuntu/new-blivo/src/lib/employee-generator.ts'
with open(filepath, 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'isAr' in line and 'map' in line and 'mode' in line and 'return' in line:
        lines[i] = "  return (map[isAr ? 'ar' : 'en'] as Record<string, string>)[mode] ?? mode\n"
        print(f'Fixed line {i+1}: {repr(lines[i][:50])}')
        break

with open(filepath, 'w') as f:
    f.writelines(lines)
