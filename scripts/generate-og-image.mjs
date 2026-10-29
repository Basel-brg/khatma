import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateOGImage() {
  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2, // 2x for ultra high-res crisp rendering (2400x1260)
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1200px;
      height: 630px;
      background-color: #FBF8F3;
      font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #0F2922;
      overflow: hidden;
      position: relative;
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      padding: 48px 56px;
    }

    /* Islamic Manuscript Framing Borders */
    .border-frame {
      position: absolute;
      inset: 16px;
      border: 1.5px solid #E6DEC8;
      pointer-events: none;
      z-index: 10;
    }
    .border-frame-inner {
      position: absolute;
      inset: 22px;
      border: 1px solid rgba(180, 131, 39, 0.35);
      pointer-events: none;
      z-index: 10;
    }
    .corner-ornament {
      position: absolute;
      width: 28px;
      height: 28px;
      z-index: 11;
    }
    .corner-tl { top: 18px; right: 18px; transform: scaleX(-1); }
    .corner-tr { top: 18px; left: 18px; }
    .corner-bl { bottom: 18px; right: 18px; transform: scale(-1, 1); }
    .corner-br { bottom: 18px; left: 18px; transform: scaleY(-1); }

    /* Background Watermark Pattern */
    .bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.035;
      background-image: radial-gradient(#0F2922 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    /* Left & Right Layout */
    .content-side {
      flex: 1;
      max-width: 580px;
      z-index: 2;
      display: flex;
      flex-direction: column;
      gap: 20px;
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
      font-size: 13px;
      font-weight: 600;
      width: fit-content;
      box-shadow: 0 1px 2px rgba(180, 131, 39, 0.08);
    }

    .main-title {
      font-family: 'Amiri', serif;
      font-size: 46px;
      font-weight: 700;
      color: #0F2922;
      line-height: 1.25;
      letter-spacing: -0.5px;
    }

    .main-desc {
      font-size: 17px;
      line-height: 1.6;
      color: #4A5D54;
      margin-top: -6px;
    }

    /* Steps Grid */
    .steps-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 4px;
    }

    .step-card {
      display: flex;
      align-items: center;
      gap: 14px;
      background: #FFFFFF;
      border: 1px solid #E6DEC8;
      border-radius: 14px;
      padding: 12px 16px;
      box-shadow: 0 4px 12px -2px rgba(15, 41, 34, 0.04);
    }

    .step-number {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #0F2922;
      color: #FDF6E7;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Amiri', serif;
      font-size: 18px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-card:nth-child(2) .step-number {
      background: #B48327;
      color: #FFFFFF;
    }

    .step-card:nth-child(3) .step-number {
      background: #15803D;
      color: #FFFFFF;
    }

    .step-text h4 {
      font-size: 15px;
      font-weight: 600;
      color: #0F2922;
      margin-bottom: 2px;
    }

    .step-text p {
      font-size: 12.5px;
      color: #7D9087;
      line-height: 1.4;
    }

    /* Features Pills */
    .pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;
    }

    .pill-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #F4EFE6;
      border: 1px solid #E6DEC8;
      color: #0F2922;
      font-size: 12px;
      font-weight: 500;
      padding: 5px 12px;
      border-radius: 8px;
    }

    /* Phone Mockup Side */
    .mockup-side {
      flex: 1;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
      z-index: 2;
      height: 100%;
    }

    /* Realistic Phone Mockup */
    .phone-container {
      width: 310px;
      height: 520px;
      background: #0F2922;
      border-radius: 46px;
      padding: 10px;
      box-shadow: 
        0 25px 60px -15px rgba(15, 41, 34, 0.35),
        0 10px 25px -5px rgba(15, 41, 34, 0.15),
        inset 0 0 0 2px rgba(255, 255, 255, 0.15);
      position: relative;
      transform: rotate(-2deg);
      border: 3px solid #D1C7B7;
    }

    .phone-screen {
      width: 100%;
      height: 100%;
      background: #FBF8F3;
      border-radius: 38px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    /* Dynamic Island */
    .island {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 90px;
      height: 22px;
      background: #000000;
      border-radius: 12px;
      z-index: 20;
    }

    /* App Screen Header */
    .app-header {
      padding: 38px 16px 12px;
      background: #FBF8F3;
      border-bottom: 1px solid #E6DEC8;
      text-align: center;
    }

    .khatma-title {
      font-family: 'Amiri', serif;
      font-size: 20px;
      font-weight: 700;
      color: #0F2922;
    }

    .khatma-niyyah {
      font-size: 11px;
      color: #7D9087;
      margin-top: 2px;
    }

    /* Progress Widget */
    .progress-box {
      margin: 10px 14px;
      background: #FFFFFF;
      border: 1px solid #E6DEC8;
      border-radius: 12px;
      padding: 10px 12px;
    }

    .progress-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .progress-label {
      font-size: 11.5px;
      font-weight: 600;
      color: #0F2922;
    }

    .progress-stat {
      font-size: 11px;
      color: #B48327;
      font-weight: 700;
    }

    .progress-bar-bg {
      height: 6px;
      background: #F4EFE6;
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-bar-fill {
      width: 60%;
      height: 100%;
      background: linear-gradient(90deg, #B48327, #15803D);
      border-radius: 999px;
    }

    /* Mini Juz Grid */
    .mini-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding: 4px 14px 14px;
      overflow: hidden;
    }

    .mini-card {
      background: #FFFFFF;
      border: 1px solid #E6DEC8;
      border-radius: 10px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .mini-card.completed {
      background: #ECFDF5;
      border-color: #A7F3D0;
    }

    .mini-card.reserved {
      background: #FFFBEB;
      border-color: #FDE68A;
    }

    .card-juz-title {
      font-size: 11px;
      font-weight: 600;
      color: #0F2922;
    }

    .card-juz-surah {
      font-size: 9.5px;
      color: #7D9087;
    }

    .card-badge {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      width: fit-content;
      margin-top: 2px;
    }

    .badge-comp {
      background: #DCFCE7;
      color: #15803D;
    }

    .badge-res {
      background: #FEF3C7;
      color: #B45309;
    }

    .badge-avail {
      background: #F4EFE6;
      color: #0F2922;
    }

    /* Floating Reader Card */
    .floating-card {
      position: absolute;
      bottom: 25px;
      left: -35px;
      width: 250px;
      background: #FFFFFF;
      border: 1.5px solid #E8D39E;
      border-radius: 18px;
      padding: 14px 16px;
      box-shadow: 
        0 20px 40px -10px rgba(15, 41, 34, 0.25),
        0 4px 10px rgba(0, 0, 0, 0.05);
      z-index: 30;
      transform: rotate(4deg);
    }

    .floating-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .floating-badge {
      font-size: 10px;
      font-weight: 600;
      color: #B48327;
      background: #FDF6E7;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #E8D39E;
    }

    .quran-ayah {
      font-family: 'Amiri', serif;
      font-size: 15px;
      line-height: 1.7;
      color: #0F2922;
      text-align: center;
      margin: 6px 0 10px;
    }

    .complete-btn {
      width: 100%;
      background: #15803D;
      color: #FFFFFF;
      border: none;
      padding: 7px 0;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      box-shadow: 0 2px 6px rgba(21, 128, 61, 0.25);
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="border-frame"></div>
  <div class="border-frame-inner"></div>

  <!-- Decorative Corner SVGs -->
  <svg class="corner-ornament corner-tr" viewBox="0 0 24 24" fill="none" stroke="#B48327" stroke-width="1.5">
    <path d="M4 4h8a8 8 0 0 1 8 8v8M4 4v8a8 8 0 0 0 8 8h8" opacity="0.6"/>
    <circle cx="4" cy="4" r="2" fill="#B48327"/>
  </svg>
  <svg class="corner-ornament corner-tl" viewBox="0 0 24 24" fill="none" stroke="#B48327" stroke-width="1.5">
    <path d="M4 4h8a8 8 0 0 1 8 8v8M4 4v8a8 8 0 0 0 8 8h8" opacity="0.6"/>
    <circle cx="4" cy="4" r="2" fill="#B48327"/>
  </svg>
  <svg class="corner-ornament corner-br" viewBox="0 0 24 24" fill="none" stroke="#B48327" stroke-width="1.5">
    <path d="M4 4h8a8 8 0 0 1 8 8v8M4 4v8a8 8 0 0 0 8 8h8" opacity="0.6"/>
    <circle cx="4" cy="4" r="2" fill="#B48327"/>
  </svg>
  <svg class="corner-ornament corner-bl" viewBox="0 0 24 24" fill="none" stroke="#B48327" stroke-width="1.5">
    <path d="M4 4h8a8 8 0 0 1 8 8v8M4 4v8a8 8 0 0 0 8 8h8" opacity="0.6"/>
    <circle cx="4" cy="4" r="2" fill="#B48327"/>
  </svg>

  <!-- Left / Text Side -->
  <div class="content-side">
    <div class="badge-top">
      <span>✦</span>
      <span>منصة الختمات القرآنية الجماعية</span>
    </div>

    <h1 class="main-title">ختمة القرآن الكريم</h1>
    <p class="main-desc">شارك الأجر مع أهلك وأصحابك، ونسق قراءة أجزاء القرآن الثلاثين برابط واحد سهل ومباشر بدون تعقيد.</p>

    <!-- 3 Steps -->
    <div class="steps-container">
      <div class="step-card">
        <div class="step-number">١</div>
        <div class="step-text">
          <h4>أنشئ الختمة وشارك الرابط</h4>
          <p>حدد نية الختمة وتاريخ إتمامها وشارك الرابط عبر واتساب وتليجرام بلمسة واحدة.</p>
        </div>
      </div>

      <div class="step-card">
        <div class="step-number">٢</div>
        <div class="step-text">
          <h4>اختر جزأك واقرأ مباشرة</h4>
          <p>احجز جزأك من بطاقات الأجزاء الـ 30 مع خيار الحفظ بسرية (فاعل خير).</p>
        </div>
      </div>

      <div class="step-card">
        <div class="step-number">٣</div>
        <div class="step-text">
          <h4>تابع الإنجاز لحظة بلحظة</h4>
          <p>مصحف متكامل بالرسم العثماني، تلاوات صوتية خاشعة، وتحديث مباشر لتقدم الجميع.</p>
        </div>
      </div>
    </div>

    <!-- Feature Pills -->
    <div class="pills-row">
      <div class="pill-item">⚡️ بدون تسجيل دخول</div>
      <div class="pill-item">📖 مصحف بالرسم العثماني</div>
      <div class="pill-item">🎧 استماع لأشهر القراء</div>
      <div class="pill-item">📱 تجربة جوال سلسة</div>
    </div>
  </div>

  <!-- Right / Visual Mockup Side -->
  <div class="mockup-side">
    <!-- Phone Mockup -->
    <div class="phone-container">
      <div class="phone-screen">
        <div class="island"></div>

        <div class="app-header">
          <div class="khatma-title">ختمة الجمعة المباركة</div>
          <div class="khatma-niyyah">بنية الشفاء وتفريج الكرب</div>
        </div>

        <div class="progress-box">
          <div class="progress-top">
            <span class="progress-label">تقدم الختمة الإجمالي</span>
            <span class="progress-stat">١٨ من ٣٠ جزء (٦٠٪)</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill"></div>
          </div>
        </div>

        <div class="mini-grid">
          <div class="mini-card completed">
            <span class="card-juz-title">الجزء الأول</span>
            <span class="card-juz-surah">سورة الفاتحة</span>
            <span class="card-badge badge-comp">✓ تم الإنجاز</span>
          </div>

          <div class="mini-card reserved">
            <span class="card-juz-title">الجزء الثاني</span>
            <span class="card-juz-surah">سورة البقرة</span>
            <span class="card-badge badge-res">⏳ جاري القراءة</span>
          </div>

          <div class="mini-card">
            <span class="card-juz-title">الجزء الثالث</span>
            <span class="card-juz-surah">سورة آل عمران</span>
            <span class="card-badge badge-avail">✦ متاح للحجز</span>
          </div>

          <div class="mini-card completed">
            <span class="card-juz-title">الجزء الرابع</span>
            <span class="card-juz-surah">سورة النساء</span>
            <span class="card-badge badge-comp">✓ تم الإنجاز</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Quran Reader Card -->
    <div class="floating-card">
      <div class="floating-top">
        <span class="floating-badge">📖 القارئ المدمج</span>
        <span style="font-size: 11px; color: #7D9087;">الجزء ٣</span>
      </div>
      <div class="quran-ayah">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ<br>
        ﴿الم ۝ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ﴾
      </div>
      <div class="complete-btn">
        ✓ أتممت القراءة
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Ensure fonts are loaded
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  const outputPath = path.join(__dirname, '../public/og-image.png');
  await page.screenshot({
    path: outputPath,
    type: 'png',
  });

  console.log(`Open Graph image created successfully at: ${outputPath}`);
  await browser.close();
}

generateOGImage().catch((err) => {
  console.error('Error generating image:', err);
  process.exit(1);
});
