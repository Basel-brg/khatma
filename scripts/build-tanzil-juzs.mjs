#!/usr/bin/env node

/**
 * Script to fetch the Tanzil Uthmani Quran text and generate 30 static Juz JSON files
 * in public/quran/juz-1.json .. juz-30.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'quran');

const TANZIL_URL = 'https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true';
const ALQURAN_CLOUD_URL = 'https://api.alquran.cloud/v1/quran/quran-uthmani';

const BASMALA_PREFIX_REGEX = /^ب[ِّ]*سْمِ\s+ٱللَّهِ\s+ٱلرَّحْمَ[ـٰٰ]*نِ\s+ٱلرَّحِيمِ\s*/u;

export const JUZ_NAMES_AR = [
  'الجزء الأول',
  'الجزء الثاني',
  'الجزء الثالث',
  'الجزء الرابع',
  'الجزء الخامس',
  'الجزء السادس',
  'الجزء السابع',
  'الجزء الثامن',
  'الجزء التاسع',
  'الجزء العاشر',
  'الجزء الحادي عشر',
  'الجزء الثاني عشر',
  'الجزء الثالث عشر',
  'الجزء الرابع عشر',
  'الجزء الخامس عشر',
  'الجزء السادس عشر',
  'الجزء السابع عشر',
  'الجزء الثامن عشر',
  'الجزء التاسع عشر',
  'الجزء العشرون',
  'الجزء الحادي والعشرون',
  'الجزء الثاني والعشرون',
  'الجزء الثالث والعشرون',
  'الجزء الرابع والعشرون',
  'الجزء الخامس والعشرون',
  'الجزء السادس والعشرون',
  'الجزء السابع والعشرون',
  'الجزء الثامن والعشرون',
  'الجزء التاسع والعشرون',
  'الجزء الثلاثون',
];

export const JUZ_STARTS = [
  { juz: 1, surah: 1, ayah: 1 },
  { juz: 2, surah: 2, ayah: 142 },
  { juz: 3, surah: 2, ayah: 253 },
  { juz: 4, surah: 3, ayah: 93 },
  { juz: 5, surah: 4, ayah: 24 },
  { juz: 6, surah: 4, ayah: 148 },
  { juz: 7, surah: 5, ayah: 82 },
  { juz: 8, surah: 6, ayah: 111 },
  { juz: 9, surah: 7, ayah: 88 },
  { juz: 10, surah: 8, ayah: 41 },
  { juz: 11, surah: 9, ayah: 93 },
  { juz: 12, surah: 11, ayah: 6 },
  { juz: 13, surah: 12, ayah: 53 },
  { juz: 14, surah: 15, ayah: 1 },
  { juz: 15, surah: 17, ayah: 1 },
  { juz: 16, surah: 18, ayah: 75 },
  { juz: 17, surah: 21, ayah: 1 },
  { juz: 18, surah: 23, ayah: 1 },
  { juz: 19, surah: 25, ayah: 21 },
  { juz: 20, surah: 27, ayah: 56 },
  { juz: 21, surah: 29, ayah: 46 },
  { juz: 22, surah: 33, ayah: 31 },
  { juz: 23, surah: 36, ayah: 28 },
  { juz: 24, surah: 39, ayah: 32 },
  { juz: 25, surah: 41, ayah: 47 },
  { juz: 26, surah: 46, ayah: 1 },
  { juz: 27, surah: 51, ayah: 31 },
  { juz: 28, surah: 58, ayah: 1 },
  { juz: 29, surah: 67, ayah: 1 },
  { juz: 30, surah: 78, ayah: 1 },
];

