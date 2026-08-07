# Map Location & Foreground Order Tracking Guide (Batch 04)

## 1. Map Infrastructure & OpenFreeMap Configuration
- **Library**: `@maplibre/maplibre-react-native`
- **Style URL**: `https://tiles.openfreemap.org/styles/liberty` (Configured centrally in `src/config/map.config.ts`)
- **Attribution**: `© OpenMapTiles © OpenStreetMap contributors`
- **Requirement**: MapLibre native bindings require an Expo Development Build (`npx expo run:android` / `eas build`). Expo Go is NOT a supported native map execution environment.
- **Fallback**: Text address input and manual location selection remain 100% operational when map tiles fail to load or on Web.

## 2. Geospatial Barber Discovery & Geohash Bounds
- Barber documents store `location` (`latitude`, `longitude`) and `geohash`.
- Geohash queries (`geofire-common`) fetch matching candidate documents within bounding boxes.
- Candidates are filtered by exact Haversine distance (`calculateDistanceKm`) to remove false positives and sorted by proximity.
- Visibility rules strictly enforce `verificationStatus == 'approved'`, `status == 'active'`, `listingStatus == 'public'`, `acceptingNewBookings == true`, and service radius bounds.

## 3. Explicit Schedule Confirmation & Pure Slot Engine
- An unconfigured or unconfirmed Barber schedule (`barberSchedules/{barberId}`) returns `SCHEDULE_NOT_CONFIGURED`.
- UI displays: *"Barber belum mengatur jadwal layanan."*
- Default 09:00–20:00 slots are NEVER silently generated in production.
- Pure slot generation (`generateTimeSlots`) accounts for working hours, service duration, breaks, unavailable dates, active bookings, travel buffers, and Asia/Jakarta timezone.
- Transactional conflict guard (`runTransaction`) prevents double-booking concurrent requests.

## 4. Foreground Order Tracking Lifecycle
- **Scope**: Foreground-only tracking for home-service (`customer_home`) bookings in `accepted` status.
- **Lifecycle Endpoints**:
  - `POST /api/barber/bookings/tracking/start` -> Initializes tracking document (`trackingStatus: 'en_route'`, `isActive: true`)
  - `POST /api/barber/bookings/tracking/arrive` -> Updates `trackingStatus: 'arrived'`
  - `POST /api/barber/bookings/tracking/stop` -> Sets `trackingStatus: 'stopped'`, `isActive: false`
- **Updates**: `watchPositionAsync` emits GPS updates throttled to at most once per 5 seconds directly to `bookingTracking/{bookingId}`.
- **Customer View**: Customer listens in real-time via `onSnapshot` on `bookingTracking/{bookingId}`. If no update is received for > 2 minutes, a *"Sinyal Lemah"* stale data badge is displayed.
- **Limitations**: No background location tracking, no live turn-by-turn navigation, no fabricated ETAs, no continuous customer location tracking.

## 5. Development Build & Live Testing Procedure
1. Install Android SDK & NDK prerequisites.
2. Run development build: `npx expo run:android`.
3. Log in as Barber -> set shop location and confirm weekly schedule in Schedule tab.
4. Log in as Customer -> open Explore tab -> verify nearby Barbers sorted by distance.
5. Create a home-service booking for a confirmed Barber slot.
6. Accept booking as Barber -> tap "Berangkat ke Lokasi".
7. Open tracking screen as Customer (`/(customer)/booking/tracking/[bookingId]`) -> verify live marker & distance update.
