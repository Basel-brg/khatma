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
});