export const SURAH_NAMES_AR = [
  'سورة الفاتحة', 'سورة البقرة', 'سورة آل عمران', 'سورة النساء', 'سورة المائدة',
  'سورة الأنعام', 'سورة الأعراف', 'سورة الأنفال', 'سورة التوبة', 'سورة يونس',
  'سورة هود', 'سورة يوسف', 'سورة الرعد', 'سورة إبراهيم', 'سورة الحجر',
  'سورة النحل', 'سورة الإسراء', 'سورة الكهف', 'سورة مريم', 'سورة طه',
  'سورة الأنبياء', 'سورة الحج', 'سورة المؤمنون', 'سورة النور', 'سورة الفرقان',
  'سورة الشعراء', 'سورة النمل', 'سورة القصص', 'سورة العنكبوت', 'سورة الروم',
  'سورة لقمان', 'سورة السجدة', 'سورة الأحزاب', 'سورة سبأ', 'سورة فاطر',
  'سورة يس', 'سورة الصافات', 'سورة ص', 'سورة الزمر', 'سورة غافر',
  'سورة فصلت', 'سورة الشورى', 'سورة الزخرف', 'سورة الدخان', 'سورة الجاثية',
  'سورة الأحقاف', 'سورة محمد', 'سورة الفتح', 'سورة الحجرات', 'سورة ق',
  'سورة الذاريات', 'سورة الطور', 'سورة النجم', 'سورة القمر', 'سورة الرحمن',
  'سورة الواقعة', 'سورة الحديد', 'سورة المجادلة', 'سورة الحشر', 'سورة الممتحنة',
  'سورة الصف', 'سورة الجمعة', 'سورة المنافقون', 'سورة التغابن', 'سورة الطلاق',
  'سورة التحريم', 'سورة الملك', 'سورة القلم', 'سورة الحاقة', 'سورة المعارج',
  'سورة نوح', 'سورة الجن', 'سورة المزمل', 'سورة المدثر', 'سورة القيامة',
  'سورة الإنسان', 'سورة المرسلات', 'سورة النبأ', 'سورة النازعات', 'سورة عبس',
  'سورة التكوير', 'سورة الانفطار', 'سورة المطففين', 'سورة الانشقاق', 'سورة البروج',
  'سورة الطارق', 'سورة الأعلى', 'سورة الغاشية', 'سورة الفجر', 'سورة البلد',
  'سورة الشمس', 'سورة الليل', 'سورة الضحى', 'سورة الشرح', 'سورة التين',
  'سورة العلق', 'سورة القدر', 'سورة البينة', 'سورة الزلزلة', 'سورة العاديات',
  'سورة القارعة', 'سورة التكاثر', 'سورة العصر', 'سورة الهمزة', 'سورة الفيل',
  'سورة قريش', 'سورة الماعون', 'سورة الكوثر', 'سورة الكافرون', 'سورة النصر',
  'سورة المسد', 'سورة الإخلاص', 'سورة الفلق', 'سورة الناس'
];

export const SURAH_REVELATIONS = [
  'Meccan', 'Medinan', 'Medinan', 'Medinan', 'Medinan', 'Meccan', 'Meccan', 'Medinan', 'Medinan', 'Meccan',
  'Meccan', 'Meccan', 'Medinan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan',
  'Meccan', 'Medinan', 'Meccan', 'Medinan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan',
  'Meccan', 'Meccan', 'Medinan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan',
  'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Medinan', 'Medinan', 'Medinan', 'Meccan',
  'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Medinan', 'Meccan', 'Medinan', 'Medinan', 'Medinan', 'Medinan',
  'Medinan', 'Medinan', 'Medinan', 'Medinan', 'Medinan', 'Medinan', 'Meccan', 'Meccan', 'Meccan', 'Meccan',
  'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Medinan', 'Meccan', 'Meccan', 'Meccan', 'Meccan',
  'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan',
  'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Medinan', 'Medinan', 'Meccan',
  'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Meccan', 'Medinan',
  'Meccan', 'Meccan', 'Meccan', 'Meccan'
];

