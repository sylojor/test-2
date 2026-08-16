const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  
  // Test 1: Navigate from admin to site (the original crash)
  console.log('\n=== TEST 1: Admin → Site (back to site) ===');
  const context1 = await browser.newContext();
  const page1 = await context1.newPage();
  
  const pageErrors1 = [];
  page1.on('pageerror', error => {
    pageErrors1.push({ message: error.message, stack: error.stack });
  });
  
  // Login as admin first
  await page1.goto('https://demo.blivoai.com/ar/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page1.waitForTimeout(3000);
  
  // Fill login form
  await page1.fill('input[type="email"]', 'admin@blivoai.com');
  await page1.fill('input[type="password"]', 'BlivoAdmin2024!');
  await page1.click('button:has-text("تسجيل الدخول")');
  await page1.waitForTimeout(5000);
  
  // Click "Back to site"
  try {
    await page1.click('button:has-text("العودة للموقع")', { timeout: 5000 });
  } catch {
    // Try alternate text
    await page1.click('button:has-text("Back to Site")', { timeout: 5000 });
  }
  
  await page1.waitForTimeout(8000);
  
  const url1 = page1.url();
  const heading1 = await page1.$('h2');
  const headingText1 = heading1 ? await heading1.textContent() : '';
  const isErrorPage = headingText1?.includes('Application error') || headingText1?.includes('client-side exception');
  
  console.log(`URL: ${url1}`);
  console.log(`Heading: ${headingText1}`);
  console.log(`Error page: ${isErrorPage}`);
  console.log(`Page errors: ${pageErrors1.length}`);
  pageErrors1.forEach(e => console.log(`  Error: ${e.message}`));
  
  if (isErrorPage) {
    console.log('❌ TEST 1 FAILED — Still showing Application Error');
  } else {
    console.log('✅ TEST 1 PASSED — No client-side exception');
  }
  
  await context1.close();
  
  // Test 2: Admin page in Arabic
  console.log('\n=== TEST 2: Admin page in Arabic ===');
  const context2 = await browser.newContext();
  const page2 = await context2.newPage();
  
  const pageErrors2 = [];
  page2.on('pageerror', error => {
    pageErrors2.push({ message: error.message, stack: error.stack });
  });
  
  // Login as admin
  await page2.goto('https://demo.blivoai.com/ar/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page2.waitForTimeout(3000);
  
  await page2.fill('input[type="email"]', 'admin@blivoai.com');
  await page2.fill('input[type="password"]', 'BlivoAdmin2024!');
  await page2.click('button:has-text("تسجيل الدخول")');
  await page2.waitForTimeout(5000);
  
  // Check if admin loaded
  const adminLoaded = await page2.$('button:has-text("نظرة عامة")') || await page2.$('button:has-text("Overview")');
  console.log(`Admin loaded: ${!!adminLoaded}`);
  console.log(`Page errors on admin: ${pageErrors2.length}`);
  pageErrors2.forEach(e => console.log(`  Error: ${e.message}`));
  
  if (pageErrors2.length === 0) {
    console.log('✅ TEST 2 PASSED — No crash on admin Arabic');
  } else {
    console.log('❌ TEST 2 FAILED — Crash on admin Arabic');
  }
  
  await context2.close();
  
  // Test 3: Admin page in English
  console.log('\n=== TEST 3: Admin page in English ===');
  const context3 = await browser.newContext();
  const page3 = await context3.newPage();
  
  const pageErrors3 = [];
  page3.on('pageerror', error => {
    pageErrors3.push({ message: error.message, stack: error.stack });
  });
  
  // Login as admin in English
  await page3.goto('https://demo.blivoai.com/en/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await page3.waitForTimeout(3000);
  
  await page3.fill('input[type="email"]', 'admin@blivoai.com');
  await page3.fill('input[type="password"]', 'BlivoAdmin2024!');
  await page3.click('button:has-text("Login")');
  await page3.waitForTimeout(5000);
  
  const adminEnLoaded = await page3.$('button:has-text("Overview")');
  console.log(`Admin EN loaded: ${!!adminEnLoaded}`);
  console.log(`Page errors on admin EN: ${pageErrors3.length}`);
  pageErrors3.forEach(e => console.log(`  Error: ${e.message}`));
  
  await context3.close();
  
  // Test 4: Main site without auth cookie (should work)
  console.log('\n=== TEST 4: Main site without auth ===');
  const context4 = await browser.newContext();
  const page4 = await context4.newPage();
  
  const pageErrors4 = [];
  page4.on('pageerror', error => {
    pageErrors4.push({ message: error.message, stack: error.stack });
  });
  
  await page4.goto('https://demo.blivoai.com/ar', { waitUntil: 'networkidle', timeout: 30000 });
  await page4.waitForTimeout(5000);
  
  const siteText4 = await page4.evaluate(() => document.body.innerText.slice(0, 200));
  const hasError4 = siteText4.includes('Application error');
  console.log(`Site text: ${siteText4}`);
  console.log(`Has error: ${hasError4}`);
  console.log(`Page errors: ${pageErrors4.length}`);
  
  if (!hasError4 && pageErrors4.length === 0) {
    console.log('✅ TEST 4 PASSED — Landing page loads fine');
  } else {
    console.log('❌ TEST 4 FAILED — Landing page has errors');
  }
  
  await context4.close();
  
  await browser.close();
  
  console.log('\n=== SUMMARY ===');
  console.log(`Test 1 (Admin → Site): ${isErrorPage ? 'FAILED' : 'PASSED'}`);
  console.log(`Test 2 (Admin Arabic): ${pageErrors2.length === 0 ? 'PASSED' : 'FAILED'}`);
  console.log(`Test 3 (Admin English): ${pageErrors3.length === 0 ? 'PASSED' : 'FAILED'}`);
  console.log(`Test 4 (Landing no auth): ${!hasError4 && pageErrors4.length === 0 ? 'PASSED' : 'FAILED'}`);
})();
