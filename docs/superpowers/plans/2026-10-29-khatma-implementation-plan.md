# Khatma (ختمة) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first RTL web application for organizing group Quran Khatmas with real-time 30-Juz' reservation cards, optional name privacy, an integrated Uthmani Quran reader powered by Tanzil.net data, and verse-by-verse audio recitation.

**Architecture:** A Next.js (App Router, TypeScript) application backed by Firebase (Cloud Firestore real-time `onSnapshot` listeners + Anonymous Auth) with a seamless local/offline fallback store (`localStorage` + `BroadcastChannel`) so the app runs out-of-the-box and upgrades automatically when Firebase credentials are supplied. Static Uthmani Quran text from Tanzil.net is pre-processed into 30 static JSON files (`public/quran/juz-1.json` .. `juz-30.json`) for instant zero-database-cost loading, paired with EveryAyah CDN audio streaming.

**Tech Stack:** Next.js 15 (App Router, TypeScript), Tailwind CSS v4, Firebase Web SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`), Vitest + React Testing Library for unit/integration tests, Tanzil.net Uthmani Quran dataset, EveryAyah CDN.

**Spec:** `docs/superpowers/specs/2026-10-29-khatma-design.md` and `PRODUCT.md`

## Global Constraints

- **RTL & Arabic-first:** Root HTML uses `dir="rtl"` and `lang="ar"`. Mobile-first viewport ergonomics (360px–430px primary target, responsive up to desktop).
- **Quran Source:** Use authentic Uthmani text from Tanzil.net (`https://tanzil.net/download/`), split into 30 static files (`public/quran/juz-1.json` through `public/quran/juz-30.json`).
- **Required Reciters:** Yasser Al-Dosari (`Yasser_Ad-Dussary_128kbps`), Mohamed Siddiq El-Minshawi (`Minshawy_Murattal_128kbps`), Abdulbasit Abdulsamad (`Abdul_Basit_Murattal_192kbps`), Islam Sobhi (`islam_sobhi`), Mishary Rashid Alafasy (`Alafasy_128kbps`), and Mahmoud Khalil Al-Hussary (`Husary_128kbps`).
- **Reservation Privacy:** Reserving a Juz' requires entering a non-empty name; when `hideName` is enabled, public display shows `"فاعل خير"` while the owner's device recognizes their own reservation.
- **Design & Motion Craft (`impeccable` + `emil-design-eng`):**
  - Pressable elements must include `:active` `transform: scale(0.97)` feedback (`100-160ms ease-out`).
  - Never animate from `scale(0)`; use `scale(0.95)` + `opacity: 0`.
  - Use custom easing curves (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`), never `ease-in` or `transition: all`, and keep UI transitions under `300ms`.
  - Respect `@media (prefers-reduced-motion: reduce)` and gate hover effects behind `@media (hover: hover) and (pointer: fine)`.
- **Firestore Security Rules:** Must be authored via the `firestore-rules-author` specialist subagent.

## Review Focus

1. **Concurrent reservation of the same Juz':** Attempting to reserve a Juz' whose status is already `"reserved"` or `"completed"` must reject with an error (`"هذا الجزء محجوز بالفعل"`) rather than overwriting the existing holder.
2. **Whitespace-only reader name:** Submitting `"   "` as the reader name when reserving a Juz' or creating a Khatma title must fail validation and prevent reservation/creation.
3. **Hidden name privacy (`hideName: true`):** When a user reserves with `name: "أحمد"` and `hideName: true`, the public `holderName` stored/returned for other users must be `"فاعل خير"`, while the owner's local metadata retains `"أحمد"`.
4. **Unauthorized release or completion:** Only the `holderUid` that reserved a Juz' can release (`unreserveJuz`) or complete (`completeJuz`) that Juz'.
5. **EveryAyah zero-padded audio URL formatting:** Surah `2`, Ayah `255` for reciter `Yasser_Ad-Dussary_128kbps` must format to `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/002255.mp3` (3-digit surah + 3-digit ayah).

---

### Task 1: Project Scaffolding, Domain Types, Metadata & Audio Utilities

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `next.config.ts`
- Create: `src/types/khatma.ts`
- Create: `src/lib/quran-meta.ts`
- Create: `src/lib/reciters.ts`
- Test: `src/lib/__tests__/quran-meta.test.ts`

**Interfaces:**
- Produces:
  - `JuzStatus = 'available' | 'reserved' | 'completed'`
  - `JuzReservation { number: number; status: JuzStatus; holderName: string | null; hideName: boolean; holderUid: string | null; reservedAt: string | null; completedAt: string | null }`
  - `KhatmaDocument { id: string; title: string; intention: string; targetDate: string; createdAt: string; creatorUid: string; completedCount: number; reservedCount: number; juzs: Record<string, JuzReservation> }`
  - `JuzMeta { number: number; nameAr: string; startSurahName: string; startAyah: number; endSurahName: string; endAyah: number }`
  - `JUZ_METADATA: readonly JuzMeta[]` (30 items)
  - `Reciter { id: string; nameAr: string; styleAr: string; folder: string }`
  - `RECITERS: readonly Reciter[]`
  - `buildAyahAudioUrl(reciterFolder: string, surahNumber: number, ayahNumber: number): string`
  - `createInitialJuzMap(): Record<string, JuzReservation>`

- [ ] **Step 1: Scaffold Next.js + TypeScript + Tailwind + Vitest project and write the failing test `src/lib/__tests__/quran-meta.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { JUZ_METADATA, createInitialJuzMap } from '../quran-meta';
import { RECITERS, buildAyahAudioUrl } from '../reciters';

describe('quran-meta and reciters', () => {
  it('defines all 30 Juz metadata entries with Arabic names and boundaries', () => {
    expect(JUZ_METADATA).toHaveLength(30);
    expect(JUZ_METADATA[0].number).toBe(1);
    expect(JUZ_METADATA[29].number).toBe(30);
  });

  it('creates an initial 30-Juz map with all statuses set to available', () => {
    const map = createInitialJuzMap();
    expect(Object.keys(map)).toHaveLength(30);
    expect(map['1'].status).toBe('available');
    expect(map['30'].holderName).toBeNull();
  });

  it('includes Yasser Al-Dosari, El-Minshawi, Abdulbasit, and Islam Sobhi and builds valid audio URLs', () => {
    const names = RECITERS.map((r) => r.nameAr).join(' ');
    expect(names).toContain('ياسر الدوسري');
    expect(names).toContain('المنشاوي');
    expect(names).toContain('عبد الباسط');
    expect(names).toContain('إسلام صبحي');
    expect(buildAyahAudioUrl('Yasser_Ad-Dussary_128kbps', 2, 255)).toBe(
      'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/002255.mp3'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/quran-meta.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Implement `src/types/khatma.ts`, `src/lib/quran-meta.ts`, and `src/lib/reciters.ts`**

Implement the exact types and functions listed in Interfaces above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/quran-meta.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git init && git add . && git commit -m "feat: scaffold project and add khatma types, juz metadata, and reciters"
```

---

### Task 2: Tanzil.net Uthmani Quran Dataset Builder & 30-Juz Static JSON Files

**Files:**
- Create: `scripts/build-tanzil-juzs.mjs`
- Create: `public/quran/juz-1.json` .. `public/quran/juz-30.json`
- Create: `src/lib/quran-loader.ts`
- Test: `src/lib/__tests__/quran-loader.test.ts`

**Interfaces:**
- Consumes: `JUZ_METADATA` from `src/lib/quran-meta.ts`
- Produces:
  - `JuzAyah { surahNumber: number; ayahNumber: number; textUthmani: string; hizbQuarter?: number; sajda?: boolean }`
  - `JuzSurahSection { surahNumber: number; surahNameAr: string; revelationType: 'Meccan' | 'Medinan'; showBasmala: boolean; ayahs: JuzAyah[] }`
  - `JuzContent { juzNumber: number; nameAr: string; sections: JuzSurahSection[]; totalAyahs: number }`
  - `loadJuzFromDiskOrFetch(juzNumber: number): Promise<JuzContent>`

- [ ] **Step 1: Write the failing test `src/lib/__tests__/quran-loader.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Tanzil 30 Juz static files', () => {
  it('has all 30 Juz JSON files in public/quran with valid Uthmani ayahs', () => {
    for (let i = 1; i <= 30; i++) {
      const p = path.join(process.cwd(), 'public', 'quran', `juz-${i}.json`);
      expect(fs.existsSync(p)).toBe(true);
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      expect(data.juzNumber).toBe(i);
      expect(data.sections.length).toBeGreaterThan(0);
      expect(data.totalAyahs).toBeGreaterThan(0);
    }
  });

  it('starts Juz 1 with Al-Fatiha and Juz 30 with An-Naba', () => {
    const juz1 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/quran/juz-1.json'), 'utf8'));
    const juz30 = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/quran/juz-30.json'), 'utf8'));
    expect(juz1.sections[0].surahNumber).toBe(1);
    expect(juz30.sections[0].surahNumber).toBe(78);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/quran-loader.test.ts`
Expected: FAIL because `public/quran/juz-1.json` does not exist

- [ ] **Step 3: Implement `scripts/build-tanzil-juzs.mjs` and `src/lib/quran-loader.ts`, then generate `public/quran/juz-1.json` .. `juz-30.json`**

Fetch Tanzil Uthmani Quran text and standard Juz/Surah boundaries, strip duplicate leading Basmala on verse 1 of Surahs 2..114 (except Al-Fatiha and At-Tawbah) so the reader can render a dedicated ornamental Basmala banner cleanly, and write all 30 JSON files.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/quran-loader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-tanzil-juzs.mjs src/lib/quran-loader.ts src/lib/__tests__/quran-loader.test.ts public/quran/
git commit -m "feat: add Tanzil Uthmani 30-Juz static JSON dataset and loader"
```

---

### Task 3: Khatma Data Store (Firebase Firestore + Real-Time Local Fallback) & Security Rules

**Files:**
- Create: `src/lib/firebase.ts`
- Create: `src/lib/khatma-service.ts`
- Create: `firestore.rules` (via `firestore-rules-author` subagent)
- Test: `src/lib/__tests__/khatma-service.test.ts`

**Interfaces:**
- Consumes: `KhatmaDocument`, `JuzReservation` from `src/types/khatma.ts`; `createInitialJuzMap` from `src/lib/quran-meta.ts`
- Produces:
  - `getDeviceUid(): Promise<string>`
  - `createKhatma(input: { title: string; intention: string; targetDate: string }, creatorUid: string): Promise<KhatmaDocument>`
  - `subscribeToKhatma(khatmaId: string, onData: (doc: KhatmaDocument | null) => void): () => void`
  - `reserveJuz(params: { khatmaId: string; juzNumber: number; readerName: string; hideName: boolean; uid: string }): Promise<KhatmaDocument>`
  - `completeJuz(params: { khatmaId: string; juzNumber: number; uid: string }): Promise<KhatmaDocument>`
  - `unreserveJuz(params: { khatmaId: string; juzNumber: number; uid: string }): Promise<KhatmaDocument>`
  - `getRecentKhatmas(): Array<{ id: string; title: string; targetDate: string; lastVisitedAt: string }>`

- [ ] **Step 1: Write the failing test `src/lib/__tests__/khatma-service.test.ts` covering creation, reservation, privacy masking, concurrency guard, and ownership guard**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createKhatma,
  reserveJuz,
  completeJuz,
  unreserveJuz,
  resetLocalKhatmaStoreForTests,
} from '../khatma-service';

describe('khatma-service', () => {
  beforeEach(() => {
    resetLocalKhatmaStoreForTests();
  });

  it('creates a khatma with 30 available juzs and rejects whitespace-only titles', async () => {
    await expect(
      createKhatma({ title: '   ', intention: 'نية', targetDate: '2026-11-01' }, 'uid-1')
    ).rejects.toThrow();

    const doc = await createKhatma(
      { title: 'ختمة الجمعة', intention: 'لوجه الله تعالى', targetDate: '2026-11-01' },
      'uid-1'
    );
    expect(doc.title).toBe('ختمة الجمعة');
    expect(doc.completedCount).toBe(0);
    expect(doc.reservedCount).toBe(0);
    expect(doc.juzs['1'].status).toBe('available');
  });

  it('reserves a juz and masks holderName as "فاعل خير" when hideName is true', async () => {
    const doc = await createKhatma(
      { title: 'ختمة النور', intention: 'شفاء مريض', targetDate: '2026-11-01' },
      'uid-1'
    );
    const updated = await reserveJuz({
      khatmaId: doc.id,
      juzNumber: 5,
      readerName: 'أحمد محمد',
      hideName: true,
      uid: 'uid-2',
    });
    expect(updated.juzs['5'].status).toBe('reserved');
    expect(updated.juzs['5'].holderName).toBe('فاعل خير');
    expect(updated.juzs['5'].hideName).toBe(true);
    expect(updated.reservedCount).toBe(1);
  });

  it('prevents a second user from reserving an already-reserved juz or releasing another user’s juz', async () => {
    const doc = await createKhatma(
      { title: 'ختمة الأبرار', intention: 'رحمة للوالدين', targetDate: '2026-11-01' },
      'uid-1'
    );
    await reserveJuz({
      khatmaId: doc.id,
      juzNumber: 1,
      readerName: 'سارة',
      hideName: false,
      uid: 'uid-sara',
    });

    await expect(
      reserveJuz({
        khatmaId: doc.id,
        juzNumber: 1,
        readerName: 'خالد',
        hideName: false,
        uid: 'uid-khaled',
      })
    ).rejects.toThrow('هذا الجزء محجوز بالفعل');

    await expect(
      unreserveJuz({ khatmaId: doc.id, juzNumber: 1, uid: 'uid-khaled' })
    ).rejects.toThrow();
  });

  it('marks a reserved juz as completed and updates counts', async () => {
    const doc = await createKhatma(
      { title: 'ختمة الفجر', intention: 'بركة', targetDate: '2026-11-01' },
      'uid-1'
    );
    await reserveJuz({
      khatmaId: doc.id,
      juzNumber: 30,
      readerName: 'عمر',
      hideName: false,
      uid: 'uid-omar',
    });
    const completed = await completeJuz({
      khatmaId: doc.id,
      juzNumber: 30,
      uid: 'uid-omar',
    });
    expect(completed.juzs['30'].status).toBe('completed');
    expect(completed.completedCount).toBe(1);
    expect(completed.reservedCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/khatma-service.test.ts`
Expected: FAIL with module not found

- [ ] **Step 3: Implement `src/lib/firebase.ts`, `src/lib/khatma-service.ts`, and invoke `firestore-rules-author` subagent to create `firestore.rules`**

Implement atomic Firestore transactions when `NEXT_PUBLIC_FIREBASE_PROJECT_ID` is configured, and an isomorphic local store (`localStorage` + `BroadcastChannel` for real-time cross-tab sync + pre-seeded demo Khatma support) when running without external credentials. Delegate `firestore.rules` creation to `firestore-rules-author`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/khatma-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/firebase.ts src/lib/khatma-service.ts src/lib/__tests__/khatma-service.test.ts firestore.rules
git commit -m "feat: add Firebase Firestore khatma service with real-time local fallback and security rules"
```

---

### Task 4: Visual Direction (`impeccable` + `emil-design-eng`), Design System & Home Screen (`/`)

**Files:**
- Create: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/app/page.tsx`
- Create: `src/components/CreateKhatmaSheet.tsx`
- Create: `DESIGN.md`

**Interfaces:**
- Consumes: `createKhatma`, `getDeviceUid`, `getRecentKhatmas` from `src/lib/khatma-service.ts`
- Produces:
  - Root Arabic RTL layout with authentic typography (Amiri Quran / Scheherazade New for Quranic script, IBM Plex Sans Arabic / Readex Pro for crisp UI controls, tabular numerals).
  - Home screen (`src/app/page.tsx`) with instant Khatma creation form (title, intention, target date), recent Khatmas list, and a ready-to-explore sample Khatma.

- [ ] **Step 1: Run `impeccable` concept-seed and establish the visual direction & surface brief**

Run `/Users/macbook/.gemini/config/skills/impeccable/scripts/impeccable concept-seed --scope direction --mode operate` and record the surface brief and `DESIGN.md` tokens, paired with `emil-design-eng` motion variables (`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`, `:active` `scale(0.97)`).

- [ ] **Step 2: Implement `src/app/layout.tsx`, `src/app/globals.css`, and `src/app/page.tsx`**

Build the mobile-first landing/creation experience with tactile button states, stagger entry transitions, and recent Khatmas navigation.

- [ ] **Step 3: Verify build and tests**

Run: `npx vitest run`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/ src/components/ DESIGN.md
git commit -m "feat: implement design system and mobile-first Khatma creation home screen"
```

---

### Task 5: Khatma Page (`/khatma/[id]`), 30-Juz Grid, Reservation Bottom Sheet & Quran Reader with Audio

**Files:**
- Create: `src/app/khatma/[id]/page.tsx`
- Create: `src/components/JuzCardGrid.tsx`
- Create: `src/components/ReserveJuzSheet.tsx`
- Create: `src/components/QuranReaderModal.tsx`
- Create: `src/components/AudioReciterBar.tsx`
- Test: `src/components/__tests__/khatma-flow.test.tsx`

**Interfaces:**
- Consumes:
  - `subscribeToKhatma`, `reserveJuz`, `completeJuz`, `unreserveJuz`, `getDeviceUid` from `src/lib/khatma-service.ts`
  - `JUZ_METADATA` from `src/lib/quran-meta.ts`
  - `RECITERS`, `buildAyahAudioUrl` from `src/lib/reciters.ts`
- Produces:
  - `/khatma/[id]` page displaying Khatma header (title, intention, reading date, share link button, live progress bar, active user Juz' banner, and 30 Juz' cards).
  - `ReserveJuzSheet`: mobile bottom sheet with velocity-aware drag dismissal, required name input, `hideName` privacy toggle, and instant transition into the Quran reader upon confirmation.
  - `QuranReaderModal` & `AudioReciterBar`: Uthmani Quran text from `/quran/juz-[n].json`, font size controls (`A+` / `A-`), automatic reading progress & ayah bookmarking in `localStorage`, continuous verse-by-verse audio playback for the 5 reciters (Yasser Al-Dosari, El-Minshawi, Abdulbasit, Alafasy, Al-Hussary) with active-ayah highlighting, "إلغاء الحجز" button, and "أتممت قراءة الجزء ولله الحمد" completion button.

- [ ] **Step 1: Write the failing component integration test `src/components/__tests__/khatma-flow.test.tsx`**

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { createKhatma, resetLocalKhatmaStoreForTests } from '../../lib/khatma-service';
import KhatmaPageClient from '../KhatmaPageClient';

describe('Khatma 30-Juz flow', () => {
  beforeEach(() => {
    resetLocalKhatmaStoreForTests();
  });

  it('renders khatma header info, 30 juz cards, reserves a juz, opens Quran reader, and marks it completed', async () => {
    const doc = await createKhatma(
      { title: 'ختمة شهر رمضان', intention: 'في ثواب الوالدين', targetDate: '2026-11-15' },
      'uid-test'
    );

    render(<KhatmaPageClient khatmaId={doc.id} initialUid="uid-test" />);

    expect(await screen.findByText('ختمة شهر رمضان')).toBeTruthy();
    expect(screen.getByText('في ثواب الوالدين')).toBeTruthy();
    expect(screen.getByText('الجزء الأول')).toBeTruthy();
    expect(screen.getByText('الجزء الثلاثون')).toBeTruthy();

    fireEvent.click(screen.getByTestId('juz-card-1'));

    const nameInput = await screen.findByLabelText(/الاسم/i);
    fireEvent.change(nameInput, { target: { value: 'عبدالله' } });
    fireEvent.click(screen.getByTestId('confirm-reserve-btn'));

    expect(await screen.findByTestId('quran-reader-modal')).toBeTruthy();
    fireEvent.click(screen.getByTestId('complete-juz-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('juz-card-1').textContent).toContain('مكتمل');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/__tests__/khatma-flow.test.tsx`
Expected: FAIL with module not found

- [ ] **Step 3: Implement `KhatmaPageClient`, `JuzCardGrid`, `ReserveJuzSheet`, `QuranReaderModal`, `AudioReciterBar`, and `src/app/khatma/[id]/page.tsx`**

Follow all `emil-design-eng` principles: `:active` `scale(0.97)` on cards and buttons, custom `cubic-bezier(0.32, 0.72, 0, 1)` drawer transitions, velocity-based swipe dismissal on mobile bottom sheets, hardware-accelerated `transform` & `opacity` animations, and smooth verse highlighting during recitation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/__tests__/khatma-flow.test.tsx`
Expected: PASS

- [ ] **Step 5: Run production build and `impeccable detect` verification, then commit**

```bash
npm run build
/Users/macbook/.gemini/config/skills/impeccable/scripts/impeccable detect --json src/
git add .
git commit -m "feat: complete Khatma 30-Juz view, reservation sheet, Uthmani reader, and audio player"
```