// Exact 240 Hizb Quarters [surah, ayah]
export const HIZB_QUARTERS = [
  [1,1],[2,26],[2,44],[2,60],[2,75],[2,92],[2,106],[2,124],[2,142],[2,158],
  [2,177],[2,189],[2,203],[2,219],[2,233],[2,243],[2,253],[2,263],[2,272],[2,283],
  [3,15],[3,33],[3,52],[3,75],[3,93],[3,113],[3,133],[3,153],[3,171],[3,186],
  [4,1],[4,12],[4,24],[4,36],[4,58],[4,74],[4,88],[4,100],[4,114],[4,135],
  [4,148],[4,163],[5,1],[5,12],[5,27],[5,41],[5,51],[5,67],[5,82],[5,97],
  [5,109],[6,13],[6,36],[6,59],[6,74],[6,95],[6,111],[6,127],[6,141],[6,151],
  [7,1],[7,31],[7,47],[7,65],[7,88],[7,117],[7,142],[7,156],[7,171],[7,189],
  [8,1],[8,22],[8,41],[8,61],[9,1],[9,19],[9,34],[9,46],[9,60],[9,75],
  [9,93],[9,111],[9,122],[10,11],[10,26],[10,53],[10,71],[10,90],[11,6],[11,24],
  [11,41],[11,61],[11,84],[11,108],[12,7],[12,30],[12,53],[12,77],[12,101],[13,5],
  [13,19],[13,35],[14,10],[14,28],[15,1],[15,50],[16,1],[16,30],[16,51],[16,75],
  [16,90],[16,111],[17,1],[17,23],[17,50],[17,70],[17,99],[18,17],[18,32],[18,51],
  [18,75],[18,99],[19,22],[19,59],[20,1],[20,55],[20,83],[20,111],[21,1],[21,29],
  [21,51],[21,83],[22,1],[22,19],[22,38],[22,60],[23,1],[23,36],[23,75],[24,1],
  [24,21],[24,35],[24,53],[25,1],[25,21],[25,53],[26,1],[26,52],[26,111],[26,181],
  [27,1],[27,27],[27,56],[27,82],[28,12],[28,29],[28,51],[28,76],[29,1],[29,26],
  [29,46],[30,1],[30,31],[30,54],[31,22],[32,11],[33,1],[33,18],[33,31],[33,51],
  [33,60],[34,10],[34,24],[34,46],[35,15],[35,41],[36,28],[36,60],[37,22],[37,83],
  [37,145],[38,21],[38,52],[39,8],[39,32],[39,53],[40,1],[40,21],[40,41],[40,66],
  [41,9],[41,25],[41,47],[42,13],[42,27],[42,51],[43,24],[43,57],[44,17],[45,12],
  [46,1],[46,21],[47,10],[47,33],[48,18],[49,1],[49,14],[50,27],[51,31],[52,24],
  [53,26],[54,9],[55,1],[56,1],[56,75],[57,16],[58,1],[58,14],[59,11],[60,7],
  [62,1],[63,4],[65,1],[66,1],[67,1],[68,1],[69,1],[70,19],[72,1],[73,20],
  [75,1],[76,19],[78,1],[80,1],[82,1],[84,1],[87,1],[90,1],[94,1],[100,9]
];

// Fallback Sajda locations [surah, ayah] (15 sajdas)
export const SAJDAS = [
  [7, 206],
  [13, 15],
  [16, 50],
  [17, 109],
  [19, 58],
  [22, 18],
  [22, 77],
  [25, 60],
  [27, 26],
  [32, 15],
  [38, 24],
  [41, 38],
  [53, 62],
  [84, 21],
  [96, 19]
];

function getJuzForAyah(surah, ayah) {
  for (let i = JUZ_STARTS.length - 1; i >= 0; i--) {
    const start = JUZ_STARTS[i];
    if (surah > start.surah || (surah === start.surah && ayah >= start.ayah)) {
      return start.juz;
    }
  }
  return 1;
}

function getHizbQuarter(surah, ayah) {
  for (let i = HIZB_QUARTERS.length - 1; i >= 0; i--) {
    const [qSurah, qAyah] = HIZB_QUARTERS[i];
    if (surah > qSurah || (surah === qSurah && ayah >= qAyah)) {
      return i + 1;
    }
  }
  return 1;
}

function isSajda(surah, ayah) {
  return SAJDAS.some(([s, a]) => s === surah && a === ayah);
}

/**
 * Fetches the Tanzil Uthmani Quran lines, falling back to Alquran Cloud if unavailable.
 */
