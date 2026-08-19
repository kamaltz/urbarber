import { describe, expect, it, vi } from 'vitest';

// navigation-link.ts imports Platform from 'react-native' only to default an
// explicit `platform` parameter every test below always supplies -- but the
// import itself still executes eagerly, and the real package's entry file
// uses Flow syntax vitest's transform can't parse. A minimal mock avoids
// loading it; its value is never actually read by these tests.
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

import { buildNavigationUrl } from '../navigation-link';

describe('buildNavigationUrl', () => {
  it('1. returns null for invalid coordinates instead of a malformed URL', () => {
    expect(buildNavigationUrl(NaN, 107.6, undefined, 'android')).toBeNull();
    expect(buildNavigationUrl(-6.9, Infinity, undefined, 'android')).toBeNull();
  });

  it('2. builds an Android geo: URI with the coordinates', () => {
    expect(buildNavigationUrl(-6.9, 107.6, undefined, 'android')).toBe('geo:-6.9,107.6?q=-6.9,107.6');
  });

  it('3. includes the label in the Android query when provided', () => {
    const url = buildNavigationUrl(-6.9, 107.6, 'Jl. Merdeka', 'android');
    expect(url).toContain('geo:-6.9,107.6');
    expect(url).toContain(encodeURIComponent('Jl. Merdeka'));
  });

  it('4. builds an Apple Maps URL on iOS', () => {
    expect(buildNavigationUrl(-6.9, 107.6, undefined, 'ios')).toBe('https://maps.apple.com/?daddr=-6.9,107.6');
  });

  it('5. falls back to the universal Google Maps web URL on any other platform', () => {
    expect(buildNavigationUrl(-6.9, 107.6, undefined, 'web')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-6.9,107.6'
    );
  });

  it('6. never embeds an external API key in any variant', () => {
    const urls = [
      buildNavigationUrl(-6.9, 107.6, undefined, 'android'),
      buildNavigationUrl(-6.9, 107.6, undefined, 'ios'),
      buildNavigationUrl(-6.9, 107.6, undefined, 'web'),
    ];
    urls.forEach((url) => expect(url).not.toMatch(/key=/i));
  });
});
