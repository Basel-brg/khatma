import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function recordPromoVideo() {
  const videoTempDir = path.join(__dirname, '../public/promo-temp');
  if (!fs.existsSync(videoTempDir)) {
    fs.mkdirSync(videoTempDir, { recursive: true });
  }

  const gridImgBase64 = fs.readFileSync(path.join(__dirname, '../public/real-screens/khatma-mobile-grid.png')).toString('base64');
  const readerImgBase64 = fs.readFileSync(path.join(__dirname, '../public/real-screens/khatma-mobile-reader.png')).toString('base64');
  const homeImgBase64 = fs.readFileSync(path.join(__dirname, '../public/real-screens/khatma-home-mobile.png')).toString('base64');

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-web-security', '--allow-file-access-from-files']
  });

  const context = await browser.newContext({
    recordVideo: {
      dir: videoTempDir,
      size: { width: 1080, height: 1920 },
    },
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1080px;
      height: 1920px;
      background: #FBF8F3;
      font-family: 'IBM Plex Sans Arabic', sans-serif;
      color: #0F2922;
      position: relative;
      overflow: hidden;
    }

    /* Container for all scenes */
    .scene {
      position: absolute;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1), transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 120px 80px 140px;
      transform: scale(0.96);
    }

    .scene.active {
      opacity: 1;
      pointer-events: auto;
      transform: scale(1);
    }

    /* Traditional Decorative Frame */
    .border-frame {
      position: absolute;
      inset: 32px;
      border: 3px solid #E6DEC8;
      pointer-events: none;
      z-index: 100;
    }
    .border-frame-inner {
      position: absolute;
      inset: 44px;
      border: 1.5px solid rgba(180, 131, 39, 0.4);
      pointer-events: none;
      z-index: 100;
    }
    .bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.04;
      background-image: radial-gradient(#0F2922 2px, transparent 2px);
      background-size: 32px 32px;
      pointer-events: none;
    }

    /* SCENE 1: Intro Dark Emerald */
    #scene-1 {
      background: radial-gradient(circle at center, #16382E 0%, #071712 100%);
      color: #FBF8F3;
      justify-content: center;
      gap: 40px;
    }

    .shamsa-rosette {
      width: 180px;
      height: 180px;
      animation: rotateSlow 20s linear infinite;
    }

    @keyframes rotateSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .intro-badge {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: rgba(180, 131, 39, 0.2);
      border: 1.5px solid #B48327;
      color: #FDF6E7;
      padding: 12px 28px;
      border-radius: 999px;
      font-size: 24px;
      font-weight: 600;
    }

    .intro-title {
      font-family: 'Amiri', serif;
      font-size: 88px;
      font-weight: 700;
      color: #FFFFFF;
      text-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
      text-align: center;
      line-height: 1.2;
    }

    .intro-sub {
      font-size: 34px;
      color: #E8D39E;
      text-align: center;
      line-height: 1.5;
      max-width: 800px;
    }

    .intro-pills {
      display: flex;
      gap: 16px;
      margin-top: 20px;
    }

    .intro-pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(232, 211, 158, 0.3);
      padding: 10px 24px;
      border-radius: 12px;
      font-size: 22px;
      color: #F4EFE6;
    }

    /* GENERAL SCENE STYLING */
    .scene-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 16px;
      z-index: 10;
    }

    .step-pill {
      background: #FDF6E7;
      border: 2px solid #E8D39E;
      color: #B48327;
      padding: 10px 26px;
      border-radius: 999px;
      font-size: 24px;
      font-weight: 700;
    }

    .scene-title {
      font-family: 'Amiri', serif;
      font-size: 58px;
      font-weight: 700;
      color: #0F2922;
      line-height: 1.2;
    }

    .scene-desc {
      font-size: 26px;
      color: #4A5D54;
      max-width: 800px;
      line-height: 1.5;
    }

    /* REAL PHONE MOCKUP */
    .phone-mockup {
      width: 580px;
      height: 1100px;
      background: #0F2922;
      border-radius: 70px;
      padding: 16px;
      box-shadow: 
        0 40px 90px -20px rgba(15, 41, 34, 0.45),
        0 15px 35px rgba(0, 0, 0, 0.15);
      border: 5px solid #D1C7B7;
      position: relative;
      overflow: hidden;
      z-index: 10;
    }

    .phone-screen {
      width: 100%;
      height: 100%;
      border-radius: 56px;
      overflow: hidden;
      background: #FBF8F3;
      position: relative;
    }

    .phone-screen img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }

    /* FLOATING CALLOUTS */
    .floating-callout {
      position: absolute;
      background: #FFFFFF;
      border: 2px solid #E6DEC8;
      border-radius: 20px;
      padding: 18px 28px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 20px 40px rgba(15, 41, 34, 0.15);
      z-index: 20;
      animation: floatBadge 3s ease-in-out infinite;
    }

    @keyframes floatBadge {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }

    .callout-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      background: #15803D;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
    }

    .callout-text h5 {
      font-size: 22px;
      font-weight: 700;
      color: #0F2922;
    }

    .callout-text p {
      font-size: 18px;
      color: #7D9087;
    }

    /* SCENE 5: Outro */
    #scene-5 {
      background: radial-gradient(circle at center, #16382E 0%, #071712 100%);
      color: #FFFFFF;
      justify-content: center;
      gap: 40px;
      text-align: center;
    }

    .seal-large {
      width: 160px;
      height: 160px;
      background: #15803D;
      border: 4px solid #E8D39E;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Amiri', serif;
      font-size: 50px;
      font-weight: 700;
      color: #FFFFFF;
      box-shadow: 0 0 60px rgba(21, 128, 61, 0.5);
      animation: pulseGlow 2s ease-in-out infinite;
    }

    @keyframes pulseGlow {
      0%, 100% { transform: scale(1); box-shadow: 0 0 50px rgba(21, 128, 61, 0.5); }
      50% { transform: scale(1.05); box-shadow: 0 0 80px rgba(21, 128, 61, 0.8); }
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      width: 100%;
      max-width: 760px;
      margin: 10px 0;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1.5px solid rgba(232, 211, 158, 0.3);
      border-radius: 20px;
      padding: 24px;
      text-align: center;
    }

    .feature-card h4 {
      font-size: 26px;
      color: #FDF6E7;
      margin-bottom: 6px;
    }

    .feature-card p {
      font-size: 20px;
      color: #A7F3D0;
    }

    .cta-btn {
      background: #B48327;
      color: #FFFFFF;
      font-size: 32px;
      font-weight: 700;
      padding: 22px 64px;
      border-radius: 999px;
      box-shadow: 0 15px 40px rgba(180, 131, 39, 0.4);
      margin-top: 15px;
      display: inline-flex;
      align-items: center;
      gap: 16px;
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="border-frame"></div>
  <div class="border-frame-inner"></div>

  <!-- SCENE 1: Hook (0s - 6.5s) -->
  <div class="scene active" id="scene-1">
    <div class="intro-badge">
      <span>✦</span>
      <span>الرَّبْعَةُ القرآنية التشاركية</span>
    </div>

    <!-- Shamsa Rosette 8-pointed star -->
    <svg class="shamsa-rosette" viewBox="0 0 100 100" fill="none">
      <rect x="20" y="20" width="60" height="60" stroke="#B48327" stroke-width="2.5" fill="none" rx="6"/>
      <rect x="20" y="20" width="60" height="60" stroke="#B48327" stroke-width="2.5" fill="none" rx="6" transform="rotate(45 50 50)"/>
      <circle cx="50" cy="50" r="18" fill="#B48327" opacity="0.3"/>
      <circle cx="50" cy="50" r="8" fill="#FDF6E7"/>
    </svg>

    <h1 class="intro-title">تطبيق خَتْمَة</h1>
    <p class="intro-sub">ودّك تختم القرآن مع أهلك أو أصحابك ومحتار كيف ترتّب الأجزاء؟</p>

    <div class="intro-pills">
      <div class="intro-pill">✨ ٣٠ جزءاً</div>
      <div class="intro-pill">🔗 رابط واحد</div>
      <div class="intro-pill">⚡️ بدون تسجيل</div>
    </div>
  </div>

  <!-- SCENE 2: Create in seconds (6.5s - 12.8s) -->
  <div class="scene" id="scene-2">
    <div class="scene-header">
      <div class="step-pill">الخطوة الأولى</div>
      <h2 class="scene-title">أنشئ الختمة بلمسة واحدة</h2>
      <p class="scene-desc">حدد النية وتاريخ الختم وشارك الرابط عبر واتساب وتليجرام بدون أي تسجيل دخول.</p>
    </div>

    <div class="phone-mockup">
      <div class="phone-screen">
        <img src="data:image/png;base64,${homeImgBase64}" alt="Home Page Screenshot" />
      </div>
    </div>

    <div class="floating-callout" style="bottom: 180px; left: 100px;">
      <div class="callout-icon">🔗</div>
      <div class="callout-text">
        <h5>رابط فوري للمشاركة</h5>
        <p>واتساب • تليجرام • رسائل</p>
      </div>
    </div>
  </div>

  <!-- SCENE 3: Claim Juz & Privacy (12.8s - 18.8s) -->
  <div class="scene" id="scene-3">
    <div class="scene-header">
      <div class="step-pill" style="border-color: #B48327; color: #B48327;">الخطوة الثانية</div>
      <h2 class="scene-title">اختر جزأك مع حفظ الخصوصية</h2>
      <p class="scene-desc">كل شخص يختار جزءه مباشرة مع خيار إخفاء الاسم ليكون فاعل خير.</p>
    </div>

    <div class="phone-mockup">
      <div class="phone-screen">
        <img src="data:image/png;base64,${gridImgBase64}" alt="Grid Screenshot" />
      </div>
    </div>

    <div class="floating-callout" style="bottom: 180px; right: 90px; border-color: #15803D;">
      <div class="callout-icon" style="background: #0F2922;">👤</div>
      <div class="callout-text">
        <h5>خيار "فاعل خير"</h5>
        <p>سرية تامة لأجرك وعملك</p>
      </div>
    </div>
  </div>

  <!-- SCENE 4: Quran Reader & Audio (18.8s - 24.5s) -->
  <div class="scene" id="scene-4">
    <div class="scene-header">
      <div class="step-pill" style="border-color: #15803D; color: #15803D;">الخطوة الثالثة</div>
      <h2 class="scene-title">اقرأ مباشرة بالرسم العثماني</h2>
      <p class="scene-desc">مصحف متكامل من داخل التطبيق مع استماع صوتي لأشهر القرّاء وزر إتمام القراءة.</p>
    </div>

    <div class="phone-mockup">
      <div class="phone-screen">
        <img src="data:image/png;base64,${readerImgBase64}" alt="Reader Screenshot" />
      </div>
    </div>

    <div class="floating-callout" style="bottom: 180px; left: 90px; border-color: #B48327;">
      <div class="callout-icon" style="background: #B48327;">🎧</div>
      <div class="callout-text">
        <h5>تلاوات خاشعة</h5>
        <p>الدوسري • العفاسي • المنشاوي</p>
      </div>
    </div>
  </div>

  <!-- SCENE 5: Outro & Call to Action (24.5s - 31.0s) -->
  <div class="scene" id="scene-5">
    <div class="seal-large">خُتِم</div>

    <div class="intro-badge" style="background: rgba(21, 128, 61, 0.2); border-color: #15803D;">
      <span>✓</span>
      <span>مبارك إتمام الختمة</span>
    </div>

    <h2 class="intro-title" style="font-size: 72px;">شارك الأجر الآن</h2>
    <p class="intro-sub">واختم القرآن مع أحبابك بكل سهولة وتيسير.</p>

    <div class="features-grid">
      <div class="feature-card">
        <h4>مجاني بالكامل</h4>
        <p>لوجه الله تعالى</p>
      </div>
      <div class="feature-card">
        <h4>بدون أي إعلانات</h4>
        <p>تجربة روحانية خالصة</p>
      </div>
      <div class="feature-card">
        <h4>بدون تسجيل</h4>
        <p>دخول مباشر وفوري</p>
      </div>
      <div class="feature-card">
        <h4>مصحف عثماني</h4>
        <p>مع تلاوة لأشهر القراء</p>
      </div>
    </div>

    <div class="cta-btn">
      <span>ابدأ ختمتك الآن</span>
      <span>←</span>
    </div>
  </div>

  <script>
    // Exact timeline controller synchronized with voiceover
    const timeline = [
      { id: 'scene-1', start: 0, end: 6.5 },
      { id: 'scene-2', start: 6.5, end: 12.8 },
      { id: 'scene-3', start: 12.8, end: 18.8 },
      { id: 'scene-4', start: 18.8, end: 24.5 },
      { id: 'scene-5', start: 24.5, end: 32.0 },
    ];

    const startTime = performance.now();

    function update() {
      const elapsed = (performance.now() - startTime) / 1000;
      timeline.forEach(({ id, start, end }) => {
        const el = document.getElementById(id);
        if (elapsed >= start && elapsed < end) {
          if (!el.classList.contains('active')) {
            document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
            el.classList.add('active');
          }
        }
      });
      requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
  </script>
</body>
</html>
  `;

  console.log('Setting page content and recording...');
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });

  // Record for 31 seconds
  await page.waitForTimeout(31000);

  await page.close();
  await context.close();
  await browser.close();

  // Find the recorded webm file
  const files = fs.readdirSync(videoTempDir).filter(f => f.endsWith('.webm'));
  if (files.length === 0) {
    throw new Error('No recorded video found in temp dir');
  }

  const rawVideoPath = path.join(videoTempDir, files[0]);
  const audioPath = path.join(__dirname, '../public/promo-assets/final-audio.wav');
  const finalVideoPath = path.join(__dirname, '../public/khatma-promo-30s.mp4');

  console.log('Muxing video with final voiceover and background audio using ffmpeg...');
  // Mux video and audio into high quality H.264 MP4 with AAC audio
  const ffmpegCmd = `ffmpeg -y -i "${rawVideoPath}" -i "${audioPath}" -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest "${finalVideoPath}"`;
  execSync(ffmpegCmd);

  console.log('Video generated successfully at:', finalVideoPath);

  // Clean temp files
  fs.rmSync(videoTempDir, { recursive: true, force: true });
}

recordPromoVideo().catch((err) => {
  console.error('Error recording video:', err);
  process.exit(1);
});
