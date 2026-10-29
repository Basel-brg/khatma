export interface JuzAyah {
  surahNumber: number;
  ayahNumber: number;
  textUthmani: string;
  hizbQuarter?: number;
  sajda?: boolean;
}

export interface JuzSurahSection {
  surahNumber: number;
  surahNameAr: string;
  revelationType: 'Meccan' | 'Medinan';
  showBasmala: boolean;
  ayahs: JuzAyah[];
}

export interface JuzContent {
  juzNumber: number;
  nameAr: string;
  sections: JuzSurahSection[];
  totalAyahs: number;
}

/**
 * Loads a Juz content JSON file:
 * - In browser: fetches `/quran/juz-${juzNumber}.json`
 * - In Node/test environments: reads from `public/quran/juz-${juzNumber}.json`
 */
export async function loadJuzFromDiskOrFetch(juzNumber: number): Promise<JuzContent> {
  if (!Number.isInteger(juzNumber) || juzNumber < 1 || juzNumber > 30) {
    throw new Error(`Invalid juz number: ${juzNumber}. Expected an integer between 1 and 30.`);
  }

  const isTestOrNode =
    typeof process !== 'undefined' &&
    (process.env?.NODE_ENV === 'test' || typeof window === 'undefined');

  if (!isTestOrNode && typeof window !== 'undefined' && typeof window.fetch === 'function') {
    const res = await window.fetch(`/quran/juz-${juzNumber}.json`);
    if (!res.ok) {
      throw new Error(`Failed to load juz ${juzNumber}: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as JuzContent;
  }

  // Node/test environment: read directly from public/quran
  const fsModule = 'node:fs/promises';
  const pathModule = 'node:path';
  const fs = await import(/* webpackIgnore: true */ fsModule);
  const path = await import(/* webpackIgnore: true */ pathModule);
  const filePath = path.join(process.cwd(), 'public', 'quran', `juz-${juzNumber}.json`);
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as JuzContent;
}
