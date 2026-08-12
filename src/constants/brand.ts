/**
 * Canonical URBarber Brand Color Tokens (Batch 11 Figma Alignment Pass).
 * Strictly derived from docs/figma/design-system.md.
 */
export const BRAND = {
  primary: '#363062',
  primarySoft: '#8683A1',
  primarySurface: '#EDEFFB',

  accent: '#D2691E',
  accentBright: '#F99417',

  background: '#FFFFFF',
  surface: '#F4F4F5',

  text: '#111827',
  textSecondary: '#64748B',

  border: '#E5E7EB',
  iconMuted: '#94A3B8',

  danger: '#F43F5E',
  rating: '#FACC15',
} as const;

export type BrandColor = keyof typeof BRAND;
