import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadJuzFromDiskOrFetch } from '../quran-loader';
import { JUZ_METADATA } from '../quran-meta';

describe('Tanzil 30 Juz static files & loader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has all 30 Juz JSON files in public/quran with valid Uthmani ayahs', () => {
    let grandTotalAyahs = 0;

    for (let i = 1; i <= 30; i++) {
      const p = path.join(process.cwd(), 'public', 'quran', `juz-${i}.json`);
      expect(fs.existsSync(p), `juz-${i}.json should exist`).toBe(true);
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      expect(data.juzNumber).toBe(i);
      expect(data.nameAr).toBe(JUZ_METADATA[i - 1].nameAr);
      expect(data.sections.length).toBeGreaterThan(0);
      expect(data.totalAyahs).toBeGreaterThan(0);

      const sectionAyahSum = data.sections.reduce(
        (sum: number, s: any) => sum + s.ayahs.length,
        0
      );
      expect(data.totalAyahs).toBe(sectionAyahSum);
      grandTotalAyahs += data.totalAyahs;

      // Verify each section and ayah structure
      for (const section of data.sections) {
        expect(section.surahNumber).toBeGreaterThanOrEqual(1);
        expect(section.surahNumber).toBeLessThanOrEqual(114);
        expect(typeof section.surahNameAr).toBe('string');
        expect(section.surahNameAr.startsWith('سورة ')).toBe(true);
        expect(['Meccan', 'Medinan']).toContain(section.revelationType);
        expect(typeof section.showBasmala).toBe('boolean');
        expect(section.ayahs.length).toBeGreaterThan(0);

        for (const ayah of section.ayahs) {
          expect(ayah.surahNumber).toBe(section.surahNumber);
          expect(ayah.ayahNumber).toBeGreaterThanOrEqual(1);
          expect(typeof ayah.textUthmani).toBe('string');
          expect(ayah.textUthmani.trim().length).toBeGreaterThan(0);
          if (ayah.hizbQuarter !== undefined) {
            expect(ayah.hizbQuarter).toBeGreaterThanOrEqual(1);
            expect(ayah.hizbQuarter).toBeLessThanOrEqual(240);
          }
          if (ayah.sajda !== undefined) {
            expect(typeof ayah.sajda).toBe('boolean');
          }
        }
      }
    }

    // Complete Quran has exactly 6,236 ayahs
    expect(grandTotalAyahs).toBe(6236);
  });

  it('starts Juz 1 with Al-Fatiha and Juz 30 with An-Naba', async () => {
    const juz1 = await loadJuzFromDiskOrFetch(1);
    const juz30 = await loadJuzFromDiskOrFetch(30);

    expect(juz1.sections[0].surahNumber).toBe(1);
    expect(juz1.sections[0].surahNameAr).toContain('الفاتحة');
    expect(juz30.sections[0].surahNumber).toBe(78);
    expect(juz30.sections[0].surahNameAr).toContain('النبأ');
  });

  it('matches boundary start and end ayahs for all 30 Juz against JUZ_METADATA', async () => {
    for (let i = 1; i <= 30; i++) {
      const juz = await loadJuzFromDiskOrFetch(i);
      const meta = JUZ_METADATA[i - 1];

      const firstSection = juz.sections[0];
      const firstAyah = firstSection.ayahs[0];
      const lastSection = juz.sections[juz.sections.length - 1];
      const lastAyah = lastSection.ayahs[lastSection.ayahs.length - 1];

      expect(firstAyah.ayahNumber).toBe(meta.startAyah);
      expect(firstSection.surahNameAr).toContain(meta.startSurahName);

      expect(lastAyah.ayahNumber).toBe(meta.endAyah);
      expect(lastSection.surahNameAr).toContain(meta.endSurahName);
    }
  });

  it('correctly handles showBasmala and strips duplicate Basmala prefix from Ayah 1 for Surah 2..114 except 9', async () => {
    const juz1 = await loadJuzFromDiskOrFetch(1);

    // Surah 1 (Al-Fatiha) has Basmala as Ayah 1 itself, so showBasmala is false
    const fatiha = juz1.sections.find((s) => s.surahNumber === 1);
    expect(fatiha).toBeDefined();
    expect(fatiha?.showBasmala).toBe(false);
    expect(fatiha?.ayahs[0].ayahNumber).toBe(1);
    expect(fatiha?.ayahs[0].textUthmani).toContain('بِسْمِ');

    // Surah 2 (Al-Baqarah) starts in Juz 1 at Ayah 1; should showBasmala: true, and ayah 1 should NOT start with Basmala
    const baqarah = juz1.sections.find((s) => s.surahNumber === 2);
    expect(baqarah).toBeDefined();
    expect(baqarah?.showBasmala).toBe(true);
    expect(baqarah?.ayahs[0].ayahNumber).toBe(1);
    // In Uthmani, Al-Baqarah ayah 1 is "الٓمٓ"
    expect(baqarah?.ayahs[0].textUthmani.trim()).toBe('الٓمٓ');

    // Juz 10 has Surah 9 (At-Tawbah), which has NO Basmala
    const juz10 = await loadJuzFromDiskOrFetch(10);
    const tawbah = juz10.sections.find((s) => s.surahNumber === 9);
    expect(tawbah).toBeDefined();
    expect(tawbah?.showBasmala).toBe(false);
  });

  it('fetches via browser window.fetch in production browser environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';

      const mockJuz: any = {
        juzNumber: 5,
        nameAr: 'الجزء الخامس',
        sections: [],
        totalAyahs: 124,
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockJuz,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await loadJuzFromDiskOrFetch(5);
      expect(mockFetch).toHaveBeenCalledWith('/quran/juz-5.json');
      expect(result.juzNumber).toBe(5);
      expect(result.totalAyahs).toBe(124);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  it('throws an error if browser fetch fails with HTTP error', async () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as any).NODE_ENV = 'production';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(loadJuzFromDiskOrFetch(5)).rejects.toThrow(/Failed to load juz 5/);
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
    }
  });

  it('throws error for invalid juz numbers', async () => {
    await expect(loadJuzFromDiskOrFetch(0)).rejects.toThrow();
    await expect(loadJuzFromDiskOrFetch(31)).rejects.toThrow();
    await expect(loadJuzFromDiskOrFetch(1.5)).rejects.toThrow();
  });
});
