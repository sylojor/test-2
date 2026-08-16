#!/usr/bin/env python3
"""Use Playwright to inject error capture script before page loads, then check errors."""
import subprocess
import json
import time

def run_browser_cmd(cmd, timeout=20):
    result = subprocess.run(
        f'agent-browser {cmd}',
        shell=True,
        capture_output=True, text=True, timeout=timeout
    )
    out = result.stdout.strip()
    err = result.stderr.strip()
    return out, err

# Step 1: Open the page fresh
print("1. Opening page...")
out, err = run_browser_cmd("open https://demo.blivoai.com/en")
print(f"   {out[:80]}")

# Step 2: Login via fetch (SPA)
print("2. Logging in via fetch...")
js_login = """
(async function() {
  window.__errors = [];
  window.addEventListener('error', function(e) { window.__errors.push({t:'err', m:e.error?.message||e.message, s:e.error?.stack?.substring(0,500)}); });
  window.addEventListener('unhandledrejection', function(e) { window.__errors.push({t:'rej', m:e.reason?.message||String(e.reason), s:e.reason?.stack?.substring(0,500)}); });
  try {
    var r = await fetch('/api/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@blivoai.com',password:'BlivoAdmin2024!'})});
    var d = await r.json();
    return d.user ? 'ok:'+d.user.name : 'fail';
  } catch(e) { return 'err:'+e.message; }
})();
"""
out, err = run_browser_cmd(f'eval "{js_login.strip()}"')
print(f"   {out[:80]}")

# Step 3: Now we need to reload, but we need error handlers BEFORE the reload
# Use network route to inject error handler HTML into the page
print("3. Setting up network route to inject error handler...")
route_cmd = 'network route "https://demo.blivoai.com/en" --body "<script>window.__errors=[];window.addEventListener(\'error\',function(e){window.__errors.push({m:e.error?.message||e.message,s:e.error?.stack?.substring(0,500)})});window.addEventListener(\'unhandledrejection\',function(e){window.__errors.push({m:e.reason?.message||String(e.reason),s:e.reason?.stack?.substring(0,500)})});</script>"'
out, err = run_browser_cmd(route_cmd)
print(f"   Route: {out[:80]}")

# Step 4: Reload 
print("4. Reloading page...")
out, err = run_browser_cmd("reload")
print(f"   {out[:80]}")

time.sleep(5)

# Step 5: Check page state
print("5. Checking page state...")
out, err = run_browser_cmd('eval "document.querySelector(\'h2\')?.textContent || document.title"')
print(f"   Page: {out[:80]}")

# Step 6: Check errors
print("6. Checking errors...")
out, err = run_browser_cmd('eval "JSON.stringify(window.__errors)"')
print(f"   Errors: {out[:300]}")

# Step 7: Try console errors
print("7. Getting console errors...")
out, err = run_browser_cmd("errors")
print(f"   Console errors: {out[:300]}")
