#!/usr/bin/env python3
filepath = '/home/ubuntu/new-blivo/src/lib/employee-generator.ts'
with open(filepath, 'rb') as f:
    data = f.read()

# Find the broken section and replace it
old = b"isAr ? 'ar' : 'en'] as Record<string, string>)"
new = b"isAr ? 'ar' : 'en'] as Record<string, string>)"

# The issue: there's a broken sequence after the cast. Let's find and replace the full return line.
# Search for the return line by finding its prefix
prefix = b"  return (map[isAr ? 'ar' : 'en'] as Record<string, string>"
suffix = b"?? mode\n"

start = data.find(prefix)
if start >= 0:
    # Find end of this line
    end = data.find(b'\n', start)
    if end >= 0:
        old_line = data[start:end+1]
        print(f'Found broken line at byte {start}: {old_line}')
        new_line = b"  return (map[isAr ? 'ar' : 'en'] as Record<string, string>)[mode] ?? mode\n"
        data = data[:start] + new_line + data[end+1:]
        print(f'Replaced with: {new_line}')
        with open(filepath, 'wb') as f:
            f.write(data)
        print('SUCCESS')
    else:
        print('Could not find end of line')
else:
    print('Prefix not found')