async function fetchQuranAyahs() {
  console.log('Attempting to fetch Uthmani Quran from Tanzil.net...');
  try {
    const res = await fetch(TANZIL_URL);
    if (!res.ok) {
      throw new Error(`Tanzil response error: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    const lines = text.split('\n').filter((l) => /^\d+\|\d+\|/.test(l));
    if (lines.length === 6236) {
      console.log(`Successfully fetched 6,236 ayahs from Tanzil.net`);
      return lines.map((line) => {
        const parts = line.split('|');
        return {
          surahNumber: parseInt(parts[0], 10),
          ayahNumber: parseInt(parts[1], 10),
          textUthmani: parts[2].trim(),
        };
      });
    }
    console.warn(`Tanzil returned unexpected line count (${lines.length}). Falling back to alquran.cloud...`);
  } catch (err) {
    console.warn('Failed to fetch from Tanzil.net:', err.message);
  }

  console.log('Falling back to alquran.cloud Uthmani edition...');
  const cloudRes = await fetch(ALQURAN_CLOUD_URL);
  if (!cloudRes.ok) {
    throw new Error(`Alquran Cloud response error: ${cloudRes.status} ${cloudRes.statusText}`);
  }
  const cloudJson = await cloudRes.json();
  const ayahs = [];
  for (const surah of cloudJson.data.surahs) {
    for (const ayah of surah.ayahs) {
      ayahs.push({
        surahNumber: surah.number,
        ayahNumber: ayah.numberInSurah,
        textUthmani: ayah.text.replace(/^\uFEFF/, '').trim(),
      });
    }
  }
  console.log(`Successfully fetched ${ayahs.length} ayahs from alquran.cloud`);
  return ayahs;
}

/**
 * Main build process
 */
async function main() {
  const ayahs = await fetchQuranAyahs();
  if (ayahs.length !== 6236) {
    throw new Error(`Expected 6236 ayahs, got ${ayahs.length}`);
  }

  // Ensure public/quran directory exists
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Map ayahs into juz buckets
  const juzAyahs = Array.from({ length: 30 }, () => []);
  for (const a of ayahs) {
    const juzNum = getJuzForAyah(a.surahNumber, a.ayahNumber);
    const quarter = getHizbQuarter(a.surahNumber, a.ayahNumber);
    const sajda = isSajda(a.surahNumber, a.ayahNumber);

    let text = a.textUthmani;
    // Strip leading duplicate Basmala from ayah 1 for Surah 2..114 except 9
    if (a.ayahNumber === 1 && a.surahNumber !== 1 && a.surahNumber !== 9) {
      text = text.replace(BASMALA_PREFIX_REGEX, '').trim();
    }

    juzAyahs[juzNum - 1].push({
      surahNumber: a.surahNumber,
      ayahNumber: a.ayahNumber,
      textUthmani: text,
      hizbQuarter: quarter,
      sajda: sajda,
    });
  }

  // Build each JuzContent object
  for (let j = 1; j <= 30; j++) {
    const ayahsInJuz = juzAyahs[j - 1];

    // Group ayahs into Surah sections
    const sections = [];
    let currentSurahNumber = -1;
    let currentSection = null;

    for (const ayah of ayahsInJuz) {
      if (ayah.surahNumber !== currentSurahNumber) {
        currentSurahNumber = ayah.surahNumber;
        const surahIndex = currentSurahNumber - 1;
        const showBasmala = ayah.ayahNumber === 1 && currentSurahNumber !== 1 && currentSurahNumber !== 9;

        currentSection = {
          surahNumber: currentSurahNumber,
          surahNameAr: SURAH_NAMES_AR[surahIndex],
          revelationType: SURAH_REVELATIONS[surahIndex],
          showBasmala,
          ayahs: [],
        };
        sections.push(currentSection);
      }
      currentSection.ayahs.push(ayah);
    }

    const juzContent = {
      juzNumber: j,
      nameAr: JUZ_NAMES_AR[j - 1],
      sections,
      totalAyahs: ayahsInJuz.length,
    };

    const outPath = path.join(OUTPUT_DIR, `juz-${j}.json`);
    fs.writeFileSync(outPath, JSON.stringify(juzContent, null, 2), 'utf-8');
  }

  console.log(`Successfully generated all 30 Juz JSON files in ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
