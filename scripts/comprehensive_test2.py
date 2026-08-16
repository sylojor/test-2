#!/usr/bin/env python3
"""Comprehensive test: check language consistency and data accuracy."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        
        await context.add_init_script("""
            window.__errors = [];
            window.addEventListener('error', function(e) {
                window.__errors.push(e.error?.message || e.message);
            });
            window.addEventListener('unhandledrejection', function(e) {
                window.__errors.push(e.reason?.message || String(e.reason));
            });
        """)
        
        page = await context.new_page()
        
        # === TEST 1: English landing page ===
        print("=" * 60)
        print("TEST 1: English site (/en) landing page")
        print("=" * 60)
        await page.goto('https://demo.blivoai.com/en', wait_until='networkidle')
        
        h1 = await page.evaluate("document.querySelector('h1')?.textContent || 'no h1'")
        print(f"  Landing H1: {h1}")
        
        # Check ALL visible text for Arabic on /en
        all_text = await page.evaluate("""
            (function() {
                var texts = [];
                document.querySelectorAll('h1,h2,h3,p,span,button,a').forEach(function(el) {
                    var t = el.textContent.trim();
                    if (t && t.length > 2 && t.length < 100) texts.push(t);
                });
                return texts.slice(0, 30);
            })()
        """)
        arabic_in_en = [t for t in all_text if any(ord(c) > 0x600 and ord(c) < 0x700 for c in t)]
        print(f"  Arabic text found on /en: {arabic_in_en[:15]}")
        
        # === TEST 2: Login with WRONG password on /en ===
        print("\n" + "=" * 60)
        print("TEST 2: Wrong login on /en - check error message language")
        print("=" * 60)
        
        await page.click('button:has-text("Log in")')
        await page.wait_for_timeout(1000)
        
        # Fill wrong credentials
        email_input = page.locator('input[type="email"]').first
        pass_input = page.locator('input[type="password"]').first
        await email_input.fill('wrong@test.com')
        await pass_input.fill('wrongpassword')
        await page.click('button:has-text("Log In")')
        await page.wait_for_timeout(3000)
        
        # Check toast notification language
        toast_msgs = await page.evaluate("""
            (function() {
                var msgs = [];
                // Check sonner toast container
                var toastContainer = document.querySelector('[data-sonner-toaster], ol[data-sonner-toaster]');
                if (toastContainer) {
                    toastContainer.querySelectorAll('li, [data-sonner-toast]').forEach(function(el) {
                        msgs.push(el.textContent.trim());
                    });
                }
                // Check any visible error text
                document.querySelectorAll('[class*="destructive"], [class*="error"]').forEach(function(el) {
                    var t = el.textContent.trim();
                    if (t && t.length < 200) msgs.push(t);
                });
                return msgs;
            })()
        """)
        print(f"  Toast/error messages after wrong login: {toast_msgs}")
        
        for msg in toast_msgs:
            has_arabic = any(ord(c) > 0x600 and ord(c) < 0x700 for c in msg)
            if has_arabic:
                print(f"  ⚠️ ARABIC MESSAGE ON ENGLISH PAGE: '{msg}'")
        
        # === TEST 3: Login correctly on /en ===
        print("\n" + "=" * 60)
        print("TEST 3: Correct login on /en - check dashboard")
        print("=" * 60)
        
        await page.goto('https://demo.blivoai.com/en', wait_until='networkidle')
        await page.click('button:has-text("Log in")')
        await page.wait_for_timeout(1000)
        
        email_input = page.locator('input[type="email"]').first
        pass_input = page.locator('input[type="password"]').first
        await email_input.fill('admin@blivoai.com')
        await pass_input.fill('BlivoAdmin2024!')
        await page.click('button:has-text("Log In")')
        await page.wait_for_timeout(5000)
        
        # Check if error page or dashboard
        page_state = await page.evaluate("document.querySelector('h2')?.textContent || document.querySelector('h1')?.textContent || 'unknown'")
        print(f"  Page state: {page_state[:100]}")
        
        if 'Application error' in page_state:
            print("  ❌ STILL GETTING ERROR!")
            errors = await page.evaluate("JSON.stringify(window.__errors)")
            print(f"  Errors: {errors}")
        else:
            print("  ✅ Dashboard loaded")
            
            # Check sidebar language consistency
            sidebar_texts = await page.evaluate("""
                (function() {
                    var aside = document.querySelector('aside');
                    if (!aside) return ['no sidebar'];
                    var texts = [];
                    aside.querySelectorAll('button, span, p, a, h2').forEach(function(el) {
                        var t = el.textContent.trim();
                        if (t && t.length > 1 && t.length < 80) texts.push(t);
                    });
                    return texts;
                })()
            """)
            arabic_sidebar = [t for t in sidebar_texts if any(ord(c) > 0x600 and ord(c) < 0x700 for c in t)]
            print(f"  Sidebar texts: {sidebar_texts[:25]}")
            print(f"  Arabic in sidebar on /en: {arabic_sidebar[:10]}")
            
            # Check main content language
            main_content = await page.evaluate("document.querySelector('main')?.textContent?.substring(0, 300) || 'no main'")
            print(f"  Main content: {main_content[:200]}")
            
            # === TEST 4: API data accuracy ===
            print("\n" + "=" * 60)
            print("TEST 4: API data vs displayed data")
            print("=" * 60)
            
            api_data = await page.evaluate("""
                (async function() {
                    try {
                        var res = await fetch('/api/auth/me');
                        var data = await res.json();
                        return {
                            userName: data.user?.name || 'unknown',
                            companyName: data.company?.name || 'unknown',
                            employeeCount: data.employees?.length || 0,
                            departmentCount: data.departments?.length || 0,
                            employees: (data.employees || []).map(function(e) { return {name: e.name, role: e.role, status: e.status}; }),
                            departments: (data.departments || []).map(function(d) { return {name: d.name, color: d.color}; })
                        };
                    } catch(e) { return {error: e.message}; }
                })()
            """)
            print(f"  API User: {api_data.get('userName', 'N/A')}")
            print(f"  API Company: {api_data.get('companyName', 'N/A')}")
            print(f"  API Employees ({api_data.get('employeeCount', 0)}): {api_data.get('employees', [])}")
            print(f"  API Departments ({api_data.get('departmentCount', 0)}): {api_data.get('departments', [])}")
            
            # Check displayed name vs API
            displayed_info = await page.evaluate("""
                (function() {
                    var spans = document.querySelectorAll('span.text-muted-foreground');
                    var texts = [];
                    spans.forEach(function(s) { texts.push(s.textContent.trim()); });
                    return texts;
                })()
            """)
            print(f"  Displayed info spans: {displayed_info}")
            
            # === TEST 5: Browser errors ===
            print("\n" + "=" * 60)
            print("TEST 5: Browser errors")
            print("=" * 60)
            errors = await page.evaluate("JSON.stringify(window.__errors)")
            print(f"  Errors: {errors}")
        
        await browser.close()

asyncio.run(main())
