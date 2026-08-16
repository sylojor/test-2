#!/usr/bin/env python3
"""Verify the fix: Login and check if dashboard renders without error."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        # Add init script to capture errors
        await context.add_init_script("""
            window.__errors = [];
            window.addEventListener('error', function(e) {
                window.__errors.push({type:'error', msg: e.error?.message || e.message, stack: e.error?.stack?.substring(0,300)});
            });
            window.addEventListener('unhandledrejection', function(e) {
                window.__errors.push({type:'promise', msg: e.reason?.message || String(e.reason)});
            });
        """)

        page = await context.new_page()

        print("1. Opening page...")
        await page.goto('https://demo.blivoai.com/en', wait_until='networkidle')
        title = await page.title()
        print(f"   Title: {title}")

        print("2. Logging in via fetch...")
        login_result = await page.evaluate("""
            async function() {
                var res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@blivoai.com', password: 'BlivoAdmin2024!' })
                });
                var data = await res.json();
                return data.user ? 'ok:' + data.user.name : 'fail';
            }
        """)
        print(f"   Login: {login_result}")

        # Check errors after login
        errors = await page.evaluate("JSON.stringify(window.__errors)")
        print(f"   Errors after login: {errors}")

        print("3. Reloading page with auth cookie...")
        await page.reload(wait_until='networkidle')
        await page.wait_for_timeout(5000)

        print("4. Checking page state...")
        h2 = await page.evaluate("document.querySelector('h2')?.textContent || ''")
        title = await page.title()
        print(f"   Title: {title}")
        print(f"   H2: {h2[:100]}")

        # Check errors after reload
        errors = await page.evaluate("JSON.stringify(window.__errors)")
        print(f"   Errors: {errors}")

        # If dashboard rendered, check for sidebar elements
        if 'Application error' not in h2:
            sidebar_text = await page.evaluate("document.querySelector('aside h2')?.textContent || 'no sidebar found'")
            print(f"   Sidebar: {sidebar_text}")
            print("✅ SUCCESS - Dashboard loaded without error!")
        else:
            print("❌ FAILED - Still showing error page!")

        await browser.close()

asyncio.run(main())
