import { describe, expect, it } from 'vitest';
import { isHomeServiceEligible } from '../home-service-eligibility';

describe('isHomeServiceEligible (client-side precheck mirroring backend isHomeServiceAllowedForBarber)', () => {
  it('true when acceptsHomeService is explicitly true', () => {
    expect(isHomeServiceEligible({ acceptsHomeService: true })).toBe(true);
  });

  it('false when acceptsHomeService is explicitly false', () => {
    expect(isHomeServiceEligible({ acceptsHomeService: false })).toBe(false);
  });

  it('legacy default: true when acceptsHomeService is missing', () => {
    expect(isHomeServiceEligible({})).toBe(true);
  });

  it('legacy default: true when the barber document itself is null/undefined', () => {
    expect(isHomeServiceEligible(null)).toBe(true);
    expect(isHomeServiceEligible(undefined)).toBe(true);
  });
});
