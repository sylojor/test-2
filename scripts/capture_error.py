#!/usr/bin/env python3
"""
Use Playwright directly to:
1. Add an init script that captures errors BEFORE any page JS runs
2. Navigate to demo.blivoai.com/en (already has auth cookie from previous login)
3. Capture the error that causes the client-side exception
"""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        # Add init script that runs BEFORE any page JavaScript
        await context.add_init_script("""
            window.__errors = [];
            window.addEventListener('error', function(e) {
                window.__errors.push({
                    type: 'error',
                    message: e.error?.message || e.message || 'unknown',
                    stack: e.error?.stack ? e.error.stack.substring(0, 800) : '',
                    filename: e.filename || '',
                    lineno: e.lineno || 0,
                    colno: e.colno || 0
                });
            });
            window.addEventListener('unhandledrejection', function(e) {
                window.__errors.push({
                    type: 'promise',
                    message: e.reason?.message || String(e.reason) || 'unknown',
                    stack: e.reason?.stack ? e.reason.stack.substring(0, 800) : ''
                });
            });
            // Also intercept console.error
            var origConsoleError = console.error;
            console.error = function() {
                var args = Array.from(arguments);
                var msg = args.map(function(a) {
                    if (typeof a === 'string') return a;
                    if (a && a.message) return a.message;
                    return String(a);
                }).join(' | ');
                window.__errors.push({
                    type: 'console.error',
                    message: msg,
                    stack: args[0]?.stack ? args[0].stack.substring(0, 500) : ''
                });
                origConsoleError.apply(console, args);
            };
        """)

        # Set the auth cookie from previous session
        # First, login via the page
        page = await context.new_page()

        print("Step 1: Opening page...")
        await page.goto('https://demo.blivoai.com/en', wait_until='networkidle')
        print(f"  Title: {await page.title()}")

        print("Step 2: Logging in via fetch...")
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
        print(f"  Login result: {login_result}")

        # Check initial errors (from login)
        errors_after_login = await page.evaluate("JSON.stringify(window.__errors)")
        print(f"  Errors after login: {errors_after_login[:200]}")

        print("Step 3: Reloading page with auth cookie + init script...")
        await page.reload(wait_until='networkidle')

        print("Step 4: Waiting for dashboard/error...")
        await page.wait_for_timeout(5000)

        # Check the page content
        page_title = await page.title()
        h2_text = await page.evaluate("document.querySelector('h2')?.textContent || ''")
        print(f"  Title: {page_title}")
        print(f"  H2: {h2_text[:200]}")

        # Get all captured errors
        all_errors = await page.evaluate("JSON.stringify(window.__errors)")
        print(f"\n=== CAPTURED ERRORS ===")
        print(all_errors)

        # Also check for React-specific error info
        react_info = await page.evaluate("""
            var errorBoundaryDivs = document.querySelectorAll('[data-next-error]');
            var nextjsErrors = [];
            // Also check __NEXT_DATA__
            if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps) {
                nextjsErrors.push('NEXT_DATA pageProps: ' + JSON.stringify(window.__NEXT_DATA__.props.pageProps).substring(0, 200));
            }
            nextjsErrors.push('errorBoundaryDivs count: ' + errorBoundaryDivs.length);
            return JSON.stringify(nextjsErrors);
        """)
        print(f"\n=== REACT/NEXT INFO ===")
        print(react_info)

        await browser.close()

asyncio.run(main())
