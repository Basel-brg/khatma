import { describe, it, expect, beforeEach } from 'vitest';
import {
  createKhatma,
  reserveJuz,
  completeJuz,
  unreserveJuz,
  getDeviceUid,
  subscribeToKhatma,
  getRecentKhatmas,
  recordVisitedKhatma,
  getSavedReaderProfile,
  saveReaderProfile,
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
    expect(doc.intention).toBe('لوجه الله تعالى');
    expect(doc.targetDate).toBe('2026-11-01');
    expect(doc.creatorUid).toBe('uid-1');
    expect(doc.completedCount).toBe(0);
    expect(doc.reservedCount).toBe(0);
    expect(Object.keys(doc.juzs)).toHaveLength(30);
    expect(doc.juzs['1'].status).toBe('available');
    expect(doc.juzs['30'].status).toBe('available');
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
    expect(updated.juzs['5'].holderUid).toBe('uid-2');
    expect(updated.juzs['5'].reservedAt).toBeTruthy();
    expect(updated.reservedCount).toBe(1);
    expect(updated.completedCount).toBe(0);
  });

  it('reserves a juz with real name when hideName is false and rejects empty readerName', async () => {
    const doc = await createKhatma(
      { title: 'ختمة النور', intention: 'شفاء مريض', targetDate: '2026-11-01' },
      'uid-1'
    );

    await expect(
      reserveJuz({
        khatmaId: doc.id,
        juzNumber: 2,
        readerName: '   ',
        hideName: false,
        uid: 'uid-3',
      })
    ).rejects.toThrow();

    const updated = await reserveJuz({
      khatmaId: doc.id,
      juzNumber: 2,
      readerName: 'عبدالله',
      hideName: false,
      uid: 'uid-3',
    });
    expect(updated.juzs['2'].status).toBe('reserved');
    expect(updated.juzs['2'].holderName).toBe('عبدالله');
    expect(updated.juzs['2'].hideName).toBe(false);
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

  it('allows the holder to unreserve their reserved juz', async () => {
    const doc = await createKhatma(
      { title: 'ختمة البركة', intention: 'توفيق', targetDate: '2026-11-01' },
      'uid-1'
    );
    await reserveJuz({
      khatmaId: doc.id,
      juzNumber: 10,
      readerName: 'مريم',
      hideName: false,
      uid: 'uid-maryam',
    });

    const unreserved = await unreserveJuz({
      khatmaId: doc.id,
      juzNumber: 10,
      uid: 'uid-maryam',
    });

    expect(unreserved.juzs['10'].status).toBe('available');
    expect(unreserved.juzs['10'].holderName).toBeNull();
    expect(unreserved.juzs['10'].holderUid).toBeNull();
    expect(unreserved.reservedCount).toBe(0);
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
    expect(completed.juzs['30'].completedAt).toBeTruthy();
    expect(completed.completedCount).toBe(1);
    expect(completed.reservedCount).toBe(0);
  });

  it('rejects completing an unreserved juz or a juz held by someone else', async () => {
    const doc = await createKhatma(
      { title: 'ختمة الهدى', intention: 'هداية', targetDate: '2026-11-01' },
      'uid-1'
    );
    // Completing an unreserved juz
    await expect(
      completeJuz({ khatmaId: doc.id, juzNumber: 12, uid: 'uid-omar' })
    ).rejects.toThrow();

    await reserveJuz({
      khatmaId: doc.id,
      juzNumber: 12,
      readerName: 'عمر',
      hideName: false,
      uid: 'uid-omar',
    });

    // Completing as another user
    await expect(
      completeJuz({ khatmaId: doc.id, juzNumber: 12, uid: 'uid-imposter' })
    ).rejects.toThrow();
  });

  it('generates and persists a stable device uid', async () => {
    const uid1 = await getDeviceUid();
    const uid2 = await getDeviceUid();
    expect(uid1).toBeTruthy();
    expect(uid1).toBe(uid2);
  });

  it('subscribes to khatma updates and delivers local updates synchronously', async () => {
    const doc = await createKhatma(
      { title: 'ختمة المتابعة', intention: 'نية', targetDate: '2026-11-01' },
      'uid-1'
    );

    const received: string[] = [];
    const unsubscribe = subscribeToKhatma(doc.id, (d) => {
      if (d) received.push(d.id);
    });

    expect(received).toContain(doc.id);

    await reserveJuz({
      khatmaId: doc.id,
      juzNumber: 7,
      readerName: 'ياسر',
      hideName: false,
      uid: 'uid-yasser',
    });

    expect(received.length).toBeGreaterThanOrEqual(2);
    unsubscribe();
  });

  it('provides pre-seeded demo khatma for demo-ramadan', async () => {
    let demoDoc: any = null;
    const unsub = subscribeToKhatma('demo-ramadan', (d) => {
      demoDoc = d;
    });
    expect(demoDoc).not.toBeNull();
    expect(demoDoc.id).toBe('demo-ramadan');
    expect(demoDoc.title).toContain('رمضان');
    expect(Object.keys(demoDoc.juzs)).toHaveLength(30);
    unsub();
  });

  it('records and returns visited recent khatmas', async () => {
    expect(getRecentKhatmas()).toEqual([]);

    recordVisitedKhatma({
      id: 'khatma-101',
      title: 'ختمة العائلة',
      targetDate: '2026-12-01',
    });

    const recent = getRecentKhatmas();
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe('khatma-101');
    expect(recent[0].title).toBe('ختمة العائلة');
    expect(recent[0].lastVisitedAt).toBeTruthy();
  });

  it('saves and retrieves reader profile', () => {
    expect(getSavedReaderProfile()).toEqual({ name: '', hideName: false });

    saveReaderProfile('فاطمة الزهراء', true);
    expect(getSavedReaderProfile()).toEqual({
      name: 'فاطمة الزهراء',
      hideName: true,
    });
  });
});
