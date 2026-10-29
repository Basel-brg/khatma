import { describe, it, expect } from 'vitest';
import { getIslamSobhiAyahTime, fetchIslamSobhiTimings } from '../islam-sobhi-timings';

describe('Islam Sobhi timing service', () => {
  it('fetches and returns ayah timings for Surah 1', async () => {
    const timings = await fetchIslamSobhiTimings(1);
    expect(Array.isArray(timings)).toBe(true);
    if (timings.length > 0) {
      expect(timings[0].ayah).toBe(1);
      expect(typeof timings[0].startMs).toBe('number');
      expect(typeof timings[0].endMs).toBe('number');
    }
  });

  it('gets exact start and end time for Ayah 2 of Surah 1', async () => {
    const time = await getIslamSobhiAyahTime(1, 2);
    if (time) {
      expect(time.startMs).toBeGreaterThan(0);
      expect(time.endMs).toBeGreaterThan(time.startMs);
    }
  });
});
