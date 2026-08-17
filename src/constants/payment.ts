/**
 * Payment Constants
 * Barber Tip Options. Home Service Fee and Application Fee are admin-configurable
 * and always server-computed (backend/vercel/src/payments/pricing-calculator.ts) --
 * never estimated or hardcoded client-side.
 */

export const TIP_OPTIONS = [
  { label: 'Tanpa Tip', value: 0 },
  { label: 'Rp5.000', value: 5000 },
  { label: 'Rp10.000', value: 10000 },
  { label: 'Rp20.000', value: 20000 },
];
