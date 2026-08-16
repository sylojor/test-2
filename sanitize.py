#!/usr/bin/env python3
import os, re

BASE = "/tmp/blivo-push"
PATTERNS = [
    (r"ghp_[a-zA-Z0-9]{30,}", "GITHUB_TOKEN_PLACEHOLDER"),
    (r"AKIA[0-9A-Z]{16}", "AWS_ACCESS_KEY_PLACEHOLDER"),
    (r"AIza[0-9A-Za-z\-_]{30,}", "GOOGLE_API_KEY_PLACEHOLDER"),
    (r"re_[a-zA-Z0-9]{20,}", "RESEND_API_KEY_PLACEHOLDER"),
    (r"sk-[a-zA-Z0-9]{20,}", "SK_API_KEY_PLACEHOLDER"),
    (r"Mghazi@199642", "SERVER_PASSWORD_REDACTED"),
]

ENV_PATTERNS = [
    r'(?i)(NEXTAUTH_SECRET|JWT_SECRET|ENCRYPTION_KEY|DODO_WEBHOOK_SECRET|DODO_SECRET|TOGETHER_API_KEY|RESEND_API_KEY|DATABASE_URL|GOOGLE_CLIENT_SECRET)["']?\s*[:=]+\s*["']?([^"'\s,;}{)]{8,})',
]

PW_PATTERNS = [
    r'password["']?\s*[:=]+\s*["']([^"'
]{8,})["']',
    r'Password["']?\s*[:=]+\s*["']([^"'
]{8,})["']',
]

count = 0
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in ["node_modules", ".git", ".next"]]
    for fname in files:
        if not fname.endswith((".ts", ".tsx", ".js", ".json", ".yml", ".yaml", ".sh", ".py", ".env.example")):
            continue
        fpath = os.path.join(root, fname)
        try:
            with open(fpath, "r", errors="replace") as f:
                content = f.read()
        except:
            continue
        original = content
        for pat, repl in PATTERNS:
            content = re.sub(pat, repl, content)
        for pat in ENV_PATTERNS:
            def make_replacer(p):
                def replacer(m):
                    key = m.group(1)
                    val = m.group(2)
                    if len(val) > 6 and not val.isalpha():
                        return key + m.group(0)[len(key):].replace(val, val[:3] + "***REDACTED***" + val[-3:])
                    return m.group(0)
                return replacer
            content = re.sub(pat, make_replacer(pat), content)
        for pat in PW_PATTERNS:
            def pw_replacer(m):
                val = m.group(1)
                if not val.isalpha() and len(val) > 6:
                    return m.group(0).replace(val, val[:3] + "***REDACTED***" + val[-3:])
                return m.group(0)
            content = re.sub(pat, pw_replacer, content)
        content = re.sub(r'(postgresql://[^:]+:)([^@]{6,})(@)', r'\1DB_PASSWORD_REDACTED\3', content)
        if content != original:
            with open(fpath, "w") as f:
                f.write(content)
            count += 1
print(f"Sanitized {count} files")
