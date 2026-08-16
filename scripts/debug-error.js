const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  // Set admin auth cookie
  await context.addCookies([{
    name: 'oec_token',
    value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJjbXJ6aGRmMGkwMDAwbng0dzdiOG9mcWpyIiwiZW1haWwiOiJhZG1pbkBibGl2b2FpLmNvbSIsInJvbGUiOiJPV05FUiIsImNvbXBhbnlJZCI6ImNtczBzMDQzcDAwMDNuYzAxbG4zbHh6enUiLCJpYXQiOjE3ODUwNDI1MDYsImV4cCI6MTc4NTY0NzMwNiwiaXNzIjoiYmxpdm9haSJ9.H_H0s8c9JhCPFiXeyaeaevv4a1RBrLMRBQ8wRcXySJU',
    domain: 'demo.blivoai.com',
    path: '/'
  }]);
  
  const page = await context.newPage();
  
  const consoleErrors = [];
  const pageErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push({ message: error.message, stack: error.stack });
  });
  
  // Navigate to the main site page
  try {
    await page.goto('https://demo.blivoai.com/ar', { waitUntil: 'networkidle', timeout: 30000 });
  } catch (e) {
    console.log('Navigation timeout/error:', e.message);
  }
  
  // Wait more time for client-side hydration and session restore
  await page.waitForTimeout(8000);
  
  // Get page content
  const heading = await page.$('h2');
  const headingText = heading ? await heading.textContent() : 'no heading';
  
  console.log('\n=== Page heading ===');
  console.log(headingText);
  
  console.log('\n=== Console Errors ===');
  consoleErrors.forEach(e => console.log(`[${e.location?.url}] ${e.text}`));
  
  console.log('\n=== Page Errors ===');
  pageErrors.forEach(e => console.log(`Message: ${e.message}\nStack: ${e.stack}`));
  
  // Check if it's the error page
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('\n=== Body text (first 500 chars) ===');
  console.log(bodyText.slice(0, 500));
  
  await browser.close();
})();
