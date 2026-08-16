#!/usr/bin/env python3
"""
Use agent-browser to inject error handling BEFORE page JS runs.
Strategy: Add a script via network route interception that runs first.
"""
import subprocess
import json
import time

def run_cmd(cmd, timeout=15):
    result = subprocess.run(
        ['agent-browser'] + cmd.split(),
        capture_output=True, text=True, timeout=timeout
    )
    return result.stdout.strip(), result.stderr.strip(), result.returncode

# Step 1: Open the page and set up network interception to inject error handler
print("Step 1: Opening page and setting up interception...")
stdout, stderr, rc = run_cmd("open https://demo.blivoai.com/en")
print(f"  Output: {stdout[:100]}")

# Step 2: Login via JavaScript (SPA navigation, no page reload)
print("Step 2: Logging in via fetch...")
stdout, stderr, rc = run_cmd(f'eval "fetch(\'/api/auth/login\', {{ method: \'POST\', headers: {{ \'Content-Type\': \'application/json\' }}, body: JSON.stringify({{ email: \'admin@blivoai.com\', password: \'BlivoAdmin2024!\' }}) }}).then(r => r.json()).then(d => \'Login: \' + d.user?.name).catch(e => \'Error: \' + e.message)"')
print(f"  Output: {stdout}")

time.sleep(3)

# Step 3: Set up error handlers (still in same session, no reload)
print("Step 3: Setting up error handlers...")
stdout, stderr, rc = run_cmd('eval "window.__errors = []; window.addEventListener(\'error\', e => { window.__errors.push({type: \'error\', msg: e.error?.message || e.message, stack: e.error?.stack?.substring(0, 300)}); }); window.addEventListener(\'unhandledrejection\', e => { window.__errors.push({type: \'promise\', msg: e.reason?.message || String(e.reason), stack: e.reason?.stack?.substring(0, 300)}); }); const origCE = console.error; console.error = function(...args) { window.__errors.push({type: \'console.error\', msg: args.map(a => typeof a === \'string\' ? a : a?.message || String(a)).join(\' | \')}); origCE.apply(console, args); }; \'handlers set\'"')
print(f"  Output: {stdout}")

# Step 4: Trigger the dashboard render by updating state programmatically
# Since we're logged in, the page's useEffect should already have run
# But let me check what the current page looks like
print("Step 4: Checking current page state...")
stdout, stderr, rc = run_cmd('eval "document.querySelector(\'h2\')?.textContent || document.title"')
print(f"  Page state: {stdout}")

# Step 5: Check for errors
print("Step 5: Checking errors...")
stdout, stderr, rc = run_cmd('eval "JSON.stringify(window.__errors)"')
print(f"  Errors: {stdout}")
