import { Reciter } from '../types/khatma';

export const RECITERS: readonly Reciter[] = [
  {
    id: 'al-dosari',
    nameAr: 'ياسر الدوسري',
    styleAr: 'مرتل',
    folder: 'Yasser_Ad-Dussary_128kbps',
  },
  {
    id: 'ahmed-al-ajmi',
    nameAr: 'أحمد بن علي العجمي',
    styleAr: 'مرتل',
    folder: 'Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net',
  },
  {
    id: 'minshawy',
    nameAr: 'محمد صديق المنشاوي',
    styleAr: 'مرتل',
    folder: 'Minshawy_Murattal_128kbps',
  },
  {
    id: 'abdulbasit',
    nameAr: 'عبد الباسط عبد الصمد',
    styleAr: 'مرتل',
    folder: 'Abdul_Basit_Murattal_192kbps',
  },
  {
    id: 'islam-sobhi',
    nameAr: 'إسلام صبحي',
    styleAr: 'مرتل',
    folder: 'islam_sobhi',
  },
  {
    id: 'alafasy',
    nameAr: 'مشاري راشد العفاسي',
    styleAr: 'مرتل',
    folder: 'Alafasy_128kbps',
  },
  {
    id: 'hussary',
    nameAr: 'محمود خليل الحصري',
    styleAr: 'مرتل',
    folder: 'Husary_128kbps',
  },
];

const ALLOWED_FOLDERS = new Set(RECITERS.map((r) => r.folder));

export function buildAyahAudioUrl(
  reciterFolder: string,
  surahNumber: number,
  ayahNumber: number
): string {
  const safeFolder = ALLOWED_FOLDERS.has(reciterFolder)
    ? reciterFolder
    : 'Alafasy_128kbps';
  const safeSurah =
    Number.isInteger(surahNumber) && surahNumber >= 1 && surahNumber <= 114
      ? surahNumber
      : 1;
  const safeAyah =
    Number.isInteger(ayahNumber) && ayahNumber >= 1 && ayahNumber <= 286
      ? ayahNumber
      : 1;
  const surahStr = String(safeSurah).padStart(3, '0');
  const ayahStr = String(safeAyah).padStart(3, '0');
  return `https://everyayah.com/data/${safeFolder}/${surahStr}${ayahStr}.mp3`;
}
