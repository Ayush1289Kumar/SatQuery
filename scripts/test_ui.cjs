const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function run() {
  console.log('Launching browser with Playwright Chromium...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  const title = await page.title();
  console.log('Page Title:', title);

  // Check upload card presence
  const heading = await page.locator('h2').first().innerText();
  console.log('Header text:', heading);

  // Check slots
  const earlierSlot = await page.locator('text=Earlier Date (Slot 1)').count();
  const laterSlot = await page.locator('text=Later Date (Slot 2)').count();
  console.log('Slot 1 label count:', earlierSlot);
  console.log('Slot 2 label count:', laterSlot);

  // Click Assam Floods demo scenario
  console.log('Clicking Assam Floods demo scenario...');
  const assamBtn = page.locator('button:has-text("Assam Floods 2024")');
  if (await assamBtn.count() > 0) {
    await assamBtn.click();
    await page.waitForTimeout(500);
    const loadedCount = await page.locator('text=✓ loaded').count();
    console.log('Loaded slots count after clicking scenario:', loadedCount);
    const readyText = await page.locator('text=files ready').innerText();
    console.log('Ready status text:', readyText);
  }

  // Take screenshot
  const screenshotPath = path.join(__dirname, '..', 'dist', 'test_preview.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('Browser test finished successfully!');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
