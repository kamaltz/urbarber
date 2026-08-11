import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import { barberApiService } from '@/features/barbers/services/barber-api.service';
import type { BarberBooking } from '@/features/barbers/types/barber';
import type { BookingTracking } from '@/features/bookings/types/booking';
import { trackingService } from '@/features/location/services/tracking.service';
import { formatCurrency } from '@/utils/formatters';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

export default function BarberBookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [booking, setBooking] = useState<BarberBooking | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mutating, setMutating] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<BookingTracking | null>(null);
  const isHomeService =
    (booking as any)?.serviceLocationType === 'customer_home' ||
    (booking as any)?.bookingType === 'home';

  const fetchDetail = useCallback(async () => {
    if (!barberId || !bookingId) return;
    try {
      setError(null);
      const data = await barberRepository.getBookingDetail(barberId, bookingId);
      setBooking(data);
      if (!data) {
        setError('Detail pesanan tidak ditemukan atau tidak ditugaskan kepada Anda.');
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat detail pesanan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barberId, bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    return trackingService.subscribeToTracking(bookingId, (data) => setTracking(data));
  }, [bookingId]);

  // Recovery path for a process/navigation interruption between authoritative
  // booking completion and the terminal tracking write.
  useEffect(() => {
    if (
      booking?.status !== 'completed' ||
      !isHomeService ||
      !tracking ||
      tracking.trackingStatus === 'stopped'
    ) {
      return;
    }

    void trackingService.stopBarberTracking(bookingId).then((result) => {
      if (!result.success) {
        setError(result.error || 'Layanan selesai, tetapi tracking belum dapat dihentikan.');
      }
    });
  }, [booking?.status, bookingId, isHomeService, tracking]);

  useEffect(() => {
    let isMounted = true;
    if (!barberId || !bookingId) return;
    barberRepository
      .getBookingDetail(barberId, bookingId)
      .then((data) => {
        if (!isMounted) return;
        setBooking(data);
        if (!data) {
          setError('Detail pesanan tidak ditemukan atau tidak ditugaskan kepada Anda.');
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Gagal memuat detail pesanan.');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [barberId, bookingId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDetail();
  };

  // Respond Action (Accept / Reject)
  const handleRespond = (action: 'accept' | 'reject') => {
    const actionLabel = action === 'accept' ? 'Menerima' : 'Menolak';
    Alert.alert(
      `Konfirmasi ${actionLabel} Pesanan`,
      `Apakah Anda yakin ingin ${actionLabel.toLowerCase()} pesanan ini?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: actionLabel,
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            setMutating(true);
            setError(null);
            const res = await barberApiService.respondBooking(bookingId, action);
            setMutating(false);

            if (res.success) {
              Alert.alert('Sukses', `Pesanan berhasil di-${action === 'accept' ? 'terima' : 'tolak'}.`);
              fetchDetail();
            } else {
              if (res.error?.code === 'PAYMENT_REFUND_REQUIRED') {
                Alert.alert(
                  'Pengembalian Dana Diperlukan',
                  'Pembayaran pesanan ini telah dikonfirmasi lunas. Pengembalian dana (refund) belum dapat diproses secara otomatis oleh sistem.'
                );
              } else {
                Alert.alert('Gagal', res.error?.message || 'Gagal merespons pesanan.');
              }
            }
          },
        },
      ]
    );
  };

  // Update Status Action (in_progress / completed)
  const handleUpdateStatus = (targetStatus: 'in_progress' | 'completed') => {
    const label = targetStatus === 'in_progress' ? 'Mulai Layanan' : 'Selesaikan Layanan';
    Alert.alert(
      `Konfirmasi ${label}`,
      `Apakah Anda yakin ingin memperbarui status pesanan menjadi ${
        targetStatus === 'in_progress' ? 'Dalam Proses' : 'Selesai'
      }?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: label,
          onPress: async () => {
            if (
              targetStatus === 'in_progress' &&
              isHomeService &&
              tracking?.trackingStatus !== 'arrived'
            ) {
              Alert.alert(
                'Urutan tracking belum lengkap',
                'Catat keberangkatan dan kedatangan sebelum memulai layanan di rumah pelanggan.',
              );
              return;
            }
            setMutating(true);
            setError(null);
            const res = await barberApiService.updateBookingStatus(bookingId, targetStatus);

            if (res.success) {
              if (targetStatus === 'completed' && isHomeService) {
                const trackingResult = await trackingService.stopBarberTracking(bookingId);
                if (!trackingResult.success) {
                  setMutating(false);
                  Alert.alert(
                    'Layanan selesai, tracking belum berhenti',
                    trackingResult.error || 'Coba buka ulang detail booking untuk menghentikan tracking.',
                  );
                  fetchDetail();
                  return;
                }
              }
              setMutating(false);
              Alert.alert('Sukses', `Status layanan berhasil diperbarui.`);
              fetchDetail();
            } else {
              setMutating(false);
              Alert.alert('Gagal', res.error?.message || 'Gagal memperbarui status layanan.');
            }
          },
        },
      ]
    );
  };

  const handleTrackingAction = async (action: 'start' | 'arrive') => {
    setMutating(true);
    const result =
      action === 'start'
        ? await trackingService.startBarberTracking(bookingId)
        : await trackingService.markBarberArrived(bookingId);
    setMutating(false);

    if (!result.success) {
      Alert.alert('Gagal', result.error || 'Gagal memperbarui tracking.');
    }
  };

  if (loading && !refreshing) return <Loading />;

  const isPaid =
    // Batch 08: Use canonical 'paid' status for payment verification
    booking?.paymentStatus === 'paid';

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Detail Pesanan Pelanggan" />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchDetail} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        {booking ? (
          <View className="gap-4 mb-8">
            {/* Status Header Banner */}
            <AppCard className="p-4 bg-slate-900 border-0">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  Status Pesanan
                </Text>
                <View
                  className={
                    booking.status === 'completed'
                      ? 'bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/40'
                      : booking.status === 'accepted' || booking.status === 'in_progress'
                      ? 'bg-sky-500/20 px-3 py-1 rounded-full border border-sky-500/40'
                      : booking.status === 'rejected'
                      ? 'bg-red-500/20 px-3 py-1 rounded-full border border-red-500/40'
                      : 'bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40'
                  }>
                  <Text className="text-white text-xs font-bold uppercase">
                    {booking.status === 'pending'
                      ? 'Menunggu Konfirmasi'
                      : booking.status === 'accepted'
                      ? 'Disetujui'
                      : booking.status === 'in_progress'
                      ? 'Dalam Proses'
                      : booking.status === 'completed'
                      ? 'Selesai'
                      : booking.status === 'rejected'
                      ? 'Ditolak'
                      : 'Dibatalkan'}
                  </Text>
                </View>
              </View>
              <Text className="text-white font-extrabold text-xl mt-2">
                {formatCurrency(booking.totalAmount || (booking as any).totalPrice || 0)}
              </Text>
              <Text className="text-slate-400 text-xs mt-1">
                Status Pembayaran:{' '}
                <Text className={isPaid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {isPaid ? '✓ LUNAS' : '⏳ BELUM DIBAYAR'}
                </Text>
              </Text>
            </AppCard>

            {/* Customer Information */}
            <AppCard className="p-4 gap-2">
              <Text className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Informasi Pelanggan
              </Text>
              <View className="flex-row items-center gap-2">
                <SymbolIcon name="person.fill" size={16} color="#64748b" />
                <Text className="text-slate-900 font-bold text-sm">
                  {booking.customerName || 'Pelanggan URBarber'}
                </Text>
              </View>
              {(booking as any).customerPhone ? (
                <Text className="text-slate-600 text-xs">📱 Phone: {(booking as any).customerPhone}</Text>
              ) : null}
              <Text className="text-slate-600 text-xs">
                📍 Alamat Layanan: {(booking as any).address || 'Alamat Pelanggan'}
              </Text>
              {booking.notes ? (
                <Text className="text-slate-500 text-xs italic bg-slate-50 p-2.5 rounded-lg mt-1">
                  Catatan: &quot;{booking.notes}&quot;
                </Text>
              ) : null}
            </AppCard>

            {/* Chat Button */}
            <Pressable
              onPress={() => {
                if (isPaid) {
                  router.push(`/(barber)/messages/${bookingId}` as any);
                } else {
                  Alert.alert('Chat tidak tersedia', 'Chat dapat dibuka setelah pelanggan menyelesaikan pembayaran.');
                }
              }}
              disabled={!isPaid}
              className={`mx-0 px-4 py-3 rounded-lg flex-row items-center justify-center gap-2 ${
                isPaid ? 'bg-[#D2691E]' : 'bg-slate-300'
              }`}
            >
              <Text className="text-xl">💬</Text>
              <Text className={`font-semibold ${isPaid ? 'text-white' : 'text-slate-500'}`}>
                Chat dengan Pelanggan
              </Text>
            </Pressable>

            {/* Service & Time Details */}
            <AppCard className="p-4 gap-2">
              <Text className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Rincian Layanan & Jadwal
              </Text>
              <Text className="text-slate-700 text-xs font-semibold">
                🗓 Tanggal: {booking.bookingDate}
              </Text>
              <Text className="text-slate-700 text-xs font-semibold">
                ⏰ Jam: {booking.bookingTime}
              </Text>

              {booking.services && booking.services.length > 0 ? (
                <View className="mt-2 gap-1 border-t border-slate-100 pt-2">
                  {booking.services.map((svc, i) => (
                    <View key={i} className="flex-row items-center justify-between">
                      <Text className="text-slate-900 text-xs font-medium">{svc.name}</Text>
                      <Text className="text-slate-700 text-xs font-bold">
                        {formatCurrency(svc.price)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </AppCard>

            {/* Operational Status Action Buttons */}
            {booking.status === 'pending' ? (
              <View className="gap-3 mt-2">
                {!isPaid ? (
                  <View className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    <Text className="text-amber-800 text-xs text-center font-medium">
                      ⚠️ Pesanan ini belum dibayar oleh pelanggan. Terima pesanan hanya dapat dilakukan setelah pembayaran lunas.
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row gap-3">
                  <AppButton
                    label="Tolak Pesanan"
                    onPress={() => handleRespond('reject')}
                    variant="secondary"
                    disabled={mutating}
                    className="flex-1 border-red-200"
                  />
                  <AppButton
                    label="Terima Pesanan"
                    onPress={() => handleRespond('accept')}
                    variant="primary"
                    disabled={mutating || !isPaid}
                    className="flex-1"
                  />
                </View>
              </View>
            ) : null}

            {booking.status === 'accepted' && isHomeService && !tracking ? (
              <View className="mt-2">
                <AppButton
                  label={mutating ? 'Memproses...' : 'Berangkat ke Lokasi'}
                  onPress={() => handleTrackingAction('start')}
                  variant="primary"
                  disabled={mutating}
                  className="w-full bg-emerald-600"
                />
              </View>
            ) : null}

            {booking.status === 'accepted' && isHomeService && tracking?.trackingStatus === 'en_route' ? (
              <View className="mt-2">
                <AppButton
                  label={mutating ? 'Memproses...' : 'Tandai Sudah Sampai'}
                  onPress={() => handleTrackingAction('arrive')}
                  variant="primary"
                  disabled={mutating}
                  className="w-full bg-sky-600"
                />
              </View>
            ) : null}

            {booking.status === 'accepted' && (!isHomeService || tracking?.trackingStatus === 'arrived') ? (
              <View className="mt-2">
                <AppButton
                  label={mutating ? 'Memproses...' : 'Mulai Layanan (In Progress)'}
                  onPress={() => handleUpdateStatus('in_progress')}
                  variant="primary"
                  disabled={mutating}
                  className="w-full bg-purple-600"
                />
              </View>
            ) : null}

            {booking.status === 'in_progress' ? (
              <View className="mt-2">
                <AppButton
                  label={mutating ? 'Memproses...' : 'Selesaikan Layanan (Completed)'}
                  onPress={() => handleUpdateStatus('completed')}
                  variant="primary"
                  disabled={mutating}
                  className="w-full bg-emerald-600"
                />
              </View>
            ) : null}

            {booking.status === 'completed' ||
            booking.status === 'rejected' ||
            booking.status === 'cancelled' ? (
              <View className="bg-slate-100 p-4 rounded-xl items-center mt-2">
                <Text className="text-slate-500 text-xs font-semibold">
                  Pesanan ini sudah mencapai status terminal ({booking.status}) dan tidak dapat diubah lagi.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
