import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.beforeAll(async () => {
  const screenshotsDir = path.join(process.cwd(), 'e2e', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
});

// Helper to disable Next.js development overlay portal so it never intercepts clicks
async function suppressDevOverlay(page: any) {
  await page.addStyleTag({
    content: `
      nextjs-portal {
        display: none !important;
        pointer-events: none !important;
        visibility: hidden !important;
      }
    `,
  });
}

test.describe('Khatma Application E2E & Visual Suite', () => {
  test('1. Home page in both Light and Dark themes (/): Hero, Shamsa Rosette, Presets, Form, Recents & Screenshots', async ({ page }) => {
    await page.goto('/');
    await suppressDevOverlay(page);

    // Ensure page is in Light theme first
    const isDarkInitially = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (isDarkInitially) {
      const lightBtn = page.getByRole('button', { name: /المظهر الفاتح/i });
      if (await lightBtn.isVisible()) {
        await lightBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 1. Hero title
    const heroTitle = page.getByText('الرَّبْعَةُ القرآنية التشاركية');
    await expect(heroTitle).toBeVisible();

    // 2. Islamic 8-pointed Shamsa Rosette
    const shamsaRosette = page.locator('header svg').filter({ has: page.locator('rect') }).first();
    await expect(shamsaRosette).toBeVisible();

    // 3. Quick presets buttons
    const presetRamadan = page.getByRole('button', { name: 'ختمة رمضانية' });
    const presetParents = page.getByRole('button', { name: 'في ثواب الوالدين' });
    const presetShifa = page.getByRole('button', { name: 'صدقة جارية وشفاء' });
    const presetWeekly = page.getByRole('button', { name: 'ورد أسبوعي' });

    await expect(presetRamadan).toBeVisible();
    await expect(presetParents).toBeVisible();
    await expect(presetShifa).toBeVisible();
    await expect(presetWeekly).toBeVisible();

    // Clicking a preset updates the title and intention inputs
    await presetRamadan.click();
    const titleInput = page.locator('#home-title');
    await expect(titleInput).toHaveValue('ختمة شهر رمضان المبارك');

    // 4. Creation Form elements
    await expect(page.locator('#home-intention')).toBeVisible();
    await expect(page.locator('#home-date')).toBeVisible();
    const submitBtn = page.getByRole('button', { name: /إنشاء الختمة وفتح خانات الأجزاء الثلاثين/i });
    await expect(submitBtn).toBeVisible();

    // 5. Recent Khatmas ledger section
    const recentsHeading = page.getByText('سجل الختمات المحفوظة على هذا الجهاز');
    await expect(recentsHeading).toBeVisible();

    // Live preview demo banner to demo-ramadan
    await expect(page.getByText('ختمة شهر رمضان المبارك (معاينة حية للربعة)')).toBeVisible();

    // Capture Light Mode Screenshot
    await page.screenshot({ path: 'e2e/screenshots/home-light.png', fullPage: true });

    // Toggle Theme to Dark Mode
    const darkThemeBtn = page.getByRole('button', { name: /المظهر الداكن/i });
    await expect(darkThemeBtn).toBeVisible();
    await darkThemeBtn.click();
    await page.waitForTimeout(300);

    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkNow).toBe(true);

    // Capture Dark Mode Screenshot
    await page.screenshot({ path: 'e2e/screenshots/home-dark.png', fullPage: true });
  });

  test('2. Khatma 30-Juz Rabah matrix (/khatma/demo-ramadan) in Light and Dark themes', async ({ page }) => {
    await page.goto('/khatma/demo-ramadan');
    await suppressDevOverlay(page);

    // 1. Header title
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ختمة رمضان المبارك التشاركية');

    // 2. 30 Juz compartments with Arabic names and numbers
    for (let i = 1; i <= 30; i++) {
      const card = page.getByTestId(`juz-card-${i}`);
      await expect(card).toBeVisible();
    }

    // 3. Completed juzs display the green scalloped «خُتم» wax stamp
    const completedCard1 = page.getByTestId('juz-card-1');
    await expect(completedCard1).toContainText('مكتمل');
    await expect(completedCard1).toContainText('خُتِم');
    await expect(completedCard1).toContainText('أحمد المنصور');

    const completedCard2 = page.getByTestId('juz-card-2');
    await expect(completedCard2).toContainText('مكتمل');
    await expect(completedCard2).toContainText('خُتِم');
    await expect(completedCard2).toContainText('فاعل خير');

    // 4. Reserved juzs display reader name and amber border
    const reservedCard3 = page.getByTestId('juz-card-3');
    await expect(reservedCard3).toContainText('سارة العبدالله');
    await expect(reservedCard3).toContainText('محجوز');

    const reservedCard29 = page.getByTestId('juz-card-29');
    await expect(reservedCard29).toContainText('عمر الشريف');
    await expect(reservedCard29).toContainText('محجوز');

    // 5. Theme toggle button works and persists
    // Switch to Light Theme if in dark mode
    let isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    if (isDark) {
      const lightBtn = page.getByRole('button', { name: /المظهر الفاتح/i });
      if (await lightBtn.isVisible()) {
        await lightBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // Verify Light mode
    isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(false);

    // Capture Grid Screenshot in Light Mode
    await page.screenshot({ path: 'e2e/screenshots/khatma-grid-light.png', fullPage: true });

    // Toggle to Dark Mode
    const darkBtn = page.getByRole('button', { name: /المظهر الداكن/i });
    await darkBtn.click();
    await page.waitForTimeout(300);

    // Verify Dark mode
    isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDark).toBe(true);

    // Capture Grid Screenshot in Dark Mode
    await page.screenshot({ path: 'e2e/screenshots/khatma-grid-dark.png', fullPage: true });

    // Verify persistence upon reload
    await page.reload();
    await suppressDevOverlay(page);
    const persistedDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(persistedDark).toBe(true);
  });

  test('3 & 4. Reserve Sheet interaction & comprehensive Quran Reader Modal testing', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/khatma/demo-ramadan');
    await suppressDevOverlay(page);

    // 3. Reserve Sheet interaction
    // Click available Juz 30
    const card30 = page.getByTestId('juz-card-30');
    await card30.scrollIntoViewIfNeeded();
    await expect(card30).toContainText('متاح للحجز');
    await card30.click();

    // Verify ReserveJuzSheet opened
    await expect(page.getByText('حجز الجزء الثلاثون')).toBeVisible();
    const nameInput = page.getByLabel('الاسم');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('عبدالرحمن القارئ');

    const confirmReserveBtn = page.getByTestId('confirm-reserve-btn');
    await expect(confirmReserveBtn).toBeVisible();
    await confirmReserveBtn.click();

    // 4. Quran Reader Modal Opens for the reserved Juz (Juz 30)
    const readerModal = page.getByTestId('quran-reader-modal');
    await expect(readerModal).toBeVisible();

    // Check top bar:
    const readerHeader = readerModal.locator('header');
    await expect(readerHeader).toBeVisible();

    // - Verify Juz and Surah title are NOT in the top bar
    await expect(readerHeader).not.toContainText('الجزء الثلاثون');

    // - Verify unreserve button is NOT in the top bar
    await expect(readerHeader.getByTestId('unreserve-juz-btn')).not.toBeVisible();

    // - Close X
    const closeBtn = page.getByLabel('إغلاق قارئ المصحف');
    await expect(closeBtn).toBeVisible();

    // - Bookmark button with page badge
    await expect(page.getByTitle('حفظ موضع القراءة')).toBeVisible();

    // Complete button must NOT be visible on early pages
    const completeBtn = page.getByTestId('complete-juz-btn');
    await expect(completeBtn).not.toBeVisible();

    // - Burger menu button
    const burgerBtn = page.getByLabel('فتح قائمة إعدادات المصحف');
    await expect(burgerBtn).toBeVisible();

    // Tests clicking the Burger Menu button: drawer slides in
    await burgerBtn.click();
    await page.waitForTimeout(400);

    // Unreserve button lives exclusively inside the Burger Menu drawer on early pages
    const unreserveBtn = page.getByTestId('unreserve-juz-btn');
    await expect(unreserveBtn).toBeVisible();
    await expect(unreserveBtn).toContainText('الاعتذار');

    // Verify drawer contents: font size controls, day/night toggle, search input, surah index
    await expect(page.getByText('إعدادات المصحف والقراءة')).toBeVisible();
    await expect(page.getByText('حجم خط التلاوة')).toBeVisible();
    await expect(page.getByLabel('تكبير الخط')).toBeVisible();
    await expect(page.getByLabel('تصغير الخط')).toBeVisible();

    await expect(page.getByText('مظهر القراءة')).toBeVisible();
    await expect(page.getByText('البحث في سور الجزء')).toBeVisible();

    // Capture screenshot of Burger Menu drawer
    await page.screenshot({ path: 'e2e/screenshots/reader-drawer.png' });

    // Use search input in drawer to find Surah Al-Ghashiyah
    const surahSearchInput = page.getByPlaceholder('ابحث باسم السورة...');
    await surahSearchInput.fill('الغاشية');
    await page.waitForTimeout(200);

    const ghashiyahItem = page.getByRole('button', { name: /الغاشية/i });
    await expect(ghashiyahItem).toBeVisible();
    await ghashiyahItem.click();
    await page.waitForTimeout(400);

    // Checks the Surah Cartouche banner (`سورة الغاشية`) and Basmala
    const cartoucheBanner = page.locator('div[aria-label="سورة الغاشية"]');
    await expect(cartoucheBanner).toBeVisible();
    await expect(cartoucheBanner).toContainText('سورة الغاشية');

    const basmalaText = page.getByText('بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ').first();
    await expect(basmalaText).toBeVisible();

    // Tests tapping on page to toggle full-screen reading mode
    const readingArea = readerModal.getByRole('main');
    await readingArea.click({ position: { x: 150, y: 150 } });
    await page.waitForTimeout(400);

    // Tap again to restore controls
    await readingArea.click({ position: { x: 150, y: 150 } });
    await page.waitForTimeout(400);

    // Tests swipe / drag on reading area to navigate pages smoothly
    // Surah Al-Ghashiyah is on page 592 (٥٩٢)
    await expect(page.getByText('٥٩٢', { exact: true }).first()).toBeVisible();

    const mainBox = await readingArea.boundingBox();
    if (mainBox) {
      const startX = mainBox.x + mainBox.width * 0.75;
      const endX = mainBox.x + mainBox.width * 0.25;
      const centerY = mainBox.y + mainBox.height * 0.5;
      await page.mouse.move(startX, centerY);
      await page.mouse.down();
      await page.mouse.move(endX, centerY, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // Verify page changed to 593 (٥٩٣)
    await expect(page.getByText('٥٩٣', { exact: true }).first()).toBeVisible();

    // Checks floating AudioReciterBar and Page Slider with the gold badge and 604 jump button
    const reciterBar = page.getByTestId('audio-reciter-bar');
    await expect(reciterBar).toBeVisible();

    // Tests reciter selection including 'إسلام صبحي' and playing audio
    const reciterSelectBtn = page.getByLabel('اختيار القارئ');
    await expect(reciterSelectBtn).toBeVisible();
    await reciterSelectBtn.click();
    await page.waitForTimeout(250);

    const islamSobhiOption = page.getByRole('option', { name: /إسلام صبحي/i });
    await expect(islamSobhiOption).toBeVisible();
    await islamSobhiOption.click();
    await page.waitForTimeout(250);
    await expect(page.getByLabel('اختيار القارئ')).toContainText('إسلام صبحي');

    // Test Audio Play
    const playBtn = page.getByLabel(/تشغيل التلاوة|إيقاف مؤقت/i);
    await expect(playBtn).toBeVisible();
    await playBtn.click();
    await page.waitForTimeout(400);

    // Check Page Slider and 604 Jump Button
    const pageSlider = page.getByLabel('سلايدر التنقل بين صفحات المصحف');
    await expect(pageSlider).toBeVisible();

    const lastPageBtn = page.getByTitle('الانتقال لآخر صفحة');
    await expect(lastPageBtn).toBeVisible();
    await expect(lastPageBtn).toContainText('٦٠٤');

    // Tests navigating to the last page using the 604 button:
    // (using force: true to avoid any dev-overlay interference)
    await lastPageBtn.click({ force: true });
    await page.waitForTimeout(500);

    // Verifies that 'الاعتذار عن الجزء' disappears and 'أتممت القراءة' appears!
    await expect(page.getByTestId('unreserve-juz-btn')).not.toBeVisible();
    await expect(page.getByTestId('complete-juz-btn')).toBeVisible();
    await expect(page.getByTestId('complete-juz-btn')).toContainText('أتممت القراءة');

    // Captures screenshot in Light Mode first
    await page.screenshot({ path: 'e2e/screenshots/reader-mushaf-light.png' });

    // Toggle reader theme to Dark Mode via Burger Menu
    await burgerBtn.click();
    await page.waitForTimeout(300);

    const themeToggleInDrawer = page.getByLabel(/الوضع النهاري|التبديل إلى الوضع النهاري|الوضع الليلي|التبديل إلى الوضع الليلي/i);
    await themeToggleInDrawer.click();
    await page.waitForTimeout(300);

    const closeDrawerBtn = page.getByLabel('رجوع من القائمة');
    await closeDrawerBtn.click();
    await page.waitForTimeout(300);

    // Captures screenshot in Dark Mode (Illuminated Night)
    await page.screenshot({ path: 'e2e/screenshots/reader-mushaf-dark.png' });
  });
});
