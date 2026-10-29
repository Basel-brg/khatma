/**
 * Helper to fetch and cache Ayah timings for Islam Sobhi from MP3Quran API
 */

interface AyahTimingTuple {
  ayah: number;
  startMs: number;
  endMs: number;
}

const timingCache = new Map<number, AyahTimingTuple[]>();

export async function fetchIslamSobhiTimings(surahNumber: number): Promise<AyahTimingTuple[]> {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    return [];
  }
  if (timingCache.has(surahNumber)) {
    return timingCache.get(surahNumber)!;
  }

  try {
    const res = await fetch(
      `https://api-staging.mp3quran.net/v4/recitations/islam-sobhi/r1/surahs/${surahNumber}/ayah-timings`
    );
    if (!res.ok) {
      return [];
    }
    const json = await res.json();
    const rawAyahs = json?.data?.ayahs;
    if (Array.isArray(rawAyahs)) {
      const parsed: AyahTimingTuple[] = rawAyahs
        .filter(
          (tuple: unknown): tuple is [number, number, number] =>
            Array.isArray(tuple) &&
            tuple.length >= 3 &&
            typeof tuple[0] === 'number' &&
            Number.isFinite(tuple[0]) &&
            typeof tuple[1] === 'number' &&
            Number.isFinite(tuple[1]) &&
            tuple[1] >= 0 &&
            typeof tuple[2] === 'number' &&
            Number.isFinite(tuple[2]) &&
            tuple[2] >= tuple[1]
        )
        .map((tuple) => ({
          ayah: tuple[0],
          startMs: tuple[1],
          endMs: tuple[2],
        }));
      timingCache.set(surahNumber, parsed);
      return parsed;
    }
  } catch (err) {
    console.error('Failed to fetch Islam Sobhi ayah timings', err);
  }

  return [];
}

export async function getIslamSobhiAyahTime(
  surahNumber: number,
  ayahNumber: number
): Promise<{ startMs: number; endMs: number } | null> {
  const timings = await fetchIslamSobhiTimings(surahNumber);
  const match = timings.find((t) => t.ayah === ayahNumber);
  if (match) {
    return { startMs: match.startMs, endMs: match.endMs };
  }
  return null;
}
