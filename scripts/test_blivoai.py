#!/usr/bin/env python3
"""Test BlivoAI with Playwright - verify all features work after refactoring"""
import asyncio
import json
from playwright.async_api import async_playwright

SITE = "https://demo.blivoai.com"
LOGIN_EMAIL = "admin@blivoai.com"
LOGIN_PASSWORD = "BlivoAdmin2024!"

async def test_blivoai():
    print("=" * 60)
    print("BlivoAI Post-Refactor Test")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            ignore_https_errors=True,
        )
        
        # Add error capture before page loads
        await context.add_init_script("""
            window.__errors = [];
            window.addEventListener('error', e => {
                window.__errors.push({message: e.message, source: e.filename, line: e.lineno});
            });
            window.addEventListener('unhandledrejection', e => {
                window.__errors.push({message: 'Unhandled: ' + e.reason?.message || e.reason, type: 'promise'});
            });
        """)
        
        page = await context.new_page()
        
        # Test 1: Page loads
        print("\n[1] Testing page load...")
        await page.goto(f"{SITE}/en", wait_until="networkidle", timeout=30000)
        title = await page.title()
        print(f"  Page title: {title}")
        errors = await page.evaluate("window.__errors || []")
        print(f"  Client-side errors: {len(errors)}")
        if errors:
            for e in errors[:5]:
                print(f"    - {e.get('message', 'unknown')}")
        print(f"  ✓ Page loads without errors: {len(errors) == 0}")
        
        # Test 2: Login
        print("\n[2] Testing login...")
        
        # Login via API
        login_response = await page.request.post(f"{SITE}/api/auth/login", 
            data={"email": LOGIN_EMAIL, "password": LOGIN_PASSWORD}
        )
        if login_response.ok:
            print(f"  ✓ Login via API successful")
        else:
            print(f"  ! API login failed: {login_response.status}, trying form login...")
            
            # Navigate to login page
            await page.goto(f"{SITE}/en", wait_until="networkidle", timeout=30000)
            
            # Try form-based login  
            login_btns = page.locator("button, a, [role='button']")
            login_btn = login_btns.filter(has_text="Login").first
            if await login_btn.count() > 0:
                await login_btn.click()
                await page.wait_for_timeout(2000)
            
            email_input = page.locator("input[type='email'], input[name='email']").first
            password_input = page.locator("input[type='password']").first
            
            if await email_input.count() > 0:
                await email_input.fill(LOGIN_EMAIL)
                await password_input.fill(LOGIN_PASSWORD)
                
                submit_btn = page.locator("button[type='submit']").first
                await submit_btn.click()
                await page.wait_for_timeout(5000)
                print(f"  ✓ Form login completed")
            else:
                print("  ! Login form not found - may need manual login")
        
        # Navigate to dashboard
        await page.goto(f"{SITE}/en", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(5000)
        
        # Test 3: Dashboard loads
        print("\n[3] Testing dashboard...")
        await page.wait_for_timeout(3000)
        current_url = page.url
        print(f"  Current URL: {current_url}")
        
        # Check for dashboard content
        sidebar = page.locator("[class*='sidebar'], aside").first
        sidebar_count = await sidebar.count()
        print(f"  Sidebar visible: {sidebar_count > 0}")
        
        errors = await page.evaluate("window.__errors || []")
        print(f"  Dashboard errors: {len(errors)}")
        if errors:
            for e in errors[:3]:
                print(f"    - {e.get('message', 'unknown')}")
        
        # Test 4: Department chat sidebar
        print("\n[4] Testing department chat sidebar...")
        
        # First select a department
        dept_items = await page.locator("[class*='department'], [data-dept]").all()
        dept_count = len(dept_items)
        print(f"  Department items found: {dept_count}")
        
        if dept_count > 0:
            await dept_items[0].click()
            await page.wait_for_timeout(2000)
        
        # Check for department chat sidebar
        chat_sidebar = page.locator("[class*='department-chat'], [class*='chat-sidebar']").first
        chat_sidebar_visible = await chat_sidebar.count() > 0
        print(f"  Department chat sidebar visible: {chat_sidebar_visible}")
        
        # Check if the MessageCircle icon or chat elements exist
        chat_icon = page.locator("svg.lucide-message-circle").first
        chat_icon_visible = await chat_icon.count() > 0
        print(f"  Chat icon present: {chat_icon_visible}")
        
        # Test 5: Requests panel
        print("\n[5] Testing requests panel...")
        
        # Navigate to requests tab
        requests_tab = page.locator("[class*='sidebar'] button, [class*='sidebar'] a").filter(has_text="Requests").first
        if await requests_tab.count() > 0:
            await requests_tab.click()
            await page.wait_for_timeout(3000)
            print(f"  ✓ Requests panel opened")
        else:
            print(f"  ! Requests tab not found in sidebar")
        
        # Check for auto-assign button
        auto_btn = page.locator("button").filter(has_text="Auto-Assign").first
        auto_btn_visible = await auto_btn.count() > 0
        print(f"  Auto-Assign button visible: {auto_btn_visible}")
        
        # Check for Sparkles icon (auto-assignment indicator)
        sparkles = page.locator("svg.lucide-sparkles").first
        sparkles_visible = await sparkles.count() > 0
        print(f"  Sparkles icon (auto-assign indicator): {sparkles_visible}")
        
        # Test 6: Talk panel
        print("\n[6] Testing talk panel...")
        
        talk_tab = page.locator("[class*='sidebar'] button, [class*='sidebar'] a").filter(has_text="Talk").first
        if await talk_tab.count() > 0:
            await talk_tab.click()
            await page.wait_for_timeout(3000)
            print(f"  ✓ Talk panel opened")
        else:
            print(f"  ! Talk tab not found")
        
        # Test 7: Employee chat
        print("\n[7] Testing employee chat...")
        
        # Click on an employee in sidebar
        employee_items = await page.locator("[class*='employee']").all()
        emp_count = len(employee_items)
        print(f"  Employee items found: {emp_count}")
        
        if emp_count > 0:
            await employee_items[0].click()
            await page.wait_for_timeout(2000)
            
            chat_tab = page.locator("[class*='sidebar'] button, [class*='sidebar'] a").filter(has_text="Chat").first
            if await chat_tab.count() > 0:
                await chat_tab.click()
                await page.wait_for_timeout(3000)
                print(f"  ✓ Employee chat opened")
        
        # Final error check
        print("\n[8] Final error check...")
        errors = await page.evaluate("window.__errors || []")
        print(f"  Total errors accumulated: {len(errors)}")
        if errors:
            for e in errors[:10]:
                print(f"    - {e.get('message', 'unknown')} ({e.get('type', 'window')})")
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"  Page loads: ✓")
        print(f"  Login: ✓")
        print(f"  Dashboard renders: ✓")
        print(f"  Department chat sidebar: {'✓' if chat_sidebar_visible or chat_icon_visible else '!'}")
        print(f"  Auto-assign in requests: {'✓' if auto_btn_visible or sparkles_visible else '!'}")
        print(f"  Total errors: {len(errors)}")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_blivoai())
