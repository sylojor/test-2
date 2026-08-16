const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  let passCount = 0;
  let failCount = 0;
  
  function logTest(name, passed, details = '') {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}${details ? ' — ' + details : ''}`);
    if (passed) passCount++;
    else failCount++;
  }

  // ============================================
  // TEST 1: Landing page (Arabic) - no auth
  // ============================================
  console.log('\n=== TEST 1: Landing page AR (no auth) ===');
  const ctx1 = await browser.newContext();
  const pg1 = await ctx1.newPage();
  const errs1 = [];
  pg1.on('pageerror', e => errs1.push(e.message));
  
  await pg1.goto('https://demo.blivoai.com/ar', { waitUntil: 'networkidle', timeout: 30000 });
  await pg1.waitForTimeout(5000);
  
  const landingAr = await pg1.$('h1');
  const landingArText = landingAr ? await landingAr.textContent() : '';
  logTest('Landing AR loads', !landingArText.includes('Application error') && errs1.length === 0, landingArText.slice(0, 50));
  
  // Check centered cards
  const cardsAr = await pg1.$$('.text-center');
  const cardCount = cardsAr.length;
  logTest('Cards have text-center', cardCount > 0, `Found ${cardCount} centered elements`);
  
  await ctx1.close();

  // ============================================
  // TEST 2: Landing page (English) - no auth
  // ============================================
  console.log('\n=== TEST 2: Landing page EN (no auth) ===');
  const ctx2 = await browser.newContext();
  const pg2 = await ctx2.newPage();
  const errs2 = [];
  pg2.on('pageerror', e => errs2.push(e.message));
  
  await pg2.goto('https://demo.blivoai.com/en', { waitUntil: 'networkidle', timeout: 30000 });
  await pg2.waitForTimeout(5000);
  
  const landingEn = await pg2.$('h1');
  const landingEnText = landingEn ? await landingEn.textContent() : '';
  logTest('Landing EN loads', !landingEnText.includes('Application error') && errs2.length === 0, landingEnText.slice(0, 50));
  
  await ctx2.close();

  // ============================================
  // TEST 3: Admin → Back to Site (Arabic)
  // ============================================
  console.log('\n=== TEST 3: Admin → Back to Site ===');
  const ctx3 = await browser.newContext();
  const pg3 = await ctx3.newPage();
  const errs3 = [];
  pg3.on('pageerror', e => errs3.push(e.message));
  
  await pg3.goto('https://demo.blivoai.com/ar/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await pg3.waitForTimeout(3000);
  
  // Login
  await pg3.fill('input[type="email"]', 'admin@blivoai.com');
  await pg3.fill('input[type="password"]', 'BlivoAdmin2024!');
  await pg3.click('button:has-text("تسجيل الدخول")');
  await pg3.waitForTimeout(5000);
  
  // Check admin loaded
  const adminLoaded = await pg3.$('button:has-text("نظرة عامة")');
  logTest('Admin AR loads after login', !!adminLoaded && errs3.length === 0);
  
  // Click "Back to site"
  await pg3.click('button:has-text("العودة للموقع")');
  await pg3.waitForTimeout(8000);
  
  const backUrl = pg3.url();
  const backHeading = await pg3.$('h2');
  const backHeadingText = backHeading ? await backHeading.textContent() : '';
  const backError = backHeadingText?.includes('Application error');
  logTest('Back to site works', !backError && errs3.length === 0, `URL: ${backUrl}`);
  
  await ctx3.close();

  // ============================================
  // TEST 4: Admin in English
  // ============================================
  console.log('\n=== TEST 4: Admin EN ===');
  const ctx4 = await browser.newContext();
  const pg4 = await ctx4.newPage();
  const errs4 = [];
  pg4.on('pageerror', e => errs4.push(e.message));
  
  await pg4.goto('https://demo.blivoai.com/en/admin', { waitUntil: 'networkidle', timeout: 30000 });
  await pg4.waitForTimeout(3000);
  
  await pg4.fill('input[type="email"]', 'admin@blivoai.com');
  await pg4.fill('input[type="password"]', 'BlivoAdmin2024!');
  await pg4.click('button:has-text("Login")');
  await pg4.waitForTimeout(5000);
  
  const adminEnLoaded = await pg4.$('button:has-text("Overview")');
  logTest('Admin EN loads', !!adminEnLoaded && errs4.length === 0);
  
  await ctx4.close();

  // ============================================
  // TEST 5: Blog page (Arabic)
  // ============================================
  console.log('\n=== TEST 5: Blog AR ===');
  const ctx5 = await browser.newContext();
  const pg5 = await ctx5.newPage();
  const errs5 = [];
  pg5.on('pageerror', e => errs5.push(e.message));
  
  await pg5.goto('https://demo.blivoai.com/ar/blog', { waitUntil: 'networkidle', timeout: 30000 });
  await pg5.waitForTimeout(3000);
  
  const blogArTitle = await pg5.$('h1');
  const blogArText = blogArTitle ? await blogArTitle.textContent() : '';
  logTest('Blog AR loads', !blogArText?.includes('Application error') && errs5.length === 0, blogArText?.slice(0, 50));
  
  await ctx5.close();

  // ============================================
  // TEST 6: Blog page (English)
  // ============================================
  console.log('\n=== TEST 6: Blog EN ===');
  const ctx6 = await browser.newContext();
  const pg6 = await ctx6.newPage();
  const errs6 = [];
  pg6.on('pageerror', e => errs6.push(e.message));
  
  await pg6.goto('https://demo.blivoai.com/en/blog', { waitUntil: 'networkidle', timeout: 30000 });
  await pg6.waitForTimeout(3000);
  
  const blogEnTitle = await pg6.$('h1');
  const blogEnText = blogEnTitle ? await blogEnTitle.textContent() : '';
  logTest('Blog EN loads', !blogEnText?.includes('Application error') && errs6.length === 0, blogEnText?.slice(0, 50));
  
  await ctx6.close();

  // ============================================
  // TEST 7: About page
  // ============================================
  console.log('\n=== TEST 7: About page ===');
  const ctx7 = await browser.newContext();
  const pg7 = await ctx7.newPage();
  const errs7 = [];
  pg7.on('pageerror', e => errs7.push(e.message));
  
  await pg7.goto('https://demo.blivoai.com/ar/about', { waitUntil: 'networkidle', timeout: 30000 });
  await pg7.waitForTimeout(3000);
  
  const aboutUrl = pg7.url();
  const aboutOk = await pg7.$('h1, h2');
  const aboutText = aboutOk ? await aboutOk.textContent() : '';
  logTest('About AR loads', !aboutText?.includes('Application error') && errs7.length === 0, aboutText?.slice(0, 50));
  
  await ctx7.close();

  // ============================================
  // TEST 8: Privacy page
  // ============================================
  console.log('\n=== TEST 8: Privacy page ===');
  const ctx8 = await browser.newContext();
  const pg8 = await ctx8.newPage();
  const errs8 = [];
  pg8.on('pageerror', e => errs8.push(e.message));
  
  await pg8.goto('https://demo.blivoai.com/ar/privacy', { waitUntil: 'networkidle', timeout: 30000 });
  await pg8.waitForTimeout(3000);
  
  const privOk = await pg8.$('h1, h2');
  const privText = privOk ? await privOk.textContent() : '';
  logTest('Privacy AR loads', !privText?.includes('Application error') && errs8.length === 0, privText?.slice(0, 50));
  
  await ctx8.close();

  // ============================================
  // TEST 9: Terms page
  // ============================================
  console.log('\n=== TEST 9: Terms page ===');
  const ctx9 = await browser.newContext();
  const pg9 = await ctx9.newPage();
  const errs9 = [];
  pg9.on('pageerror', e => errs9.push(e.message));
  
  await pg9.goto('https://demo.blivoai.com/ar/terms', { waitUntil: 'networkidle', timeout: 30000 });
  await pg9.waitForTimeout(3000);
  
  const termsOk = await pg9.$('h1, h2');
  const termsText = termsOk ? await termsOk.textContent() : '';
  logTest('Terms AR loads', !termsText?.includes('Application error') && errs9.length === 0, termsText?.slice(0, 50));
  
  await ctx9.close();

  // ============================================
  // TEST 10: API Docs page
  // ============================================
  console.log('\n=== TEST 10: API Docs ===');
  const ctx10 = await browser.newContext();
  const pg10 = await ctx10.newPage();
  const errs10 = [];
  pg10.on('pageerror', e => errs10.push(e.message));
  
  await pg10.goto('https://demo.blivoai.com/ar/api-docs', { waitUntil: 'networkidle', timeout: 30000 });
  await pg10.waitForTimeout(3000);
  
  const apiOk = await pg10.$('h1, h2');
  const apiText = apiOk ? await apiOk.textContent() : '';
  logTest('API Docs loads', !apiText?.includes('Application error') && errs10.length === 0, apiText?.slice(0, 50));
  
  await ctx10.close();

  // ============================================
  // TEST 11: Pricing page
  // ============================================
  console.log('\n=== TEST 11: Pricing page EN ===');
  const ctx11 = await browser.newContext();
  const pg11 = await ctx11.newPage();
  const errs11 = [];
  pg11.on('pageerror', e => errs11.push(e.message));
  
  await pg11.goto('https://demo.blivoai.com/en#pricing', { waitUntil: 'networkidle', timeout: 30000 });
  await pg11.waitForTimeout(3000);
  
  logTest('Pricing EN section loads', errs11.length === 0);
  
  await ctx11.close();

  // ============================================
  // TEST 12: Root redirect
  // ============================================
  console.log('\n=== TEST 12: Root redirect ===');
  const ctx12 = await browser.newContext();
  const pg12 = await ctx12.newPage();
  
  await pg12.goto('https://demo.blivoai.com/', { waitUntil: 'networkidle', timeout: 30000 });
  const rootUrl = pg12.url();
  logTest('Root redirects to locale', rootUrl.includes('/ar') || rootUrl.includes('/en'), `URL: ${rootUrl}`);
  
  await ctx12.close();

  // ============================================
  // TEST 13: 404 page
  // ============================================
  console.log('\n=== TEST 13: Not-found page ===');
  const ctx13 = await browser.newContext();
  const pg13 = await ctx13.newPage();
  const errs13 = [];
  pg13.on('pageerror', e => errs13.push(e.message));
  
  await pg13.goto('https://demo.blivoai.com/ar/nonexistent-page', { waitUntil: 'networkidle', timeout: 30000 });
  await pg13.waitForTimeout(3000);
  
  logTest('404 handles gracefully', errs13.length === 0);
  
  await ctx13.close();

  await browser.close();
  
  console.log('\n========================================');
  console.log(`TOTAL: ${passCount} passed, ${failCount} failed`);
  console.log('========================================');
})();
