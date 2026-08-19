/**
 * CustomerLocationCard
 * Home Service destination workspace: the customer's booking-attached
 * address/coordinates (never live customer GPS -- this app has no customer
 * location sharing at all, see task privacy rule), a map preview, and
 * distance/ETA computed from the Barber's own broadcast position
 * (bookingTracking.location, written by tracking.service.ts) to that fixed
 * destination -- the exact same Haversine + range-ETA calculation the
 * customer's own tracking screen already uses, just anchored the other way.
 */
import { Linking, Pressable, Text, View } from 'react-native';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { MAP_CONFIG } from '@/config/map.config';
import { calculateDistanceKm, estimateEtaMinutes } from '@/features/location/utils/geo.utils';
import { buildNavigationUrl } from '../../utils/navigation-link';
import type { ServiceWorkspaceStage } from '../../utils/service-workspace-stage';

const ARRIVING_THRESHOLD_KM = 0.15;

interface CustomerLocationCardProps {
  stage: ServiceWorkspaceStage;
  destination?: { latitude: number; longitude: number };
  destinationAddress?: string;
  barberLocation?: { latitude: number; longitude: number };
  barberSpeed?: number | null;
  lastUpdateSecondsAgo: number | null;
  isStale: boolean;
}

export function CustomerLocationCard({
  stage,
  destination,
  destinationAddress,
  barberLocation,
  barberSpeed,
  lastUpdateSecondsAgo,
  isStale,
}: CustomerLocationCardProps) {
  const distanceKm =
    barberLocation && destination
      ? calculateDistanceKm(barberLocation.latitude, barberLocation.longitude, destination.latitude, destination.longitude)
      : null;
  const isArriving = distanceKm !== null && distanceKm <= ARRIVING_THRESHOLD_KM;
  const eta = distanceKm !== null && !isArriving ? estimateEtaMinutes(distanceKm, barberSpeed) : null;

  const lastUpdateText =
    lastUpdateSecondsAgo === null
      ? null
      : lastUpdateSecondsAgo < 60
      ? `Lokasi diperbarui ${lastUpdateSecondsAgo} detik lalu`
      : `Lokasi diperbarui ${Math.round(lastUpdateSecondsAgo / 60)} menit lalu`;

  const handleOpenNavigation = () => {
    if (!destination) return;
    const url = buildNavigationUrl(destination.latitude, destination.longitude, destinationAddress);
    if (url) void Linking.openURL(url);
  };

  const mapCenter = barberLocation || destination;
  const canTrack = stage === 'en_route' || stage === 'arrived';

  return (
    <View className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
      <View className="p-4 pb-3">
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">📍 Lokasi Pelanggan</Text>
        <Text className="text-sm font-semibold text-slate-900" numberOfLines={2}>
          {destinationAddress || 'Alamat tujuan belum diatur'}
        </Text>
      </View>

      {mapCenter ? (
        <View className="h-44 mx-4 rounded-xl overflow-hidden border border-slate-200">
          <Map mapStyle={MAP_CONFIG.styleUrl} style={{ flex: 1 }}>
            <Camera initialViewState={{ center: [mapCenter.longitude, mapCenter.latitude], zoom: 14 }} />
            {destination ? (
              <Marker id="customer-destination" lngLat={[destination.longitude, destination.latitude]}>
                <View className="h-5 w-5 rounded-full border-2 border-white bg-slate-900" />
              </Marker>
            ) : null}
            {canTrack && barberLocation ? (
              <Marker id="barber-position" lngLat={[barberLocation.longitude, barberLocation.latitude]}>
                <View className="h-5 w-5 rounded-full border-2 border-white bg-[#D2691E]" />
              </Marker>
            ) : null}
          </Map>
        </View>
      ) : null}

      <View className="p-4 pt-3 gap-2">
        {canTrack ? (
          isStale ? (
            <Text className="text-sm font-semibold text-amber-600">⏳ Menunggu pembaruan lokasi</Text>
          ) : distanceKm !== null ? (
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-extrabold text-slate-900">
                {isArriving ? '🎯 Barber hampir tiba' : `${distanceKm} km · Perkiraan`}
              </Text>
              {!isArriving && eta ? (
                <Text className="text-xs font-bold text-[#D2691E]">Tiba {eta.minMinutes}–{eta.maxMinutes} menit</Text>
              ) : null}
            </View>
          ) : (
            <Text className="text-sm text-slate-500">Menghitung jarak...</Text>
          )
        ) : (
          <Text className="text-xs text-slate-500">Mulai perjalanan untuk melihat jarak &amp; estimasi tiba.</Text>
        )}

        {canTrack && lastUpdateText ? <Text className="text-[11px] text-slate-400">{lastUpdateText}</Text> : null}

        {destination ? (
          <Pressable
            onPress={handleOpenNavigation}
            accessibilityRole="button"
            className="mt-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 items-center"
          >
            <Text className="text-xs font-bold text-slate-700">🧭 Buka Navigasi</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
