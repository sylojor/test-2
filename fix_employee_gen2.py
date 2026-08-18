#!/usr/bin/env python3
"""Fix the mangled return line in employee-generator.ts"""
filepath = '/home/ubuntu/new-blivo/src/lib/employee-generator.ts'

with open(filepath, 'r') as f:
    content = f.read()

# The broken line has ")ode]" which should be ")[mode]"
content = content.replace(')ode]', ')[mode]')
print('Fixed employee-generator.ts')

with open(filepath, 'w') as f:
    f.write(content)
