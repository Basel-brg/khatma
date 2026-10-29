import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateRealOGImage() {
  const browser = await chromium.launch({ headless: true });

  const gridImgPath = path.join(__dirname, '../public/real-screens/khatma-mobile-grid.png');
  const readerImgPath = path.join(__dirname, '../public/real-screens/khatma-mobile-reader.png');

  const gridBase64 = fs.readFileSync(gridImgPath).toString('base64');
  const readerBase64 = fs.readFileSync(readerImgPath).toString('base64');

  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1200px;
      height: 630px;
      background: #FBF8F3;
      font-family: 'IBM Plex Sans Arabic', -apple-system, sans-serif;
      color: #0F2922;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 40px 52px;
    }

    /* Traditional Frame */
    .border-frame {
      position: absolute;
      inset: 14px;
      border: 1.5px solid #E6DEC8;
      pointer-events: none;
      z-index: 20;
    }
    .border-frame-inner {
      position: absolute;
      inset: 20px;
      border: 1px solid rgba(180, 131, 39, 0.3);
      pointer-events: none;
      z-index: 20;
    }
    .bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.04;
      background-image: radial-gradient(#0F2922 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    /* Content Side */
    .content-side {
      flex: 1;
      max-width: 520px;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .badge-top {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #FDF6E7;
      border: 1px solid #E8D39E;
      color: #B48327;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13.5px;
      font-weight: 600;
      width: fit-content;
    }

    .title {
      font-family: 'Amiri', serif;
      font-size: 44px;
      font-weight: 700;
      color: #0F2922;
      line-height: 1.25;
    }

    .desc {
      font-size: 16.5px;
      line-height: 1.6;
      color: #4A5D54;
      margin-top: -6px;
    }

    /* 3 Real Workflow Steps */
    .steps-container {
      display: flex;
      flex-direction: column;
      gap: 11px;
      margin-top: 2px;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 13px;
      background: #FFFFFF;
      border: 1px solid #E6DEC8;
      border-radius: 12px;
      padding: 10px 14px;
      box-shadow: 0 2px 8px rgba(15, 41, 34, 0.04);
    }

    .step-num {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #0F2922;
      color: #FDF6E7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Amiri', serif;
      font-size: 16px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-item:nth-child(2) .step-num {
      background: #B48327;
      color: #FFFFFF;
    }

    .step-item:nth-child(3) .step-num {
      background: #15803D;
      color: #FFFFFF;
    }

    .step-info h4 {
      font-size: 14.5px;
      font-weight: 600;
      color: #0F2922;
      margin-bottom: 2px;
    }

    .step-info p {
      font-size: 12.5px;
      color: #7D9087;
      line-height: 1.35;
    }

    .features-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .feature-tag {
      background: #F4EFE6;
      border: 1px solid #E6DEC8;
      color: #0F2922;
      font-size: 12px;
      font-weight: 500;
      padding: 5px 11px;
      border-radius: 8px;
    }

    /* Screenshots Side */
    .visual-side {
      flex: 1.1;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      height: 100%;
      z-index: 10;
    }

    /* Device 1: Real Reader View */
    .device-reader {
      position: absolute;
      right: 20px;
      top: 45px;
      width: 260px;
      height: 490px;
      background: #1A2E26;
      border-radius: 38px;
      padding: 8px;
      box-shadow: 
        0 20px 45px -10px rgba(15, 41, 34, 0.3),
        0 6px 15px rgba(0, 0, 0, 0.08);
      border: 3px solid #D6CCBC;
      transform: rotate(5deg) scale(0.92);
      z-index: 1;
      overflow: hidden;
    }

    .device-reader .screen {
      width: 100%;
      height: 100%;
      border-radius: 30px;
      overflow: hidden;
      background: #FBF8F3;
    }

    .device-reader img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }

    /* Device 2: Real Grid View (Foreground) */
    .device-grid {
      position: absolute;
      right: 170px;
      top: 25px;
      width: 275px;
      height: 520px;
      background: #0F2922;
      border-radius: 42px;
      padding: 9px;
      box-shadow: 
        0 28px 65px -12px rgba(15, 41, 34, 0.45),
        0 10px 25px -4px rgba(15, 41, 34, 0.2);
      border: 3.5px solid #E8D39E;
      transform: rotate(-3deg);
      z-index: 5;
      overflow: hidden;
    }

    .device-grid .screen {
      width: 100%;
      height: 100%;
      border-radius: 33px;
      overflow: hidden;
      background: #FBF8F3;
      position: relative;
    }

    .device-grid img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      display: block;
    }

    /* Floating Real Badge */
    .verified-badge {
      position: absolute;
      bottom: 28px;
      right: 135px;
      background: #FFFFFF;
      border: 1.5px solid #15803D;
      border-radius: 12px;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 10px 25px rgba(21, 128, 61, 0.2);
      z-index: 10;
      transform: rotate(2deg);
    }

    .verified-icon {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #15803D;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: bold;
    }

    .verified-text {
      font-size: 12px;
      font-weight: 600;
      color: #0F2922;
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="border-frame"></div>
  <div class="border-frame-inner"></div>

  <!-- Content Side -->
  <div class="content-side">
    <div class="badge-top">
      <span>✦</span>
      <span>الرَّبْعَةُ القرآنية التشاركية</span>
    </div>

    <h1 class="title">ختمة القرآن الكريم</h1>
    <p class="desc">شارك الأجر ونظّم قراءة أجزاء القرآن الـ 30 مع أهلك وأصحابك برابط واحد مباشر وبدون أي تسجيل.</p>

    <!-- 3 Steps -->
    <div class="steps-container">
      <div class="step-item">
        <div class="step-num">١</div>
        <div class="step-info">
          <h4>أنشئ الختمة وشارك الرابط</h4>
          <p>حدد النية وتاريخ الختم وشارك الرابط في مجموعات واتساب وتليجرام.</p>
        </div>
      </div>

      <div class="step-item">
        <div class="step-num">٢</div>
        <div class="step-info">
          <h4>اختر جزأك واقرأ مباشرة</h4>
          <p>احجز جزأك من بطاقات الأجزاء مع إمكانية إخفاء الاسم «فاعل خير».</p>
        </div>
      </div>

      <div class="step-item">
        <div class="step-num">٣</div>
        <div class="step-info">
          <h4>تابع إنجاز الختمة لحظياً</h4>
          <p>مصحف مدمج بالرسم العثماني، استماع لأشهر القراء، وتحديث فوري.</p>
        </div>
      </div>
    </div>

    <div class="features-row">
      <div class="feature-tag">⚡️ بدون تسجيل دخول</div>
      <div class="feature-tag">📖 مصحف بالرسم العثماني</div>
      <div class="feature-tag">🎧 تلاوة صوتية خاشعة</div>
      <div class="feature-tag">📱 تصميم جوال فائق السلاسة</div>
    </div>
  </div>

  <!-- Visual Mockups using the REAL website screenshots -->
  <div class="visual-side">
    <!-- Real In-App Quran Reader Screenshot -->
    <div class="device-reader">
      <div class="screen">
        <img src="data:image/png;base64,${readerBase64}" alt="Real Quran Reader Screenshot" />
      </div>
    </div>

    <!-- Real 30-Juz Matrix Screenshot -->
    <div class="device-grid">
      <div class="screen">
        <img src="data:image/png;base64,${gridBase64}" alt="Real Khatma 30-Juz Screenshot" />
      </div>
    </div>

    <!-- Verified Completed Stamp Badge -->
    <div class="verified-badge">
      <div class="verified-icon">✓</div>
      <span class="verified-text">مجاني بالكامل</span>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const outputPath = path.join(__dirname, '../public/og-image.png');
  await page.screenshot({
    path: outputPath,
    type: 'png',
  });
  console.log('Saved real OG image to:', outputPath);

  // Also save a direct, full desktop real screenshot preview as well:
  const directRealScreenshot = path.join(__dirname, '../public/og-real-desktop.png');
  fs.copyFileSync(path.join(__dirname, '../public/real-screens/khatma-desktop-view.png'), directRealScreenshot);
  console.log('Copied real desktop view to:', directRealScreenshot);

  await browser.close();
}

generateRealOGImage().catch(console.error);
