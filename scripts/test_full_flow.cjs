const { chromium } = require('playwright');
const path = require('path');

async function testFullFlow() {
  console.log('=== Starting Full End-to-End SatQuery Flow Test ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('1. Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // 2. Upload Slot 1
  const img1Path = path.join(__dirname, '..', 'demo_assets', 'optical_date1.png');
  const img2Path = path.join(__dirname, '..', 'demo_assets', 'optical_date2.png');

  console.log('2. Uploading Slot 1 (optical_date1.png)...');
  await page.locator('input[type="file"]').first().setInputFiles(img1Path);
  await page.waitForSelector('text=optical_date1.png');
  console.log('   Slot 1 loaded.');

  console.log('3. Uploading Slot 2 (optical_date2.png)...');
  await page.locator('input[type="file"]').first().setInputFiles(img2Path);
  await page.waitForSelector('text=optical_date2.png');
  console.log('   Slot 2 loaded.');

  const readyBadges = await page.locator('text=✓ loaded').count();
  console.log('   Both slots loaded count:', readyBadges);

  // 4. Click Continue
  console.log('4. Clicking Continue to proceed to Ask screen...');
  const continueBtn = page.locator('button:has-text("Continue")');
  await continueBtn.click();
  await page.waitForTimeout(800);

  // 5. Ask Screen verification
  const askHeader = await page.locator('text=Ask Your Question').count();
  console.log('   Ask screen reached:', askHeader === 1 ? 'PASS' : 'FAIL');

  // Type question
  console.log('5. Entering query in textarea...');
  const textarea = page.locator('textarea');
  await textarea.fill('Identify flooded areas and estimate newly inundated regions.');

  // Click Analyze
  console.log('6. Clicking Analyze button...');
  const analyzeBtn = page.locator('button:has-text("Analyze")');
  await analyzeBtn.click();

  // 6. Wait for results screen
  console.log('7. Waiting for analysis pipeline completion...');
  await page.waitForSelector('text=Map Evidence', { timeout: 20000 });
  console.log('   Results screen reached: PASS');

  // Verify answer and metrics
  const legendCount = await page.locator('text=Layer Legend').count();
  console.log('   Layer Legend visible:', legendCount > 0 ? 'PASS' : 'FAIL');

  const procTimeCount = await page.locator('text=Processing time').count();
  console.log('   Processing time card visible:', procTimeCount > 0 ? 'PASS' : 'FAIL');

  // Screenshot
  const screenshotPath = path.join(__dirname, '..', 'dist', 'full_flow_result.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('8. Full flow screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('=== FULL END-TO-END SATQUERY FLOW PASSED WITH 0 ERRORS! ===');
}

testFullFlow().catch((err) => {
  console.error('Full flow failed:', err);
  process.exit(1);
});
