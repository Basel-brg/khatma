import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import QuranReaderModal from '../QuranReaderModal';

describe('QuranReaderModal', () => {
  const baseProps = {
    juzNumber: 1,
    khatmaId: 'khatma-123',
    uid: 'user-123',
    isReservedByMe: true,
    isCompleted: false,
    onClose: vi.fn(),
    onComplete: vi.fn(),
    onUnreserve: vi.fn(),
  };

  it('renders top bar without center title and without top-bar unreserve button', () => {
    render(<QuranReaderModal {...baseProps} />);

    // Center title should NOT exist in top bar header
    const header = screen.getByRole('banner');
    expect(header).toBeTruthy();
    // Header should contain Burger menu (replacing settings), Bookmark, and Close
    expect(screen.getByTitle('حفظ موضع القراءة')).toBeTruthy();
    expect(screen.getByLabelText('فتح قائمة إعدادات المصحف')).toBeTruthy();
    expect(screen.getByLabelText('إغلاق قارئ المصحف')).toBeTruthy();

    // The header itself should NOT have an unreserve button
    const unreserveInHeader = header.querySelector('[data-testid="unreserve-juz-btn"]');
    expect(unreserveInHeader).toBeNull();

    // The unreserve button should exist inside the drawer
    const unreserveBtn = screen.getByTestId('unreserve-juz-btn');
    expect(unreserveBtn).toBeTruthy();
  });

  it('handles swipe gestures on main with touch and pointer events', () => {
    render(<QuranReaderModal {...baseProps} />);

    const main = screen.getByRole('main');

    // Touch swipe left (diffX > 35)
    fireEvent.touchStart(main, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(main, { touches: [{ clientX: 150, clientY: 100 }] });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 150, clientY: 100 }] });

    // Touch swipe right (diffX < -35)
    fireEvent.touchStart(main, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchMove(main, { touches: [{ clientX: 180, clientY: 100 }] });
    fireEvent.touchEnd(main, { changedTouches: [{ clientX: 180, clientY: 100 }] });

    // Pointer swipe left (diffX > 35)
    fireEvent.pointerDown(main, { button: 0, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(main, { clientX: 150, clientY: 100 });
    fireEvent.pointerUp(main, { clientX: 150, clientY: 100 });

    // Pointer swipe right (diffX < -35)
    fireEvent.pointerDown(main, { button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(main, { clientX: 180, clientY: 100 });
    fireEvent.pointerUp(main, { clientX: 180, clientY: 100 });
  });

  it('renders defense-in-depth access denied screen when user is unauthorized', () => {
    const onClose = vi.fn();
    render(
      <QuranReaderModal
        {...baseProps}
        isReservedByMe={false}
        isCompleted={true}
        isCompletedByMe={false}
        isAccessDenied={true}
        holderName="سعيد الزهراني"
        onClose={onClose}
      />
    );

    expect(screen.getByTestId('access-denied-view')).toBeTruthy();
    expect(screen.getByText('الوصول غير متاح لهذا الجزء')).toBeTruthy();
    expect(screen.getByText(/سعيد الزهراني/)).toBeTruthy();
    // Should NOT show main reading banner or content
    expect(screen.queryByRole('banner')).toBeNull();
    expect(screen.queryByLabelText('فتح قائمة إعدادات المصحف')).toBeNull();

    // Clicking return button calls onClose
    fireEvent.click(screen.getByTestId('close-access-denied-btn'));
    expect(onClose).toHaveBeenCalled();
  });

  describe('Ayah 2-second long-press gesture', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      if (typeof window !== 'undefined' && !window.PointerEvent) {
        window.PointerEvent = window.MouseEvent as any;
      }
      if (typeof navigator !== 'undefined') {
        navigator.vibrate = vi.fn();
      }
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
    });

    it('does not select ayah when held for less than 2 seconds (e.g. 1500ms)', () => {
      render(<QuranReaderModal {...baseProps} />);

      const ayah2 = screen.getByTestId('ayah-1-2');
      expect(ayah2).toBeTruthy();

      // Press down on Ayah 2
      fireEvent.pointerDown(ayah2, { button: 0, clientX: 100, clientY: 100 });

      // Advance by 1500ms (less than 2000ms)
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      // Release finger before 2s
      fireEvent.pointerUp(ayah2);
      fireEvent.click(ayah2);

      // Ayah 2 should NOT be selected
      expect(screen.queryByTestId('ayah-selection-toast')).toBeNull();
      expect(ayah2.className).not.toContain('font-bold shadow-xs');
    });

    it('selects ayah when held for 2 seconds (2000ms) and provides feedback', () => {
      render(<QuranReaderModal {...baseProps} />);

      const ayah2 = screen.getByTestId('ayah-1-2');
      expect(ayah2).toBeTruthy();

      // Press down on Ayah 2
      fireEvent.pointerDown(ayah2, { button: 0, clientX: 100, clientY: 100 });

      // Visual feedback should be active while holding
      expect(ayah2.className).toContain('ring-2');

      // Advance timer by 2000ms (2 seconds)
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Selection toast should be displayed
      const toast = screen.getByTestId('ayah-selection-toast');
      expect(toast).toBeTruthy();
      expect(toast.textContent).toContain('تم تحديد الآية');

      // Haptic feedback should be triggered
      expect(navigator.vibrate).toHaveBeenCalledWith(50);

      // Ayah 2 should now have the current/selected styling
      expect(ayah2.className).toMatch(/bg-\[#FDF3D6\]|bg-\[#C5A059\]/);

      // Releasing pointer and subsequent click should NOT toggle controls
      fireEvent.pointerUp(ayah2);
      fireEvent.click(ayah2);

      // Wait 200ms to allow isLongPressActive to reset cleanly
      act(() => {
        vi.advanceTimersByTime(200);
      });
    });

    it('tolerates micro-jitter (< 15px) without canceling long press', () => {
      render(<QuranReaderModal {...baseProps} />);

      const ayah2 = screen.getByTestId('ayah-1-2');

      fireEvent.pointerDown(ayah2, { button: 0, clientX: 100, clientY: 100 });

      // Micro-jitter of 5px
      fireEvent.pointerMove(ayah2, { clientX: 105, clientY: 104 });

      // Complete the 2s duration
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Long press should still succeed despite jitter
      expect(screen.getByTestId('ayah-selection-toast')).toBeTruthy();
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('cancels long press when movement exceeds 15px', () => {
      render(<QuranReaderModal {...baseProps} />);

      const ayah2 = screen.getByTestId('ayah-1-2');

      fireEvent.pointerDown(ayah2, { button: 0, clientX: 100, clientY: 100 });

      // Movement exceeds 15px (dx = 20px)
      fireEvent.pointerMove(ayah2, { clientX: 120, clientY: 100 });

      // Advance past 2s
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Long press should be canceled
      expect(screen.queryByTestId('ayah-selection-toast')).toBeNull();
      expect(ayah2.className).not.toContain('font-bold shadow-xs');
    });

    it('cancels long press on pointer cancel or touch cancel', () => {
      render(<QuranReaderModal {...baseProps} />);

      const ayah2 = screen.getByTestId('ayah-1-2');

      // Test pointer cancel
      fireEvent.pointerDown(ayah2, { button: 0, clientX: 100, clientY: 100 });
      fireEvent.pointerCancel(ayah2);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByTestId('ayah-selection-toast')).toBeNull();

      // Test touch cancel
      fireEvent.pointerDown(ayah2, { button: 0, clientX: 100, clientY: 100 });
      fireEvent.touchCancel(ayah2);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByTestId('ayah-selection-toast')).toBeNull();
    });

    it('prevents native contextmenu event on ayah to avoid interrupting hold on mobile', () => {
      render(<QuranReaderModal {...baseProps} />);

      const ayah2 = screen.getByTestId('ayah-1-2');
      const preventDefault = vi.fn();

      fireEvent.contextMenu(ayah2, { preventDefault });
      expect(ayah2).toBeTruthy();
    });

    it('does not toggle full-screen controls on click if long-press was triggered, but resets after 200ms', () => {
      render(<QuranReaderModal {...baseProps} />);

      const ayah2 = screen.getByTestId('ayah-1-2');
      const header = screen.getByRole('banner');

      // Initially header has controls visible (opacity-100)
      expect(header.className).toContain('opacity-100');

      // Trigger full 2s long press on ayah 2
      fireEvent.pointerDown(ayah2, { button: 0, clientX: 100, clientY: 100 });
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      fireEvent.pointerUp(ayah2);

      // Click immediately after long press: should NOT toggle controls off
      fireEvent.click(ayah2);
      expect(header.className).toContain('opacity-100');

      // After 200ms, the suppression window clears
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Subsequent short click on ayah SHOULD now toggle controls normally
      act(() => {
        fireEvent.click(screen.getByTestId('ayah-1-2'));
      });
      expect(screen.getByRole('banner').className).toContain('opacity-0');
    });
  });
});
