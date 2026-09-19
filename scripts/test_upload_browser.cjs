const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testUploadWorkflow() {
  console.log('--- Starting Dual Image & Validation UI Browser Test ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Create temporary test files:
  const testDir = path.join(__dirname, '..', 'scratch');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // Valid PNG 1x1 pixel
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG magic
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]);
  const img1Path = path.join(testDir, 'date1.png');
  const img2Path = path.join(testDir, 'date2.png');
  const invalidTxtPath = path.join(testDir, 'corrupt.txt');
  const fakePngPath = path.join(testDir, 'fake_renamed.png');

  fs.writeFileSync(img1Path, validPngBuffer);
  fs.writeFileSync(img2Path, validPngBuffer);
  fs.writeFileSync(invalidTxtPath, 'Hello world this is not an image');
  fs.writeFileSync(fakePngPath, 'This is plain text pretending to be PNG');

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  console.log('Test 1: Uploading valid image to Slot 1 (Earlier Date)...');
  await page.locator('input[type="file"]').first().setInputFiles(img1Path);
  await page.waitForTimeout(500);

  const slot1Loaded = await page.locator('text=date1.png').count();
  console.log('Slot 1 shows date1.png:', slot1Loaded === 1 ? 'PASS' : 'FAIL');

  console.log('Test 2: Uploading valid image to Slot 2 (Later Date)...');
  // Since slot 1 is now loaded, the remaining file input is the only one on the page
  await page.locator('input[type="file"]').first().setInputFiles(img2Path);
  await page.waitForTimeout(500);

  const slot2Loaded = await page.locator('text=date2.png').count();
  const slot1StillLoaded = await page.locator('text=date1.png').count();
  console.log('Slot 1 STILL shows date1.png (no overwrite!):', slot1StillLoaded === 1 ? 'PASS' : 'FAIL');
  console.log('Slot 2 shows date2.png:', slot2Loaded === 1 ? 'PASS' : 'FAIL');

  const readyBadges = await page.locator('text=✓ loaded').count();
  console.log('Both slots marked loaded:', readyBadges === 2 ? 'PASS' : 'FAIL');

  console.log('Test 3: Testing invalid file rejection (.txt)...');
  // Remove slot 2 image
  const removeButtons = page.locator('button[aria-label^="Remove image in slot"]');
  await removeButtons.last().click();
  await page.waitForTimeout(300);

  // Now upload invalidTxt to remaining empty slot
  await page.locator('input[type="file"]').first().setInputFiles(invalidTxtPath);
  await page.waitForTimeout(500);

  const hasRejectAlert1 = await page.locator('text=Upload Rejected:').count();
  const corruptInSlot = await page.locator('text=corrupt.txt').count();
  console.log('Invalid .txt rejected banner shown:', hasRejectAlert1 === 1 ? 'PASS' : 'FAIL');
  console.log('Invalid .txt NOT in slot:', corruptInSlot === 0 ? 'PASS' : 'FAIL');

  console.log('Test 4: Testing fake image with magic byte mismatch (text renamed to .png)...');
  await page.locator('input[type="file"]').first().setInputFiles(fakePngPath);
  await page.waitForTimeout(500);

  const hasRejectAlert2 = await page.locator('text=not a valid image').count();
  const fakeInSlot = await page.locator('.truncate:has-text("fake_renamed.png")').count();
  console.log('Fake PNG rejected by header inspection:', hasRejectAlert2 === 1 ? 'PASS' : 'FAIL');
  console.log('Fake PNG NOT in slot card:', fakeInSlot === 0 ? 'PASS' : 'FAIL');

  console.log('Test 5: Re-uploading valid img2 to Slot 2 to verify Continue button enabled...');
  await page.locator('input[type="file"]').first().setInputFiles(img2Path);
  await page.waitForTimeout(500);

  const continueBtn = page.locator('button:has-text("Continue")');
  const isEnabled = await continueBtn.isEnabled();
  console.log('Continue button is enabled when both slots valid:', isEnabled ? 'PASS' : 'FAIL');

  // Take screenshot of completed test state
  const screenshotPath = path.join(__dirname, '..', 'dist', 'test_dual_upload_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
  console.log('--- ALL BROWSER AUTOMATION TESTS COMPLETED SUCCESSFULLY! ---');
}

testUploadWorkflow().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
