#!/usr/bin/env python3
filepath = '/home/ubuntu/new-blivo/src/lib/employee-generator.ts'
with open(filepath, 'r') as f:
    lines = f.readlines()

# Fix line 397 (0-indexed: 396)
for i, line in enumerate(lines):
    if 'ode]' in line and 'isAr' in line and 'mode' in line:
        lines[i] = "  return (map[isAr ? 'ar' : 'en'] as Record<string, string>)[mode] ?? mode\n"
        print(f'Fixed line {i+1}')
        break

with open(filepath, 'w') as f:
    f.writelines(lines)
