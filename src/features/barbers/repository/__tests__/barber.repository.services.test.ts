/**
 * Unit Tests for BarberRepository.getBarberServices (Batch 10B-5E-R2)
 * Firestore persists barberServices/{documentId} with `active` and no `id`
 * field on the document data itself (the SDK carries the id separately). The
 * BarberService domain type -- and every consumer, including the barber's own
 * service-management screen (svc.serviceId/svc.isActive) and the customer
 * booking flow -- expects `serviceId`/`isActive`. Returning the raw
 * persistence shape left both undefined on every real document, producing a
 * missing React key, "Missing service ID" on toggle, and an unresolvable
 * serviceId reaching payment preparation. This locks in the normalization at
 * the repository boundary.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { FakeTimestamp, getDocsMock } = vi.hoisted(() => {
  class FakeTimestamp {
    constructor(private readonly date: Date) {}
    toDate() {
      return this.date;
    }
    static now() {
      return new FakeTimestamp(new Date());
    }
  }
  return { FakeTimestamp, getDocsMock: vi.fn() };
});

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn((..._args: unknown[]) => 'MOCK_QUERY'),
  where: vi.fn(),
  collection: vi.fn(),
  Timestamp: FakeTimestamp,
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/lib/promise', () => ({ withTimeout: (p: Promise<unknown>) => p }));

import { barberRepository } from '../barber.repository';

function mockSnapshot(docs: Array<{ id: string; data: Record<string, unknown> }>) {
  getDocsMock.mockResolvedValue({
    docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  });
}

describe('barberRepository.getBarberServices', () => {
  beforeEach(() => {
    getDocsMock.mockReset();
  });

  it('1. the real Firestore document id is mapped to serviceId', async () => {
    mockSnapshot([{ id: 'realDocId123', data: { name: 'Cukur', price: 25000, durationMinutes: 30, active: true } }]);

    const result = await barberRepository.getBarberServices('barber-1');

    expect(result[0].serviceId).toBe('realDocId123');
  });

  it('2. active: true maps to isActive: true', async () => {
    mockSnapshot([{ id: 'svc-1', data: { name: 'Cukur', price: 25000, durationMinutes: 30, active: true } }]);

    const result = await barberRepository.getBarberServices('barber-1');

    expect(result[0].isActive).toBe(true);
  });

  it('3. active: false maps to isActive: false', async () => {
    mockSnapshot([{ id: 'svc-1', data: { name: 'Cukur', price: 25000, durationMinutes: 30, active: false } }]);

    const result = await barberRepository.getBarberServices('barber-1');

    expect(result[0].isActive).toBe(false);
  });

  it('4. a document with no active field at all defaults to isActive: true (legacy documents)', async () => {
    mockSnapshot([{ id: 'svc-1', data: { name: 'Cukur', price: 25000, durationMinutes: 30 } }]);

    const result = await barberRepository.getBarberServices('barber-1');

    expect(result[0].isActive).toBe(true);
  });

  it('5. a Firestore Timestamp createdAt is normalized to an ISO string, not left as a Timestamp instance', async () => {
    const created = new FakeTimestamp(new Date('2026-08-01T00:00:00.000Z'));
    mockSnapshot([
      { id: 'svc-1', data: { name: 'Cukur', price: 25000, durationMinutes: 30, active: true, createdAt: created } },
    ]);

    const result = await barberRepository.getBarberServices('barber-1');

    expect(result[0].createdAt).toBe('2026-08-01T00:00:00.000Z');
  });

  it('6. the normalized serviceId is a real, non-empty string usable directly as the id argument for toggle/edit calls', async () => {
    mockSnapshot([{ id: 'realDocId123', data: { name: 'Cukur', price: 25000, durationMinutes: 30, active: true } }]);

    const [service] = await barberRepository.getBarberServices('barber-1');

    expect(typeof service.serviceId).toBe('string');
    expect(service.serviceId.length).toBeGreaterThan(0);
  });

  it('preserves name/description/price/durationMinutes unchanged', async () => {
    mockSnapshot([
      {
        id: 'svc-1',
        data: { name: 'Cukur', description: 'Potong rambut', price: 25000, durationMinutes: 30, active: true },
      },
    ]);

    const result = await barberRepository.getBarberServices('barber-1');

    expect(result[0]).toMatchObject({
      name: 'Cukur',
      description: 'Potong rambut',
      price: 25000,
      durationMinutes: 30,
    });
  });
});
