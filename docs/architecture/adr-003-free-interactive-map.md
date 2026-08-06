# ADR-003: Free-First Interactive Booking Location Picker (E-01)

## Context
Home service appointments require accurate delivery address details. While manual text address entry is simple and robust, an interactive map location picker enhances user convenience by allowing customers to place a pin on a map canvas.

## Decision
We classify **Interactive Booking Location Picker (E-01)** as a **Preferred Core Enhancement**.

### Architecture Specifications
1. **Free-First Technology Stack**:
   - `MapLibre React Native` (`@maplibre/maplibre-react-native`): Open-source vector map rendering library.
   - `OpenFreeMap`: Free open vector map style tiles (`https://tiles.openfreemap.org/styles/liberty`).
   - `expo-location`: Native Expo library for device GPS coordinate acquisition.
2. **Development Build Requirement**: MapLibre React Native contains native Android/iOS C++ bindings. It requires an Expo development build (`npx expo run:android` / `eas build`) and **cannot be run inside standard Expo Go**.
3. **Mandatory Fallback Strategy**: Manual text address entry in `src/app/(customer)/booking/location.tsx` remains the authoritative, required fallback. The booking flow MUST remain 100% functional when location permission is denied, GPS is disabled, tile servers fail, or the device is offline.
4. **Canonical Booking Fields**:
   - `address`: string (Required manual address text)
   - `latitude`: number | undefined (Optional coordinate)
   - `longitude`: number | undefined (Optional coordinate)
   - `locationSource`: `"manual"` | `"current_location"` | `"map_pin"` (Optional location source tracking)
5. **Attribution**: Map UI must display required OpenFreeMap & OpenStreetMap copyright attribution text.

## Alternatives Considered
- **Google Maps API**: Rejected as the primary strategy to prevent mandatory billing dependencies and API quota limits.
- **Public OpenStreetMap Raster Tile Endpoint (`tile.openstreetmap.org`)**: Rejected as an unrestricted production tile backend due to strict OSM Foundation tile usage policy restrictions.

## Consequences
- Validation of E-01 requires compiling a custom Android APK or running `npx expo run:android`.
- Core application tests and Expo Go development continue using manual text address entry.
- Optional coordinates (`latitude`, `longitude`) preserve 100% backward compatibility with existing booking records.

## Security Considerations
- Application never tracks location in the background.
- Location coordinates are only requested during active booking creation upon explicit user interaction.

## Validation Gate
- Proof-of-concept development build compiled via `npx expo run:android` demonstrating map rendering, pin placement, coordinate selection, and manual address fallback when location permission is denied.

## Current Status
- **Accepted & Scheduled** (Proof-of-concept targeted for Batch 06).
