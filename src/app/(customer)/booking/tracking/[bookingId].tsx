/**
 * Live Order Tracking Screen (Customer View)
 * Displays real-time location updates of the assigned Barber for active home-service bookings.
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/AppButton';
import { Loading } from '@/components/ui/Loading';
import { Booking, BookingTracking } from '@/features/bookings/types/booking';
import { bookingRepository } from '@/features/bookings/repository/booking.repository';
import { trackingService } from '@/features/location/services/tracking.service';
import { calculateDistanceKm } from '@/features/location/utils/geo.utils';

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

  // Calculate straight-line distance if coordinates exist
  let distanceText = 'Menghitung jarak...';
  if (tracking?.location?.latitude && booking.serviceLocation?.latitude) {
    const dist = calculateDistanceKm(
      tracking.location.latitude,
      tracking.location.longitude,
      booking.serviceLocation.latitude,
      booking.serviceLocation.longitude
    );
    distanceText = `~${dist} km (jarak garis lurus)`;
  } else {
    distanceText = 'Jarak garis lurus estimasi';
  }

  const trackingStatus = tracking?.trackingStatus || 'inactive';
  const isActive = tracking?.isActive ?? false;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center border-b border-slate-200 px-4 py-4">
        <Pressable onPress={handleBack} className="flex-row items-center gap-2">
          <Text className="text-2xl">←</Text>
          <Text className="text-xl font-bold text-slate-900">Lacak Posisi Barber</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
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
              ? '🛵 Master Barber Sedang Dalam Perjalanan'
              : trackingStatus === 'arrived'
              ? '📍 Barber Sudah Sampai di Lokasi Anda'
              : trackingStatus === 'stopped'
              ? '🏁 Pelacakan Perjalanan Telah Selesai'
              : '⏳ Barber Belum Memulai Keberangkatan'}
          </Text>

          <Text className="text-xs text-slate-400 mt-1">
            {tracking?.updatedAt
              ? `Pembaruan terakhir: ${new Date(tracking.updatedAt).toLocaleTimeString('id-ID')}`
              : 'Menunggu konfirmasi keberangkatan Barber...'}
          </Text>
        </View>

        {/* Map / Coordinates Card Fallback */}
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
              <Text className="text-xs font-bold text-[#D2691E]">{distanceText}</Text>
            </View>
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
