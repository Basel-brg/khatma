import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import AudioReciterBar from '../AudioReciterBar';

describe('AudioReciterBar Playback Controls Layout & Direction', () => {
  it('renders playback controls with correct RTL direction and button placement', () => {
    const onNextAyah = vi.fn();
    const onPrevAyah = vi.fn();

    render(
      <AudioReciterBar
        currentSurahNumber={1}
        currentSurahNameAr="الفاتحة"
        currentAyahNumber={1}
        onNextAyah={onNextAyah}
        onPrevAyah={onPrevAyah}
      />
    );

    const nextAyahBtn = screen.getByRole('button', { name: 'الآية التالية' });
    const prevAyahBtn = screen.getByRole('button', { name: 'الآية السابقة' });
    const playBtn = screen.getByRole('button', { name: /تشغيل التلاوة/i });

    expect(nextAyahBtn).toBeTruthy();
    expect(prevAyahBtn).toBeTruthy();
    expect(playBtn).toBeTruthy();

    // Verify container and ordering
    const playbackCluster = nextAyahBtn.parentElement;
    expect(playbackCluster).toBeTruthy();
    expect(playbackCluster?.getAttribute('dir')).toBe('rtl');

    // In RTL flexbox, 1st child is on the visual RIGHT (Previous ayah), 2nd child is in the MIDDLE, 3rd child is on the visual LEFT (Next ayah)
    const buttons = playbackCluster?.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
    expect(buttons?.[0]).toBe(prevAyahBtn); // Visual right -> Previous Ayah
    expect(buttons?.[1]).toBe(playBtn);     // Visual center
    expect(buttons?.[2]).toBe(nextAyahBtn); // Visual left -> Next Ayah

    // Test click events
    act(() => {
      fireEvent.click(prevAyahBtn);
    });
    expect(onPrevAyah).toHaveBeenCalledTimes(1);

    act(() => {
      fireEvent.click(nextAyahBtn);
    });
    expect(onNextAyah).toHaveBeenCalledTimes(1);
  });
});
