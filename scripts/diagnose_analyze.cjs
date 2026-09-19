const { chromium } = require('playwright');
const path = require('path');

async function run() {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  p.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  p.on('pageerror', err => console.log('PAGE ERROR:', err));
  await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  const img1 = path.join(__dirname, '..', 'demo_assets', 'optical_date1.png');
  const img2 = path.join(__dirname, '..', 'demo_assets', 'optical_date2.png');
  await p.locator('input[type="file"]').first().setInputFiles(img1);
  await p.waitForSelector('text=optical_date1.png');
  await p.locator('input[type="file"]').first().setInputFiles(img2);
  await p.waitForSelector('text=optical_date2.png');
  await p.locator('button:has-text("Continue")').click();
  await p.waitForSelector('text=Ask Your Question');

  await p.locator('textarea').fill('Detect floods and changed water regions');
  console.log('Clicking Analyze...');
  await p.locator('button:has-text("Analyze")').click();

  await p.waitForTimeout(4000);
  const errBanner = await p.locator('button:has-text("Dismiss")').locator('..').allTextContents();
  console.log('Error Banner in UI:', errBanner);
  console.log('Current Step headers:', await p.locator('h2').allTextContents());

  await b.close();
}

run().catch(console.error);
