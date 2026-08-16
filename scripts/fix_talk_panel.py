#!/usr/bin/env python3
"""Fix talk-panel.tsx: Add 'Back to Dashboard' button"""

import paramiko

host = "141.95.55.5"
username = "ubuntu"
password = "Mghazi@199641"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username=username, password=password)

# Read the current file
sftp = client.open_sftp()
remote_path = "/home/ubuntu/blivoai-demo/src/components/dashboard/talk-panel.tsx"
with sftp.open(remote_path, "r") as f:
    content = f.read().decode()

# 1. Add ArrowLeft and LayoutDashboard to lucide imports
old_import = 'import { Menu } from "lucide-react"'
new_import = 'import { Menu, ArrowLeft, ArrowRight, LayoutDashboard } from "lucide-react"'
content = content.replace(old_import, new_import)

# 2. In EmployeeSidebarContent header, add a "Back to Dashboard" button
# Find the header section in the sidebar content
old_sidebar_header = '''      <div className="p-4 border-b border-slate-800">
        <h2 className="text-white font-semibold mb-3">{t("talk.title", language)}</h2>'''

new_sidebar_header = '''      <div className="p-4 border-b border-slate-800">
        <button
          onClick={() => useDashboardStore.getState().setActiveTab("overview")}
          className="flex items-center gap-2 px-2 py-1.5 mb-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all text-sm text-slate-300 hover:text-white w-full"
        >
          {language === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <LayoutDashboard className="w-4 h-4" />
          <span>{t("talk.backToDashboard", language)}</span>
        </button>
        <h2 className="text-white font-semibold mb-3">{t("talk.title", language)}</h2>'''

content = content.replace(old_sidebar_header, new_sidebar_header)

# 3. Add a "Back to Dashboard" button in the chat header area (when an employee is selected)
old_chat_header = '''            {/* رأس المحادثة */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 sm:gap-3">'''

new_chat_header = '''            {/* رأس المحادثة */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={() => useDashboardStore.getState().setActiveTab("overview")}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white text-xs"
                  title={t("talk.backToDashboard", language)}
                >
                  {language === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                  <span className="hidden sm:inline">{t("talk.backToDashboard", language)}</span>
                </button>'''

content = content.replace(old_chat_header, new_chat_header)

# Write the modified file back
with sftp.open(remote_path, "w") as f:
    f.write(content.encode())

print("talk-panel.tsx updated successfully!")

sftp.close()
client.close()
