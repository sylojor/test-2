#!/usr/bin/env python3
"""Fix remaining 3 TypeScript errors"""

# Fix 1: main-content.tsx - remove onReplaceEmployee from EmployeesPanel
mainpath = '/home/ubuntu/new-blivo/src/components/dashboard/main-content.tsx'
with open(mainpath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '            onDeleteEmployee={onDeleteEmployee}\n            onReplaceEmployee={onReplaceEmployee}\n',
    '            onDeleteEmployee={onDeleteEmployee}\n'
)

# Fix 2: main-content.tsx - remove departments and onBack from EmployeeDetailPanel
content = content.replace(
    '      <EmployeeDetailPanel\n              employee={detailEmployee!}\n              departments={departments}\n              onBack={() => useDashboardStore.getState().setActiveTab("employees")}\n            />',
    '      <EmployeeDetailPanel\n              employee={detailEmployee!}\n            />'
)

with open(mainpath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed main-content.tsx: removed invalid props')

# Fix 3: pipeline-executor.ts - cast taskType to RequestType
pipepath = '/home/ubuntu/new-blivo/src/lib/pipeline-executor.ts'
with open(pipepath, 'r', encoding='utf-8') as f:
    pipe = f.read()

pipe = pipe.replace(
    '      taskType,\n      taskTitle,',
    '      taskType as RequestType,\n      taskTitle,'
)

with open(pipepath, 'w', encoding='utf-8') as f:
    f.write(pipe)
print('Fixed pipeline-executor.ts: cast taskType to RequestType')

print('All 3 TS errors fixed')
