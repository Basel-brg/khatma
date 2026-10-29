import { Reciter } from '../types/khatma';

export const RECITERS: readonly Reciter[] = [
  {
    id: 'al-dosari',
    nameAr: 'ياسر الدوسري',
    styleAr: 'مرتل',
    folder: 'Yasser_Ad-Dussary_128kbps',
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

export function buildAyahAudioUrl(
  reciterFolder: string,
  surahNumber: number,
  ayahNumber: number
): string {
  const surahStr = String(surahNumber).padStart(3, '0');
  const ayahStr = String(ayahNumber).padStart(3, '0');
  return `https://everyayah.com/data/${reciterFolder}/${surahStr}${ayahStr}.mp3`;
}
