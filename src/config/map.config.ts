/**
 * Map Infrastructure Configuration Module
 * Centralized OpenFreeMap tile style, default viewport, search radii, and attribution.
 */

export const MAP_CONFIG = {
  // OpenFreeMap vector tile style URL
  styleUrl: 'https://tiles.openfreemap.org/styles/liberty',

  // Default fallback center location: Garut, West Java, Indonesia
  defaultViewport: {
    latitude: -7.2278,
    longitude: 107.9087,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
    zoom: 13,
  },

  // Discovery search radius settings
  defaultRadiusKm: 10,
  maxRadiusKm: 50,
  minRadiusKm: 1,

  // Map attribution string
  attribution: '© OpenMapTiles © OpenStreetMap contributors',
};
