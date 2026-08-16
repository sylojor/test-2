#!/usr/bin/env python3
"""Comprehensive test: Login on /en, check all error messages language, verify data accuracy."""
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        
        # Capture all errors + console messages + toast notifications
        await context.add_init_script("""
            window.__errors = [];
            window.__toasts = [];
            window.__console = [];
            window.addEventListener('error', function(e) {
                window.__errors.push({msg: e.error?.message || e.message, stack: e.error?.stack?.substring(0,200)});
            });
            window.addEventListener('unhandledrejection', function(e) {
                window.__errors.push({msg: e.reason?.message || String(e.reason)});
            });
            // Intercept toast notifications (sonner)
            var origToast = window.toast;
            if (typeof sonner !== 'undefined') {
                // We'll check the DOM for toast elements instead
            }
            // Intercept console.log/warn/error for language analysis
            var origLog = console.log;
            console.log = function() {
                var args = Array.from(arguments);
                var msg = args.map(a => typeof a === 'string' ? a : a?.message || String(a)).join(' | ');
                window.__console.push({type:'log', msg: msg.substring(0,200)});
                origLog.apply(console, args);
            };
            var origWarn = console.warn;
            console.warn = function() {
                var args = Array.from(arguments);
                var msg = args.map(a => typeof a === 'string' ? a : a?.message || String(a)).join(' | ');
                window.__console.push({type:'warn', msg: msg.substring(0,200)});
                origWarn.apply(console, args);
            };
        """)
        
        page = await context.new_page()
        
        # Test 1: Load English site
        print("=" * 60)
        print("TEST 1: English site (/en)")
        print("=" * 60)
        await page.goto('https://demo.blivoai.com/en', wait_until='networkidle')
        
        # Check landing page language
        h1 = await page.evaluate("document.querySelector('h1')?.textContent || 'no h1'")
        print(f"  Landing H1: {h1}")
        
        # Check if landing page has Arabic text when on /en
        all_text = await page.evaluate("""
            var texts = [];
            document.querySelectorAll('h1,h2,h3,p,span,button,a').forEach(el => {
                var t = el.textContent.trim();
                if (t && t.length > 2 && t.length < 100) texts.push(t);
            });
            return texts.slice(0, 30);
        """)
        
        # Check for Arabic characters in English page
        arabic_in_en = [t for t in all_text if any(ord(c) > 0x600 and ord(c) < 0x700 for c in t)]
        print(f"  Arabic text on /en page: {arabic_in_en[:10]}")
        
        # Test 2: Login with wrong password on /en (should show English error)
        print("\n" + "=" * 60)
        print("TEST 2: Login with wrong password on /en")
        print("=" * 60)
        
        # Click "Log in" button
        login_btns = await page.evaluate("""
            var btns = document.querySelectorAll('button');
            var loginBtn = null;
            btns.forEach(b => {
                if (b.textContent.includes('Log in') || b.textContent.includes('login')) loginBtn = b;
            });
            return loginBtn ? true : false;
        """)
        
        if login_btns:
            # Click login button to show login form
            await page.click('button:has-text("Log in")')
            await page.wait_for_timeout(1000)
            
            # Fill wrong credentials
            await page.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="example"]', 'test@wrong.com')
            await page.fill('input[type="password"]', 'wrongpassword')
            
            # Click submit
            await page.click('button:has-text("Log In")')
            await page.wait_for_timeout(3000)
            
            # Check toast/error message language
            toast_text = await page.evaluate("""
                var toasts = document.querySelectorAll('[data-sonner-toast], [role="status"], .sonner-toast, [data-testid="toast"]');
                var texts = [];
                toasts.forEach(t => texts.push(t.textContent.trim()));
                // Also check for any visible error messages on page
                var errors = document.querySelectorAll('.text-red, .text-destructive, [class*="error"]');
                errors.forEach(e => texts.push(e.textContent.trim()));
                return texts;
            """)
            print(f"  Toast/error messages: {toast_text}")
            
            # Check if error message is Arabic on English page
            for msg in toast_text:
                if any(ord(c) > 0x600 and ord(c) < 0x700 for c in msg):
                    print(f"  ⚠️ ARABIC ERROR ON ENGLISH PAGE: '{msg}'")
        
        # Test 3: Login with correct credentials on /en
        print("\n" + "=" * 60)
        print("TEST 3: Login with correct credentials on /en")
        print("=" * 60)
        
        # Go back to landing and login properly
        await page.goto('https://demo.blivoai.com/en', wait_until='networkidle')
        await page.click('button:has-text("Log in")')
        await page.wait_for_timeout(1000)
        
        await page.fill('input[placeholder*="email"], input[type="email"]', 'admin@blivoai.com')
        await page.fill('input[type="password"]', 'BlivoAdmin2024!')
        await page.click('button:has-text("Log In")')
        await page.wait_for_timeout(5000)
        
        # Check dashboard
        h2 = await page.evaluate("document.querySelector('h2')?.textContent || ''")
        print(f"  Dashboard H2: {h2}")
        
        # Check all sidebar text for Arabic on English page
        sidebar_text = await page.evaluate("""
            var aside = document.querySelector('aside');
            if (!aside) return 'no sidebar';
            var texts = [];
            aside.querySelectorAll('button, span, p, a, h2').forEach(el => {
                var t = el.textContent.trim();
                if (t && t.length > 1) texts.push(t);
            });
            return texts;
        """)
        print(f"  Sidebar texts: {sidebar_text[:20]}")
        
        # Check if sidebar has Arabic when on /en
        arabic_sidebar = [t for t in sidebar_text if any(ord(c) > 0x600 and ord(c) < 0x700 for c in t)]
        print(f"  Arabic in sidebar on /en: {arabic_sidebar[:10]}")
        
        # Check top bar
        topbar_text = await page.evaluate("""
            var topbar = document.querySelector('header, .h-12, div.border-b');
            if (!topbar) return 'no topbar';
            var texts = [];
            topbar.querySelectorAll('button, span, a, p').forEach(el => {
                var t = el.textContent.trim();
                if (t && t.length > 1) texts.push(t);
            });
            return texts;
        """)
        print(f"  Top bar texts: {topbar_text}")
        
        # Check main content
        main_text = await page.evaluate("""
            var main = document.querySelector('main');
            if (!main) return 'no main';
            return main.textContent.substring(0, 500);
        """)
        print(f"  Main content: {main_text[:200]}")
        
        # Test 4: Check data accuracy
        print("\n" + "=" * 60)
        print("TEST 4: Data accuracy check")
        print("=" * 60)
        
        # Get API data for comparison
        api_data = await page.evaluate("""
            async function() {
                var res = await fetch('/api/auth/me');
                var data = await res.json();
                return {
                    userName: data.user?.name,
                    companyName: data.company?.name,
                    employeeCount: data.employees?.length,
                    departmentCount: data.departments?.length,
                    employees: data.employees?.map(e => ({name: e.name, role: e.role, status: e.status})),
                    departments: data.departments?.map(d => ({name: d.name, color: d.color}))
                };
            }
        """)
        print(f"  API User: {api_data.get('userName', 'N/A')}")
        print(f"  API Company: {api_data.get('companyName', 'N/A')}")
        print(f"  API Employees: {api_data.get('employeeCount', 0)}")
        print(f"  API Departments: {api_data.get('departmentCount', 0)}")
        print(f"  Employees detail: {api_data.get('employees', [])}")
        print(f"  Departments detail: {api_data.get('departments', [])}")
        
        # Check what page displays vs API data
        displayed_name = await page.evaluate("""
            var nameEl = document.querySelector('.truncate, span.text-muted-foreground');
            return nameEl?.textContent || 'not found';
        """)
        print(f"  Displayed name vs API: '{displayed_name}' vs '{api_data.get('userName', '')}'")
        
        # Test 5: Check errors
        print("\n" + "=" * 60)
        print("TEST 5: Browser errors")
        print("=" * 60)
        errors = await page.evaluate("JSON.stringify(window.__errors)")
        console = await page.evaluate("JSON.stringify(window.__console)")
        print(f"  Errors: {errors}")
        print(f"  Console warnings: {[c for c in eval(console) if c.get('type') == 'warn'][:5]}")
        
        await browser.close()

asyncio.run(main())
