const { chromium } = require('playwright');
const path = require('path');

async function testFullPipeline() {
  console.log('=== Starting Verified End-to-End Pipeline Test ===');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  const img1 = path.join(__dirname, '..', 'demo_assets', 'optical_date1.png');
  const img2 = path.join(__dirname, '..', 'demo_assets', 'optical_date2.png');

  console.log('1. Uploading Slot 1 (optical_date1.png)...');
  await page.locator('input[type="file"]').first().setInputFiles(img1);
  await page.waitForSelector('text=optical_date1.png');

  console.log('2. Uploading Slot 2 (optical_date2.png)...');
  await page.locator('input[type="file"]').first().setInputFiles(img2);
  await page.waitForSelector('text=optical_date2.png');

  console.log('3. Clicking Continue...');
  await page.locator('button:has-text("Continue")').click();
  await page.waitForSelector('text=Ask Your Question');

  console.log('4. Entering question and clicking Analyze...');
  await page.locator('textarea').fill('Identify flooded areas and estimate newly inundated regions.');
  await page.locator('button:has-text("Analyze")').click();

  console.log('5. Monitoring progress stages (waiting up to 30s)...');
  const startTime = Date.now();
  while (Date.now() - startTime < 30000) {
    const isResults = await page.locator('text=Map Evidence').count();
    if (isResults > 0) {
      console.log('   >>> SUCCESS: Map Evidence arrived on Results Screen! <<<');
      break;
    }
    const currentStep = await page.locator('h2').allTextContents();
    const errorText = await page.locator('.text-red-800').allTextContents();
    if (errorText.length > 0) {
      console.error('   API Error occurred:', errorText);
      break;
    }
    console.log(`   Elapsed ${Math.round((Date.now() - startTime)/1000)}s - Current UI header:`, currentStep);
    await page.waitForTimeout(2000);
  }

  // Verify results screen
  const mapEvidence = await page.locator('text=Map Evidence').count();
  console.log('Map Evidence header count:', mapEvidence);

  const legend = await page.locator('text=Layer Legend').count();
  console.log('Layer Legend visible:', legend > 0 ? 'PASS' : 'FAIL');

  const screenshotPath = path.join(__dirname, '..', 'dist', 'live_results_screen.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('=== END-TO-END PIPELINE RUN COMPLETE ===');
}

testFullPipeline().catch(console.error);
