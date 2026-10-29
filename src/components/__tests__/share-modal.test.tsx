import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareModal from '../ShareModal';

describe('ShareModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly when open with valid clean URL', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        khatmaId="demo-ramadan"
        title="ختمة رمضان المبارك"
        intention="تقبل الله منا ومنكم"
      />
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('مشاركة رابط الختمة')).toBeDefined();
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toContain('/khatma/demo-ramadan');
    expect(screen.getByText('مشاركة عبر واتساب (WhatsApp)')).toBeDefined();
    expect(screen.getByText('مشاركة عبر تيليجرام (Telegram)')).toBeDefined();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <ShareModal
        isOpen={false}
        onClose={vi.fn()}
        khatmaId="demo-ramadan"
        title="ختمة رمضان المبارك"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('copies the clean link and shows feedback when clicking copy button', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        khatmaId="demo-ramadan"
        title="ختمة رمضان المبارك"
      />
    );

    const copyBtn = screen.getByTestId('share-modal-copy-btn');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
      expect(screen.getByText('تم النسخ!')).toBeDefined();
    });
  });

  it('closes when clicking close X button or pressing Escape', () => {
    const onCloseMock = vi.fn();
    render(
      <ShareModal
        isOpen={true}
        onClose={onCloseMock}
        khatmaId="demo-ramadan"
        title="ختمة رمضان المبارك"
      />
    );

    const closeBtn = screen.getByLabelText('إغلاق نافذة المشاركة');
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(2);
  });
});
