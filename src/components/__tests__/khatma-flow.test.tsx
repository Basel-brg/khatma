import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { createKhatma, resetLocalKhatmaStoreForTests } from '../../lib/khatma-service';
import KhatmaPageClient from '../KhatmaPageClient';

describe('Khatma 30-Juz flow', () => {
  beforeEach(() => {
    resetLocalKhatmaStoreForTests();
  });

  it('renders khatma header info, 30 juz cards, reserves a juz, opens Quran reader, and marks it completed', async () => {
    const doc = await createKhatma(
      { title: 'ختمة شهر رمضان', intention: 'في ثواب الوالدين', targetDate: '2026-11-15' },
      'uid-test'
    );

    render(<KhatmaPageClient khatmaId={doc.id} initialUid="uid-test" />);

    expect(await screen.findByText('ختمة شهر رمضان')).toBeTruthy();
    expect(screen.getByText('في ثواب الوالدين')).toBeTruthy();
    expect(screen.getByText('الجزء الأول')).toBeTruthy();
    expect(screen.getByText('الجزء الثلاثون')).toBeTruthy();

    fireEvent.click(screen.getByTestId('juz-card-1'));

    const nameInput = await screen.findByLabelText(/الاسم/i);
    fireEvent.change(nameInput, { target: { value: 'عبدالله' } });
    fireEvent.click(screen.getByTestId('confirm-reserve-btn'));

    expect(await screen.findByTestId('quran-reader-modal')).toBeTruthy();
    fireEvent.click(screen.getByTestId('complete-juz-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('juz-card-1').textContent).toContain('مكتمل');
    });
  });

  it('allows user to unreserve a juz from within the Quran reader', async () => {
    const doc = await createKhatma(
      { title: 'ختمة الجمعة', intention: 'لوجه الله تعالى', targetDate: '2026-11-20' },
      'uid-test-2'
    );

    render(<KhatmaPageClient khatmaId={doc.id} initialUid="uid-test-2" />);

    await screen.findByText('ختمة الجمعة');
    fireEvent.click(screen.getByTestId('juz-card-2'));

    const nameInput = await screen.findByLabelText(/الاسم/i);
    fireEvent.change(nameInput, { target: { value: 'محمد' } });
    fireEvent.click(screen.getByTestId('confirm-reserve-btn'));

    expect(await screen.findByTestId('quran-reader-modal')).toBeTruthy();
    expect(screen.getByTestId('unreserve-juz-btn')).toBeTruthy();

    fireEvent.click(screen.getByTestId('unreserve-juz-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('juz-card-2').textContent).toContain('متاح للحجز');
    });
  });

  it('shows reserved status for other users with privacy handling (فاعل خير)', async () => {
    const doc = await createKhatma(
      { title: 'ختمة جماعية', intention: 'للشفاء', targetDate: '2026-12-01' },
      'creator-uid'
    );

    // Reserve Juz 3 with hideName = true as user-a
    const { unmount: unmountUserA } = render(
      <KhatmaPageClient khatmaId={doc.id} initialUid="user-a" />
    );
    await screen.findByText('ختمة جماعية');
    fireEvent.click(screen.getByTestId('juz-card-3'));

    const nameInput = await screen.findByLabelText(/الاسم/i);
    fireEvent.change(nameInput, { target: { value: 'خالد' } });
    const hideNameCheckbox = screen.getByLabelText(/فاعل خير/i);
    fireEvent.click(hideNameCheckbox);
    fireEvent.click(screen.getByTestId('confirm-reserve-btn'));

    await screen.findByTestId('quran-reader-modal');
    // Close reader modal
    const closeBtn = screen.getByLabelText(/إغلاق/i);
    fireEvent.click(closeBtn);

    // Unmount user-a view before mounting user-b view
    unmountUserA();

    // Now render as user-b
    const { unmount: unmountUserB } = render(
      <KhatmaPageClient khatmaId={doc.id} initialUid="user-b" />
    );
    await waitFor(() => {
      expect(screen.getByTestId('juz-card-3').textContent).toContain('فاعل خير');
    });
    unmountUserB();
  });

  it('displays active reserved banner and enables quick reading access', async () => {
    const doc = await createKhatma(
      { title: 'ختمة الأهل', intention: 'صلة الرحم', targetDate: '2026-11-30' },
      'user-active'
    );

    render(<KhatmaPageClient khatmaId={doc.id} initialUid="user-active" />);
    await screen.findByText('ختمة الأهل');

    fireEvent.click(screen.getByTestId('juz-card-5'));
    const nameInput = await screen.findByLabelText(/الاسم/i);
    fireEvent.change(nameInput, { target: { value: 'أحمد' } });
    fireEvent.click(screen.getByTestId('confirm-reserve-btn'));

    await screen.findByTestId('quran-reader-modal');
    // Close reader
    fireEvent.click(screen.getByLabelText(/إغلاق/i));

    // The active reserved banner should now be visible
    expect(screen.getByText(/أجزاؤك المحجوزة حالياً/i)).toBeTruthy();
    expect(screen.getByText('الجزء 5')).toBeTruthy();

    // Clicking it should re-open reader modal
    fireEvent.click(screen.getByText('الجزء 5'));
    expect(await screen.findByTestId('quran-reader-modal')).toBeTruthy();
  });

  it('provides font size controls, theme toggle, and audio controls inside reader', async () => {
    const doc = await createKhatma(
      { title: 'ختمة النور', intention: 'بركة وتيسير', targetDate: '2026-11-25' },
      'user-reader'
    );

    render(<KhatmaPageClient khatmaId={doc.id} initialUid="user-reader" />);
    await screen.findByText('ختمة النور');

    // Open Juz 1 directly by clicking card
    fireEvent.click(screen.getByTestId('juz-card-1'));
    const nameInput = await screen.findByLabelText(/الاسم/i);
    fireEvent.change(nameInput, { target: { value: 'سارة' } });
    fireEvent.click(screen.getByTestId('confirm-reserve-btn'));

    await screen.findByTestId('quran-reader-modal');

    // Font size controls
    const zoomInBtn = screen.getByLabelText('تكبير الخط');
    const zoomOutBtn = screen.getByLabelText('تصغير الخط');
    fireEvent.click(zoomInBtn);
    fireEvent.click(zoomOutBtn);

    // Theme toggle
    const themeBtn = screen.getByLabelText('الوضع الليلي');
    fireEvent.click(themeBtn);
    expect(screen.getByLabelText('الوضع النهاري')).toBeTruthy();

    // Audio bar reciter selector
    const reciterSelectBtn = screen.getByLabelText('اختيار القارئ');
    fireEvent.click(reciterSelectBtn);
    expect(screen.getByText('محمود خليل الحصري')).toBeTruthy();
    fireEvent.click(screen.getByText('محمود خليل الحصري'));

    // Audio controls
    const playBtn = screen.getByLabelText(/تشغيل التلاوة/i);
    fireEvent.click(playBtn);

    const nextAyahBtn = screen.getByLabelText('الآية التالية');
    fireEvent.click(nextAyahBtn);
  });

  it('renders celebration banner and Dua Khatm Al-Quran when all 30 juzs are completed', async () => {
    const doc = await createKhatma(
      { title: 'ختمة مكتملة', intention: 'شكر لله', targetDate: '2026-10-30' },
      'creator-uid'
    );

    // Reserve and complete all 30 juzs
    const { reserveJuz, completeJuz } = await import('../../lib/khatma-service');
    for (let i = 1; i <= 30; i++) {
      await reserveJuz({
        khatmaId: doc.id,
        juzNumber: i,
        readerName: `قارئ ${i}`,
        hideName: false,
        uid: 'any-user',
      });
      await completeJuz({ khatmaId: doc.id, juzNumber: i, uid: 'any-user' });
    }

    render(<KhatmaPageClient khatmaId={doc.id} initialUid="any-user" />);
    await screen.findByText('ختمة مكتملة');

    expect(await screen.findByText(/مُبَارَكٌ إِتْمَامُ الْخَتْمَةِ الشَّرِيفَةِ/i)).toBeTruthy();
    expect(screen.getByText(/دعاء ختم القرآن الكريم/i)).toBeTruthy();
    expect(screen.getByText(/اللَّهُمَّ ارْحَمْنَا بِالقُرْآنِ/i)).toBeTruthy();
  });
});
