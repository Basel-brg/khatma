import { describe, it, expect } from 'vitest';
import { JUZ_METADATA, createInitialJuzMap, getSurahsInJuz } from '../quran-meta';
import { RECITERS, buildAyahAudioUrl } from '../reciters';

describe('quran-meta and reciters', () => {
  it('defines all 30 Juz metadata entries with Arabic names and boundaries', () => {
    expect(JUZ_METADATA).toHaveLength(30);
    expect(JUZ_METADATA[0].number).toBe(1);
    expect(JUZ_METADATA[29].number).toBe(30);
    expect(JUZ_METADATA[0].nameAr).toBe('الجزء الأول');
    expect(JUZ_METADATA[29].nameAr).toBe('الجزء الثلاثون');
    expect(JUZ_METADATA[0].startSurahName).toBe('الفاتحة');
    expect(JUZ_METADATA[0].startAyah).toBe(1);
    expect(JUZ_METADATA[29].endSurahName).toBe('الناس');
    expect(JUZ_METADATA[29].endAyah).toBe(6);
  });

  it('includes complete surah lists (surahNames) for every Juz', () => {
    for (const juz of JUZ_METADATA) {
      expect(juz.surahNames).toBeDefined();
      expect(juz.surahNames.length).toBeGreaterThan(0);
      expect(juz.surahNames[0]).toBe(juz.startSurahName);
      expect(juz.surahNames[juz.surahNames.length - 1]).toBe(juz.endSurahName);
    }

    // Check specific Juz
    expect(getSurahsInJuz(1)).toEqual(['الفاتحة', 'البقرة']);
    expect(getSurahsInJuz(2)).toEqual(['البقرة']);
    expect(getSurahsInJuz(3)).toEqual(['البقرة', 'آل عمران']);
    expect(getSurahsInJuz(30)).toHaveLength(37);
    expect(getSurahsInJuz(30)[0]).toBe('النبأ');
    expect(getSurahsInJuz(30)[36]).toBe('الناس');

    // Invalid juz number
    expect(getSurahsInJuz(99)).toEqual([]);
  });

  it('creates an initial 30-Juz map with all statuses set to available', () => {
    const map = createInitialJuzMap();
    expect(Object.keys(map)).toHaveLength(30);
    expect(map['1'].status).toBe('available');
    expect(map['1'].number).toBe(1);
    expect(map['1'].hideName).toBe(false);
    expect(map['1'].holderUid).toBeNull();
    expect(map['1'].reservedAt).toBeNull();
    expect(map['1'].completedAt).toBeNull();
    expect(map['30'].holderName).toBeNull();
    expect(map['30'].number).toBe(30);
  });

  it('includes Yasser Al-Dosari, El-Minshawi, Abdulbasit, Islam Sobhi, and Ahmed Al-Ajmi and builds valid audio URLs', () => {
    const names = RECITERS.map((r) => r.nameAr).join(' ');
    expect(names).toContain('ياسر الدوسري');
    expect(names).toContain('أحمد بن علي العجمي');
    expect(names).toContain('المنشاوي');
    expect(names).toContain('عبد الباسط');
    expect(names).toContain('إسلام صبحي');
    expect(names).toContain('العفاسي');
    expect(names).toContain('الحصري');
    expect(buildAyahAudioUrl('Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net', 1, 1)).toBe(
      'https://everyayah.com/data/Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net/001001.mp3'
    );
    expect(buildAyahAudioUrl('Yasser_Ad-Dussary_128kbps', 2, 255)).toBe(
      'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/002255.mp3'
    );
    expect(buildAyahAudioUrl('Alafasy_128kbps', 1, 1)).toBe(
      'https://everyayah.com/data/Alafasy_128kbps/001001.mp3'
    );
    expect(buildAyahAudioUrl('Husary_128kbps', 114, 6)).toBe(
      'https://everyayah.com/data/Husary_128kbps/114006.mp3'
    );
  });
});
