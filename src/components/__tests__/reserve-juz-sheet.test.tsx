import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import ReserveJuzSheet from '../ReserveJuzSheet';

describe('ReserveJuzSheet', () => {
  it('renders surah list for Juz 1 (Al-Fatihah, Al-Baqarah)', () => {
    render(
      <ReserveJuzSheet
        khatmaId="test-khatma"
        juzNumber={1}
        uid="user-123"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('السور المتضمنة في هذا الجزء:')).toBeTruthy();
    expect(screen.getByText('سورتان')).toBeTruthy();

    const tagsContainer = screen.getByTestId('juz-surah-tags');
    expect(within(tagsContainer).getByText(/سورة الفاتحة/)).toBeTruthy();
    expect(within(tagsContainer).getByText(/سورة البقرة/)).toBeTruthy();
  });

  it('renders all 37 surahs for Juz 30 (Amma)', () => {
    render(
      <ReserveJuzSheet
        khatmaId="test-khatma"
        juzNumber={30}
        uid="user-123"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('السور المتضمنة في هذا الجزء:')).toBeTruthy();
    expect(screen.getByText(/٣٧\s*سورة/)).toBeTruthy();

    const tagsContainer = screen.getByTestId('juz-surah-tags');
    expect(within(tagsContainer).getByText(/سورة النبأ/)).toBeTruthy();
    expect(within(tagsContainer).getByText(/سورة الإخلاص/)).toBeTruthy();
    expect(within(tagsContainer).getByText(/سورة الناس/)).toBeTruthy();
  });

  it('renders single surah count correctly for Juz 2 (Al-Baqarah)', () => {
    render(
      <ReserveJuzSheet
        khatmaId="test-khatma"
        juzNumber={2}
        uid="user-123"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('سورة واحدة')).toBeTruthy();
    const tagsContainer = screen.getByTestId('juz-surah-tags');
    expect(within(tagsContainer).getByText(/سورة البقرة/)).toBeTruthy();
  });
});

