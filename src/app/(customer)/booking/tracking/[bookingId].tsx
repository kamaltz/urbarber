/**
 * Live Order Tracking Screen (Customer View)
 * Displays real-time location updates of the assigned Barber for active home-service bookings.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { Loading } from '@/components/ui/Loading';
import { Booking, BookingTracking } from '@/features/bookings/types/booking';
import { bookingRepository } from '@/features/bookings/repository/booking.repository';
import { trackingService, STALE_LOCATION_THRESHOLD_MS } from '@/features/location/services/tracking.service';
import { calculateDistanceKm, estimateEtaMinutes } from '@/features/location/utils/geo.utils';
import { MAP_CONFIG } from '@/config/map.config';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';

const ARRIVING_THRESHOLD_KM = 0.15; // "Barber hampir tiba" below this distance

export default function CustomerTrackingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [tracking, setTracking] = useState<BookingTracking | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Fetch initial booking details
  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!bookingId) return;
      setLoading(true);
      const bData = await bookingRepository.getBookingDetail(bookingId);
      if (active) {
        setBooking(bData);
        setLoading(false);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, [bookingId]);

  // 2. Real-time Firestore listener for booking tracking updates
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = trackingService.subscribeToTracking(bookingId, (data, stale) => {
      setTracking(data);
      setIsStale(stale);
    });

    return () => {
      unsubscribe();
    };
  }, [bookingId]);

  // 3. Tick every few seconds so "Lokasi diperbarui X detik lalu" stays live
  // between Firestore updates, instead of only refreshing on the next write.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(customer)/home');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Loading />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-lg font-semibold text-slate-900">
            Pesanan tidak ditemukan
          </Text>
          <AppButton label="Kembali" onPress={handleBack} className="mt-6 h-12 rounded-lg px-8" />
        </View>
      </SafeAreaView>
    );
  }

  // Straight-line distance + a labeled-as-estimate ETA range. No routing API
  // exists in this app, so distance is always Haversine and ETA is always a
  // range, never a precise number (see estimateEtaMinutes).
  const distanceKm =
    tracking?.location?.latitude && booking.serviceLocation?.latitude
      ? calculateDistanceKm(
          tracking.location.latitude,
          tracking.location.longitude,
          booking.serviceLocation.latitude,
          booking.serviceLocation.longitude
        )
      : null;
  const distanceText = distanceKm !== null ? `~${distanceKm} km (garis lurus)` : 'Menghitung jarak...';
  const isArriving = distanceKm !== null && distanceKm <= ARRIVING_THRESHOLD_KM;
  const eta = distanceKm !== null && !isArriving ? estimateEtaMinutes(distanceKm, tracking?.speed) : null;

  const trackingStatus = tracking?.trackingStatus || 'inactive';
  const isActive = tracking?.isActive ?? false;

  const lastUpdateSecondsAgo = tracking?.updatedAt
    ? Math.max(0, Math.round((now - new Date(tracking.updatedAt).getTime()) / 1000))
    : null;
  const lastUpdateText =
    lastUpdateSecondsAgo === null
      ? null
      : lastUpdateSecondsAgo < 60
      ? `Lokasi diperbarui ${lastUpdateSecondsAgo} detik lalu`
      : `Lokasi diperbarui ${Math.round(lastUpdateSecondsAgo / 60)} menit lalu`;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center border-b border-slate-200 px-4 py-4">
        <Pressable onPress={handleBack} className="flex-row items-center gap-2">
          <Text className="text-2xl">←</Text>
          <Text className="text-xl font-bold text-slate-900">Lacak Posisi Barber</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} removeClippedSubviews={false}>
        {/* Status Header Banner */}
        <View className="p-4 bg-slate-900 border-b border-slate-800">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className={`h-3 w-3 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <Text className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Status Pelacakan Keberangkatan
              </Text>
            </View>
            {isStale && (
              <View className="rounded-full bg-amber-500/20 px-2.5 py-0.5 border border-amber-500/40">
                <Text className="text-[10px] font-bold text-amber-300">⚠️ Sinyal Lemah</Text>
              </View>
            )}
          </View>

          <Text className="text-lg font-bold text-white mt-2">
            {trackingStatus === 'en_route'
              ? isArriving
                ? '🎯 Barber Hampir Tiba'
                : '🛵 Barber Sedang Menuju Lokasi Anda'
              : trackingStatus === 'arrived'
              ? '📍 Barber Sudah Sampai di Lokasi Anda'
              : trackingStatus === 'stopped'
              ? '🏁 Pelacakan Perjalanan Telah Selesai'
              : '⏳ Barber Belum Memulai Keberangkatan'}
          </Text>

          {trackingStatus === 'en_route' ? (
            <View className="mt-3 gap-1.5">
              {isStale ? (
                <Text className="text-sm font-semibold text-amber-300">Menunggu pembaruan lokasi Barber</Text>
              ) : (
                <>
                  <Text className="text-base font-bold text-white">{distanceText}</Text>
                  {!isArriving && eta ? (
                    <Text className="text-sm font-semibold text-orange-200">
                      Perkiraan tiba {eta.minMinutes}–{eta.maxMinutes} menit
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          ) : null}

          <Text className="text-xs text-slate-400 mt-2">
            {lastUpdateText || 'Menunggu konfirmasi keberangkatan Barber...'}
          </Text>
        </View>

        {tracking?.location ? (
          <View className="m-4 mb-0 h-72 overflow-hidden rounded-2xl border border-slate-200">
            <Map mapStyle={MAP_CONFIG.styleUrl} style={{ flex: 1 }}>
              <Camera
                initialViewState={{
                  center: [tracking.location.longitude, tracking.location.latitude],
                  zoom: 15,
                }}
              />
              <Marker
                id={`tracking-barber-${booking.barberId}`}
                lngLat={[tracking.location.longitude, tracking.location.latitude]}>
                <View className="h-6 w-6 rounded-full border-4 border-white bg-[#D2691E]" />
              </Marker>
            </Map>
          </View>
        ) : null}

        {/* Coordinates fallback and distance details */}
        <View className="m-4 rounded-2xl bg-slate-100 p-5 border border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            📍 Informasi Lokasi & Jarak
          </Text>

          <View className="rounded-xl bg-white p-4 border border-slate-200 mb-3 gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-slate-500 font-semibold">Tujuan Cukur</Text>
              <Text className="text-xs font-bold text-slate-900">
                {booking.serviceLocationType === 'customer_home' ? '🏠 Rumah Pelanggan' : '💈 Barbershop'}
              </Text>
            </View>
            <Text className="text-sm font-semibold text-slate-900" numberOfLines={2}>
              {booking.serviceAddress || (booking as any).address || 'Alamat tujuan belum diatur'}
            </Text>
          </View>

          <View className="rounded-xl bg-white p-4 border border-slate-200 gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-slate-500 font-semibold">Estimasi Jarak</Text>
              <Text className="text-xs font-bold text-[#D2691E]">
                {isArriving ? 'Barber hampir tiba' : distanceText}
              </Text>
            </View>
            {eta && !isArriving && !isStale ? (
              <View className="flex-row justify-between items-center">
                <Text className="text-xs text-slate-500 font-semibold">Perkiraan Tiba</Text>
                <Text className="text-xs font-bold text-slate-900">
                  {eta.minMinutes}–{eta.maxMinutes} menit (Perkiraan)
                </Text>
              </View>
            ) : null}
            {tracking?.location ? (
              <Text className="text-xs font-mono text-slate-600">
                Koordinat Barber: {tracking.location.latitude.toFixed(5)}, {tracking.location.longitude.toFixed(5)}
              </Text>
            ) : (
              <Text className="text-xs text-slate-500 italic">
                Koordinat presisi Barber akan muncul saat dalam perjalanan.
              </Text>
            )}
          </View>
        </View>

        {/* Booking Details Card */}
        <View className="mx-4 mb-6 rounded-2xl bg-white p-5 border border-slate-200">
          <Text className="text-base font-bold text-slate-900 mb-3">Detail Pesanan</Text>

          <View className="gap-2">
            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-600">Master Barber</Text>
              <Text className="text-sm font-bold text-slate-900">{booking.barber?.name || 'Master Barber'}</Text>
            </View>

            <View className="flex-row justify-between">
              <Text className="text-sm text-slate-600">Waktu Dijadwalkan</Text>
              <Text className="text-sm font-semibold text-slate-900">
                {booking.scheduledAt} ({booking.scheduledTime})
              </Text>
            </View>

            <View className="flex-row justify-between border-t border-slate-100 pt-2 mt-1">
              <Text className="text-sm text-slate-600">Total Biaya</Text>
              <Text className="text-sm font-bold text-[#D2691E]">
                Rp {(booking.totalPrice || 0).toLocaleString('id-ID')}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-auto p-4">
          <AppButton label="Kembali ke Beranda" onPress={handleBack} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
