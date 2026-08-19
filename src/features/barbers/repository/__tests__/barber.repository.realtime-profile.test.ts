/**
 * Unit tests for barberRepository.subscribeToBarberProfile -- backs the
 * Barber Dashboard header (previously a one-shot getBarberProfile refetched
 * only on screen focus) and the chat room header's live barber name/photo.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { onSnapshotMock, docMock } = vi.hoisted(() => ({
  onSnapshotMock: vi.fn(),
  docMock: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
}));

vi.mock('firebase/firestore', () => ({
  doc: docMock,
  onSnapshot: onSnapshotMock,
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
  Timestamp: { now: () => 'MOCK_TIMESTAMP' },
}));

vi.mock('@/lib/firebase', () => ({ firestore: {} }));
vi.mock('@/lib/promise', () => ({ withTimeout: (p: Promise<unknown>) => p }));

import { barberRepository } from '../barber.repository';

describe('barberRepository.subscribeToBarberProfile', () => {
  beforeEach(() => {
    onSnapshotMock.mockReset();
    docMock.mockClear();
  });

  it('subscribes to barbers/{barberId} and forwards the mapped profile on every snapshot', () => {
    const onNext = vi.fn();
    let capturedCallback: (snap: any) => void = () => {};
    onSnapshotMock.mockImplementation((_ref: unknown, cb: (snap: any) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    barberRepository.subscribeToBarberProfile('barber-1', onNext);

    expect(docMock).toHaveBeenCalledWith({}, 'barbers', 'barber-1');

    capturedCallback({ exists: () => true, data: () => ({ name: 'Budi', displayName: 'Budi Barbershop' }) });
    expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Budi Barbershop' }));

    // A later edit (e.g. rename) re-fires the same listener with fresh data --
    // this is what makes the dashboard update live without a remount.
    capturedCallback({ exists: () => true, data: () => ({ name: 'Budi', displayName: 'Budi Barbershop Baru' }) });
    expect(onNext).toHaveBeenLastCalledWith(expect.objectContaining({ displayName: 'Budi Barbershop Baru' }));
  });

  it('forwards null when the document does not exist', () => {
    const onNext = vi.fn();
    let capturedCallback: (snap: any) => void = () => {};
    onSnapshotMock.mockImplementation((_ref: unknown, cb: (snap: any) => void) => {
      capturedCallback = cb;
      return () => {};
    });

    barberRepository.subscribeToBarberProfile('barber-missing', onNext);
    capturedCallback({ exists: () => false, data: () => undefined });

    expect(onNext).toHaveBeenCalledWith(null);
  });

  it('immediately calls back with null and never subscribes when barberId is empty', () => {
    const onNext = vi.fn();
    const unsubscribe = barberRepository.subscribeToBarberProfile('', onNext);

    expect(onNext).toHaveBeenCalledWith(null);
    expect(onSnapshotMock).not.toHaveBeenCalled();
    expect(() => unsubscribe()).not.toThrow();
  });
});
