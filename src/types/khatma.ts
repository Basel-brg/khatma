export type JuzStatus = 'available' | 'reserved' | 'completed';

export interface JuzReservation {
  number: number;
  status: JuzStatus;
  holderName: string | null;
  hideName: boolean;
  holderUid: string | null;
  reservedAt: string | null;
  completedAt: string | null;
}

export interface KhatmaDocument {
  id: string;
  title: string;
  intention: string;
  targetDate: string;
  createdAt: string;
  creatorUid: string;
  completedCount: number;
  reservedCount: number;
  juzs: Record<string, JuzReservation>;
}

export interface JuzMeta {
  number: number;
  nameAr: string;
  startSurahName: string;
  startAyah: number;
  endSurahName: string;
  endAyah: number;
  surahNames: readonly string[];
}

export interface Reciter {
  id: string;
  nameAr: string;
  styleAr: string;
  folder: string;
}
