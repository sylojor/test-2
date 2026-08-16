#!/usr/bin/env python3
"""Fix admin-content.tsx: Change back-to-site button to use router.push"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/src/app/[lang]/admin/admin-content.tsx"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# Fix the broken back-to-site button - change window.location.href to Link component
# The sed command broke it, so we need to find the damaged line and fix it properly
old_broken = '''onClick={() => router.push()}'''
new_fixed = '''asChild'''
content = content.replace(old_broken, new_fixed)

# Now we also need to add Link import and change the Button to use asChild + Link
# First check if Link is already imported
if "import Link from" not in content:
    # Add Link import after useRouter import
    old_router_import = 'import { useRouter } from "next/navigation"'
    new_router_import = 'import { useRouter } from "next/navigation"\nimport Link from "next/link"'
    content = content.replace(old_router_import, new_router_import)

# Now find the Button that was changed and wrap it with asChild + Link
# The current state should be: <Button variant="ghost" size="sm" asChild ...>
# We need to change it to use asChild with a Link inside
old_button = '''<Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {t("backToSite", lang)}
            </Button>'''

new_button = '''<Button
              variant="ghost"
              size="sm"
              asChild
              className="text-muted-foreground hover:text-foreground"
            >
              <Link href={`/${lang}`}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                {t("backToSite", lang)}
              </Link>
            </Button>'''

content = content.replace(old_button, new_button)

# Write back
with sftp.open(remote_path, "w") as f:
    f.write(content.encode())

print("admin-content.tsx fixed!")

# Also verify
stdin, stdout, stderr = client.exec_command(f"grep -n 'Link|backToSite|asChild' {remote_path}")
print(stdout.read().decode())

sftp.close()
client.close()
