#!/usr/bin/env python3
"""Verify Arabic version also works."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()

        await context.add_init_script("""
            window.__errors = [];
            window.addEventListener('error', function(e) {
                window.__errors.push({type:'error', msg: e.error?.message || e.message});
            });
        """)

        page = await context.new_page()

        print("Testing Arabic version...")
        await page.goto('https://demo.blivoai.com/ar', wait_until='networkidle')

        # Login via fetch
        await page.evaluate("""
            async function() {
                var res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'admin@blivoai.com', password: 'BlivoAdmin2024!' })
                });
                return await res.json();
            }
        """)

        # Reload
        await page.reload(wait_until='networkidle')
        await page.wait_for_timeout(5000)

        h2 = await page.evaluate("document.querySelector('h2')?.textContent || ''")
        errors = await page.evaluate("JSON.stringify(window.__errors)")

        if 'Application error' not in h2:
            print(f"✅ Arabic version works! H2: {h2[:50]}")
            print(f"   Errors: {errors}")
        else:
            print(f"❌ Arabic version FAILED! H2: {h2[:100]}")
            print(f"   Errors: {errors}")

        await browser.close()

asyncio.run(main())
