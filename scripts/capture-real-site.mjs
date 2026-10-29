import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureRealScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  // Create mobile context with iPhone 14 Pro specifications
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const page = await context.newPage();
  const outputDir = path.join(__dirname, '../public/real-screens');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Navigating to home page...');
  await page.goto('http://localhost:3333/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Capture Real Home Screen
  const homeScreenshotPath = path.join(outputDir, 'real-home.png');
  await page.screenshot({ path: homeScreenshotPath });
  console.log('Captured real-home.png');

  // Fill in preset and create a khatma
  const ramadanPreset = page.getByRole('button', { name: 'ختمة رمضانية' });
  if (await ramadanPreset.isVisible()) {
    await ramadanPreset.click();
    await page.waitForTimeout(500);
  }

  const submitBtn = page.getByRole('button', { name: /إنشاء الختمة/i });
  if (await submitBtn.isVisible()) {
    await submitBtn.click();
    await page.waitForURL(/\/khatma\/.+/, { timeout: 10000 });
    await page.waitForTimeout(2000);
    console.log('Navigated to Khatma page:', page.url());
  }

  // On Khatma page, reserve Juz 1 and mark completed
  const juz1Card = page.locator('text=الجزء الأول').first();
  if (await juz1Card.isVisible()) {
    await juz1Card.click();
    await page.waitForTimeout(600);
    
    // Fill name in reservation sheet if present
    const nameInput = page.locator('input[placeholder*="اسم"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('أبو محمد');
      const confirmReserve = page.getByRole('button', { name: /تأكيد الحجز/i });
      if (await confirmReserve.isVisible()) {
        await confirmReserve.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  // Reserve Juz 2
  const juz2Card = page.locator('text=الجزء الثاني').first();
  if (await juz2Card.isVisible()) {
    await juz2Card.click();
    await page.waitForTimeout(600);
    const nameInput = page.locator('input[placeholder*="اسم"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill('سارة');
      const confirmReserve = page.getByRole('button', { name: /تأكيد الحجز/i });
      if (await confirmReserve.isVisible()) {
        await confirmReserve.click();
        await page.waitForTimeout(1000);
      }
    }
  }

  // Capture Real Khatma Grid with active cards & progress
  const khatmaScreenshotPath = path.join(outputDir, 'real-khatma-grid.png');
  await page.screenshot({ path: khatmaScreenshotPath });
  console.log('Captured real-khatma-grid.png');

  // Open Quran Reader for Juz 1
  if (await juz1Card.isVisible()) {
    await juz1Card.click();
    await page.waitForTimeout(1200);
    const readerScreenshotPath = path.join(outputDir, 'real-reader.png');
    await page.screenshot({ path: readerScreenshotPath });
    console.log('Captured real-reader.png');
  }

  await browser.close();
  console.log('All real site screenshots captured successfully!');
}

captureRealScreenshots().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
