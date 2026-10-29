import { describe, it, expect } from 'vitest';
import { JUZ_METADATA, createInitialJuzMap } from '../quran-meta';
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

  it('includes Yasser Al-Dosari, El-Minshawi, Abdulbasit, and Islam Sobhi and builds valid audio URLs', () => {
    const names = RECITERS.map((r) => r.nameAr).join(' ');
    expect(names).toContain('ياسر الدوسري');
    expect(names).toContain('المنشاوي');
    expect(names).toContain('عبد الباسط');
    expect(names).toContain('إسلام صبحي');
    expect(names).toContain('العفاسي');
    expect(names).toContain('الحصري');
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
