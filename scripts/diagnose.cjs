const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  const img1 = path.join(__dirname, '..', 'demo_assets', 'optical_date1.png');
  const img2 = path.join(__dirname, '..', 'demo_assets', 'optical_date2.png');

  console.log('Uploading img1...');
  await p.locator('input[type="file"]').first().setInputFiles(img1);
  await p.waitForSelector('text=optical_date1.png');
  console.log('Slot 1 is loaded with optical_date1.png');

  console.log('Uploading img2...');
  const secondInput = p.locator('input[type="file"]').first();
  await secondInput.setInputFiles(img2);
  
  await p.waitForTimeout(1000);

  const errorText = await p.locator('.text-red-800').allTextContents();
  console.log('Error banner text (if any):', errorText);

  const slot1 = await p.locator('text=optical_date1.png').count();
  const slot2 = await p.locator('text=optical_date2.png').count();
  console.log('Slot 1 count:', slot1);
  console.log('Slot 2 count:', slot2);

  const continueBtn = p.locator('button:has-text("Continue")');
  console.log('Continue button isEnabled:', await continueBtn.isEnabled());

  await b.close();
}

test().catch(console.error);
