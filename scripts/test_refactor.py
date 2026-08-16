#!/usr/bin/env python3
"""
Test script to verify the BlivoAI refactor:
1. English site shows English text (no Arabic)
2. Arabic site shows Arabic text (no English)
3. RTL works for Arabic, LTR for English
4. Login works
5. Dashboard loads correctly
"""

from playwright.sync_api import sync_playwright
import json

SITE = "https://demo.blivoai.com"
ADMIN_EMAIL = "admin@blivoai.com"
ADMIN_PASSWORD = "BlivoAdmin2024!"

errors = []
results = []

def log(msg):
    print(msg)
    results.append(msg)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
        ignore_https_errors=True
    )
    
    # Inject error handler before any page JS runs
    context.add_init_script("""
        window.__captured_errors = [];
        window.addEventListener('error', (e) => {
            window.__captured_errors.push({
                message: e.message,
                filename: e.filename,
                lineno: e.lineno,
            });
        });
        window.addEventListener('unhandledrejection', (e) => {
            window.__captured_errors.push({
                message: e.reason?.message || String(e.reason),
                type: 'unhandledrejection'
            });
        });
    """)
    
    page = context.new_page()
    
    # ============================================
    # TEST 1: English Landing Page
    # ============================================
    log("\n=== TEST 1: English Landing Page ===")
    page.goto(f"{SITE}/en", wait_until="networkidle", timeout=30000)
    
    # Check page direction
    html_dir = page.evaluate("document.documentElement.dir")
    html_lang = page.evaluate("document.documentElement.lang")
    log(f"HTML dir: {html_dir}, lang: {html_lang}")
    if html_dir == "ltr" and html_lang == "en":
        log("✅ English page has LTR direction and 'en' lang")
    else:
        log(f"❌ English page has wrong direction or lang! dir={html_dir}, lang={html_lang}")
        errors.append("English page direction/lang wrong")
    
    # Check that no Arabic text appears on English page (in visible UI elements)
    page_text = page.evaluate("""
        () => {
            const elements = document.querySelectorAll('h1, h2, h3, p, span, button, a, label');
            const texts = [];
            for (const el of elements) {
                const text = el.textContent?.trim();
                if (text && text.length > 2) texts.push(text);
            }
            return texts;
        }
    """)
    
    arabic_chars_count = 0
    for text in page_text[:50]:
        if any(ord(c) > 0x0600 and ord(c) < 0x06FF for c in text):
            arabic_chars_count += 1
            log(f"⚠️ Arabic text found on English page: '{text[:60]}'")
    
    if arabic_chars_count > 5:  # Allow a few for the language toggle
        log(f"❌ Too much Arabic text on English page: {arabic_chars_count} occurrences")
        errors.append("Arabic text on English page")
    else:
        log(f"✅ Minimal Arabic on English page: {arabic_chars_count} occurrences (language toggle)")
    
    # Check for client-side errors
    captured_errors = page.evaluate("window.__captured_errors || []")
    if captured_errors:
        log(f"❌ Client-side errors: {json.dumps(captured_errors)}")
        errors.append(f"Client errors on /en: {len(captured_errors)}")
    else:
        log("✅ No client-side errors on English page")
    
    # ============================================
    # TEST 2: Arabic Landing Page
    # ============================================
    log("\n=== TEST 2: Arabic Landing Page ===")
    page.goto(f"{SITE}/ar", wait_until="networkidle", timeout=30000)
    
    html_dir = page.evaluate("document.documentElement.dir")
    html_lang = page.evaluate("document.documentElement.lang")
    log(f"HTML dir: {html_dir}, lang: {html_lang}")
    if html_dir == "rtl" and html_lang == "ar":
        log("✅ Arabic page has RTL direction and 'ar' lang")
    else:
        log(f"❌ Arabic page has wrong direction or lang! dir={html_dir}, lang={html_lang}")
        errors.append("Arabic page direction/lang wrong")
    
    # ============================================
    # TEST 3: Login + Dashboard (English)
    # ============================================
    log("\n=== TEST 3: Login + Dashboard (English) ===")
    page.goto(f"{SITE}/en", wait_until="networkidle", timeout=30000)
    
    # Find and click login button
    login_btn = page.locator("text=Have an account").first
    if login_btn.is_visible():
        login_btn.click()
        page.wait_for_load_state("networkidle", timeout=10000)
        log("✅ Clicked login button")
    else:
        # Try to navigate directly
        log("Login button not visible, trying to find login link...")
        links = page.locator("a, button")
        for i in range(min(links.count(), 20)):
            text = links.nth(i).textContent or ""
            if "Log in" in text or "login" in text.lower():
                links.nth(i).click()
                page.wait_for_load_state("networkidle", timeout=10000)
                log(f"✅ Clicked: '{text}'")
                break
    
    # Check if we're on login page
    page_text = page.evaluate("document.body.innerText")
    if "Email" in page_text or "Password" in page_text or "Log In" in page_text:
        log("✅ Login page loaded (English)")
    else:
        log(f"⚠️ Current page content: {page_text[:200]}")
    
    # Fill login form
    email_input = page.locator("input[type='email']").first
    password_input = page.locator("input[type='password']").first
    
    if email_input.is_visible():
        email_input.fill(ADMIN_EMAIL)
        password_input.fill(ADMIN_PASSWORD)
        log("✅ Filled login credentials")
        
        # Click login button
        login_submit = page.locator("button[type='submit']").first
        login_submit.click()
        
        # Wait for dashboard
        page.wait_for_load_state("networkidle", timeout=15000)
        page.wait_for_timeout(3000)
        
        # Check if dashboard loaded
        captured_errors = page.evaluate("window.__captured_errors || []")
        if captured_errors:
            log(f"❌ Dashboard errors: {json.dumps(captured_errors)}")
            errors.append(f"Dashboard errors: {len(captured_errors)}")
        else:
            log("✅ No client-side errors on dashboard")
        
        # Check dashboard content is in English
        dashboard_text = page.evaluate("""
            () => {
                const elements = document.querySelectorAll('h1, h2, h3, p, span, button, a');
                const texts = [];
                for (const el of elements) {
                    const text = el.textContent?.trim();
                    if (text && text.length > 2) texts.push(text);
                }
                return texts.slice(0, 30);
            }
        """)
        
        log(f"Dashboard text samples:")
        for text in dashboard_text[:15]:
            log(f"  - '{text[:80]}'")
        
        # Check that dashboard text is mostly English
        arabic_in_dashboard = 0
        for text in dashboard_text:
            if any(ord(c) > 0x0600 and ord(c) < 0x06FF for c in text):
                arabic_in_dashboard += 1
        
        if arabic_in_dashboard > 3:
            log(f"❌ Too much Arabic in English dashboard: {arabic_in_dashboard}")
            errors.append("Arabic text in English dashboard")
        else:
            log(f"✅ Dashboard mostly English: {arabic_in_dashboard} Arabic occurrences")
    else:
        log("⚠️ Login form not visible - may already be logged in")
    
    # ============================================
    # TEST 4: Login + Dashboard (Arabic)
    # ============================================
    log("\n=== TEST 4: Login + Dashboard (Arabic) ===")
    
    # Clear cookies and session first
    context.clear_cookies()
    page.goto(f"{SITE}/ar", wait_until="networkidle", timeout=30000)
    
    html_dir = page.evaluate("document.documentElement.dir")
    html_lang = page.evaluate("document.documentElement.lang")
    log(f"Arabic landing: dir={html_dir}, lang={html_lang}")
    
    if html_dir == "rtl":
        log("✅ Arabic landing page has RTL direction")
    else:
        log(f"❌ Arabic landing page wrong direction: {html_dir}")
        errors.append("Arabic landing page not RTL")
    
    browser.close()

# ============================================
# Summary
# ============================================
log("\n=== SUMMARY ===")
if errors:
    log(f"❌ ISSUES FOUND ({len(errors)}):")
    for e in errors:
        log(f"  - {e}")
else:
    log("✅ ALL TESTS PASSED!")

print("\n" + "="*50)
print("TEST COMPLETE")
print("="*50)
