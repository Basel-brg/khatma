import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function captureDemoScreenshots() {
  const browser = await chromium.launch({ headless: true });
  
  const outputDir = path.join(__dirname, '../public/real-screens');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Mobile Khatma Grid
  const mobileContext = await browser.newContext({
    viewport: { width: 420, height: 860 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  
  console.log('Navigating to demo-ramadan on mobile...');
  await mobilePage.goto('http://localhost:3333/khatma/demo-ramadan', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  
  // Hide Next.js dev portal if any
  await mobilePage.addStyleTag({
    content: 'nextjs-portal { display: none !important; }'
  });

  await mobilePage.screenshot({
    path: path.join(outputDir, 'khatma-mobile-grid.png'),
    clip: { x: 0, y: 0, width: 420, height: 860 },
  });
  console.log('Saved khatma-mobile-grid.png');

  // Open the reader modal by clicking the first completed Juz card
  const juz1 = mobilePage.getByTestId('juz-card-1');
  if (await juz1.isVisible()) {
    await juz1.click();
    await mobilePage.waitForTimeout(1200);
    await mobilePage.screenshot({
      path: path.join(outputDir, 'khatma-mobile-reader.png'),
      clip: { x: 0, y: 0, width: 420, height: 860 },
    });
    console.log('Saved khatma-mobile-reader.png');
  }

  // 2. Desktop Khatma View
  const desktopContext = await browser.newContext({
    viewport: { width: 1200, height: 750 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://localhost:3333/khatma/demo-ramadan', { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(1000);
  await desktopPage.addStyleTag({
    content: 'nextjs-portal { display: none !important; }'
  });
  await desktopPage.screenshot({
    path: path.join(outputDir, 'khatma-desktop-view.png'),
    clip: { x: 0, y: 0, width: 1200, height: 750 },
  });
  console.log('Saved khatma-desktop-view.png');

  // 3. Home page mobile
  await mobilePage.goto('http://localhost:3333/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(800);
  await mobilePage.screenshot({
    path: path.join(outputDir, 'khatma-home-mobile.png'),
    clip: { x: 0, y: 0, width: 420, height: 860 },
  });
  console.log('Saved khatma-home-mobile.png');

  await browser.close();
  console.log('Done capturing real screenshots!');
}

captureDemoScreenshots().catch(console.error);
