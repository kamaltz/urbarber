/**
 * Unit Tests for resolveActiveBookingServices (Batch 10B-5E / 10B-5E-R2)
 * Regression guard: booking/options.tsx previously selected from a hardcoded
 * MOCK_SERVICES array whose ids ('1', '2', ...) were never real
 * barberServices/{serviceId} documents. The customer could see a plausible
 * service name/price the whole way through the booking flow, but payment
 * preparation always failed SERVICE_NOT_FOUND because the forwarded serviceId
 * never pointed at a real document.
 *
 * R2: barberRepository.getBarberServices now normalizes Firestore's raw
 * persistence shape (id/active) into the canonical BarberService domain shape
 * (serviceId/isActive) at the repository boundary -- this resolver consumes
 * that domain shape, not the raw persistence shape.
 */
import { describe, expect, it } from 'vitest';
import { resolveActiveBookingServices } from '../resolve-active-services';

const REAL_SERVICE = {
  serviceId: 'aBc123RealDocId',
  name: 'Potongan Rambut Biasa',
  description: 'Potongan Rambut & Vitamin',
  price: 30000,
  durationMinutes: 30,
  isActive: true,
};

describe('resolveActiveBookingServices', () => {
  it('1. a real active service survives with its authoritative Firestore document id intact', () => {
    const result = resolveActiveBookingServices([REAL_SERVICE]);
    expect(result).toEqual([
      {
        id: 'aBc123RealDocId',
        name: 'Potongan Rambut Biasa',
        description: 'Potongan Rambut & Vitamin',
        price: 30000,
        durationMinutes: 30,
      },
    ]);
  });

  it('2. an explicitly inactive service is excluded', () => {
    const result = resolveActiveBookingServices([{ ...REAL_SERVICE, isActive: false }]);
    expect(result).toEqual([]);
  });

  it('3. a service missing its serviceId is excluded (never forwards a blank/placeholder id)', () => {
    const result = resolveActiveBookingServices([{ ...REAL_SERVICE, serviceId: undefined }]);
    expect(result).toEqual([]);
  });

  it('4. a service with an empty-string serviceId is excluded', () => {
    const result = resolveActiveBookingServices([{ ...REAL_SERVICE, serviceId: '' }]);
    expect(result).toEqual([]);
  });

  it('5. no isActive field present defaults to active (matches existing BarberService objects without the field)', () => {
    const { isActive, ...withoutActiveField } = REAL_SERVICE;
    const result = resolveActiveBookingServices([withoutActiveField]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('aBc123RealDocId');
  });

  it('6. non-array input (e.g. a failed fetch resolving to undefined) safely returns an empty list', () => {
    expect(resolveActiveBookingServices(undefined)).toEqual([]);
    expect(resolveActiveBookingServices(null)).toEqual([]);
  });

  it('7. mixed active/inactive/malformed entries are filtered independently', () => {
    const result = resolveActiveBookingServices([
      REAL_SERVICE,
      { ...REAL_SERVICE, serviceId: 'svc-2', isActive: false },
      { ...REAL_SERVICE, serviceId: undefined },
      { ...REAL_SERVICE, serviceId: 'svc-4', name: 'Pijat Ekstra', price: 15000 },
    ]);
    expect(result.map((s) => s.id)).toEqual(['aBc123RealDocId', 'svc-4']);
  });
});
