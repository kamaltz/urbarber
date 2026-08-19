import { AppButton } from '@/components/ui/AppButton';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import { barberApiService } from '@/features/barbers/services/barber-api.service';
import { CustomerDetailCard } from '@/features/barbers/components/service-workspace/CustomerDetailCard';
import { CustomerLocationCard } from '@/features/barbers/components/service-workspace/CustomerLocationCard';
import { ServiceDetailCard } from '@/features/barbers/components/service-workspace/ServiceDetailCard';
import { ServiceProgressTimeline } from '@/features/barbers/components/service-workspace/ServiceProgressTimeline';
import { ServiceSummaryCard } from '@/features/barbers/components/service-workspace/ServiceSummaryCard';
import { ServiceTimerCard } from '@/features/barbers/components/service-workspace/ServiceTimerCard';
import { getAppointmentCountdown } from '@/features/barbers/utils/appointment-countdown';
import { getElapsedTime } from '@/features/barbers/utils/service-timer';
import { getServiceWorkspaceStage, type ServiceWorkspaceStage } from '@/features/barbers/utils/service-workspace-stage';
import type { BarberBooking } from '@/features/barbers/types/barber';
import { chatRepository } from '@/features/chat/repository/chat.repository';
import { customerRepository } from '@/features/customer/repository/customer.repository';
import type { BookingTracking } from '@/features/bookings/types/booking';
import { trackingService } from '@/features/location/services/tracking.service';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, View } from 'react-native';

const STAGE_LABEL: Record<ServiceWorkspaceStage, { label: string; badgeClass: string; textClass: string }> = {
  requires_response: { label: 'Menunggu Konfirmasi', badgeClass: 'bg-amber-500/20 border-amber-500/40', textClass: 'text-amber-300' },
  awaiting_trip: { label: 'Menunggu Waktu Layanan', badgeClass: 'bg-amber-500/20 border-amber-500/40', textClass: 'text-amber-300' },
  en_route: { label: 'Sedang Menuju Pelanggan', badgeClass: 'bg-sky-500/20 border-sky-500/40', textClass: 'text-sky-300' },
  arrived: { label: 'Tiba di Lokasi Pelanggan', badgeClass: 'bg-sky-500/20 border-sky-500/40', textClass: 'text-sky-300' },
  ready_to_start: { label: 'Menunggu Waktu Layanan', badgeClass: 'bg-amber-500/20 border-amber-500/40', textClass: 'text-amber-300' },
  in_progress: { label: 'Sedang Melayani', badgeClass: 'bg-purple-500/20 border-purple-500/40', textClass: 'text-purple-300' },
  completed: { label: 'Selesai', badgeClass: 'bg-emerald-500/20 border-emerald-500/40', textClass: 'text-emerald-300' },
  terminal_other: { label: 'Berakhir', badgeClass: 'bg-slate-500/20 border-slate-500/40', textClass: 'text-slate-300' },
};

export default function BarberBookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [booking, setBooking] = useState<BarberBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [mutating, setMutating] = useState(false);
  const [chatInitializing, setChatInitializing] = useState(false);
  const [tracking, setTracking] = useState<BookingTracking | null>(null);
  const [isTrackingStale, setIsTrackingStale] = useState(false);
  const [customerProfile, setCustomerProfile] = useState<{ name: string; profileImageUrl?: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Realtime booking subscription -- a customer/admin cancellation or a
  // completion applied elsewhere must be reflected immediately here.
  useEffect(() => {
    if (!barberId || !bookingId) return;
    const unsubscribe = barberRepository.subscribeToBookingDetail(barberId, bookingId, (data) => {
      setBooking(data);
      setNotFound(!data);
      setLoading(false);
      setRefreshing(false);
    });
    return unsubscribe;
  }, [barberId, bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    return trackingService.subscribeToTracking(bookingId, (data, stale) => {
      setTracking(data);
      setIsTrackingStale(stale);
    });
  }, [bookingId]);

  useEffect(() => {
    if (!booking?.customerId) return;
    return customerRepository.subscribeToCustomerNameAndPhoto(booking.customerId, setCustomerProfile);
  }, [booking?.customerId]);

  // One tick per second drives both the service timer and the
  // "diperbarui N detik lalu" / appointment countdown copy.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const isHomeService = booking ? booking.serviceLocationType === 'customer_home' || booking.bookingType === 'home' : false;

  // Recovery: if the booking reaches a terminal state (cancelled elsewhere,
  // rejected, or completed) while tracking is still live, stop it -- never
  // leave a foreground GPS watcher running for a booking that's no longer
  // active.
  useEffect(() => {
    if (!booking || !isHomeService) return;
    const terminal = booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'rejected';
    if (!terminal || !tracking || tracking.trackingStatus === 'stopped') return;
    void trackingService.stopBarberTracking(bookingId);
  }, [booking?.status, bookingId, isHomeService, tracking]);

  const stage: ServiceWorkspaceStage | null = booking
    ? getServiceWorkspaceStage({ bookingStatus: booking.status, isHomeService, trackingStatus: tracking?.trackingStatus })
    : null;

  const elapsed = useMemo(() => getElapsedTime(booking?.startedAt, now), [booking?.startedAt, now]);
  const estimatedMinutes = useMemo(() => {
    const total = (booking?.services || []).reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    return total > 0 ? total : null;
  }, [booking?.services]);

  const appointmentCountdown = useMemo(() => {
    if (!booking || stage === 'in_progress' || stage === 'completed' || stage === 'terminal_other') return null;
    return getAppointmentCountdown(booking.bookingDate, booking.bookingTime, now);
  }, [booking, stage, now]);

  const lastUpdateSecondsAgo = tracking?.updatedAt
    ? Math.max(0, Math.round((now - new Date(tracking.updatedAt).getTime()) / 1000))
    : null;

  const handleRefresh = () => {
    setRefreshing(true);
    // Realtime subscriptions already keep this current; this just gives the
    // pull gesture a visible, bounded acknowledgement.
    setTimeout(() => setRefreshing(false), 400);
  };

  const isPaid = booking?.paymentStatus === 'paid';

  const handleRespond = (action: 'accept' | 'reject') => {
    const actionLabel = action === 'accept' ? 'Menerima' : 'Menolak';
    Alert.alert(`Konfirmasi ${actionLabel} Pesanan`, `Apakah Anda yakin ingin ${actionLabel.toLowerCase()} pesanan ini?`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: actionLabel,
        style: action === 'reject' ? 'destructive' : 'default',
        onPress: async () => {
          setMutating(true);
          const res = await barberApiService.respondBooking(bookingId, action);
          setMutating(false);
          if (!res.success) {
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
    ]);
  };

  const handleStartTrip = () => {
    Alert.alert('Mulai Perjalanan', 'Mulai perjalanan menuju lokasi pelanggan?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Mulai',
        onPress: async () => {
          setMutating(true);
          const result = await trackingService.startBarberTracking(bookingId);
          setMutating(false);
          if (!result.success) Alert.alert('Gagal', result.error || 'Gagal memulai perjalanan.');
        },
      },
    ]);
  };

  const handleMarkArrived = () => {
    Alert.alert('Konfirmasi Kedatangan', 'Pastikan Anda sudah berada di lokasi pelanggan.', [
      { text: 'Belum', style: 'cancel' },
      {
        text: 'Saya Sudah Tiba',
        onPress: async () => {
          setMutating(true);
          const result = await trackingService.markBarberArrived(bookingId);
          setMutating(false);
          if (!result.success) Alert.alert('Gagal', result.error || 'Gagal mencatat kedatangan.');
        },
      },
    ]);
  };

  const handleStartService = () => {
    Alert.alert('Mulai Pelayanan', 'Mulai pelayanan sekarang?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Mulai',
        onPress: async () => {
          setMutating(true);
          const res = await barberApiService.updateBookingStatus(bookingId, 'in_progress');
          setMutating(false);
          if (!res.success) Alert.alert('Gagal', res.error?.message || 'Gagal memulai pelayanan.');
        },
      },
    ]);
  };

  const handleCompleteService = () => {
    Alert.alert(
      'Selesaikan Pelayanan',
      'Layanan akan ditandai selesai dan tidak dapat dikembalikan ke status sedang berlangsung.',
      [
        { text: 'Kembali', style: 'cancel' },
        {
          text: 'Selesaikan',
          onPress: async () => {
            setMutating(true);
            const res = await barberApiService.updateBookingStatus(bookingId, 'completed');
            if (res.success && isHomeService) {
              const trackingResult = await trackingService.stopBarberTracking(bookingId);
              if (!trackingResult.success) {
                setMutating(false);
                Alert.alert(
                  'Layanan selesai, tracking belum berhenti',
                  trackingResult.error || 'Coba buka ulang layar ini untuk menghentikan tracking.'
                );
                return;
              }
            }
            setMutating(false);
            if (!res.success) Alert.alert('Gagal', res.error?.message || 'Gagal menyelesaikan pelayanan.');
          },
        },
      ]
    );
  };

  const handleOpenChat = async () => {
    if (!isPaid || !bookingId) {
      Alert.alert('Chat tidak tersedia', 'Chat dapat dibuka setelah pelanggan menyelesaikan pembayaran.');
      return;
    }
    setChatInitializing(true);
    try {
      const conversationId = await chatRepository.ensureConversation(bookingId);
      router.push(`/(barber)/messages/${conversationId}` as any);
    } catch (err: any) {
      Alert.alert('Chat tidak tersedia', err?.message || 'Gagal membuka percakapan. Silakan coba lagi.');
    } finally {
      setChatInitializing(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(barber)/home');
  };

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Melayani Pelanggan" showBackButton onBackPress={handleBack} />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {notFound || !booking || !stage ? (
          <View className="rounded-2xl bg-red-50 border border-red-200 p-4">
            <Text className="text-red-700 text-sm">Detail pesanan tidak ditemukan atau tidak ditugaskan kepada Anda.</Text>
          </View>
        ) : (
          <View className="gap-4 mb-8">
            {/* Status Header */}
            <View className="rounded-2xl bg-slate-900 p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Status Layanan</Text>
                <View className={['px-3 py-1 rounded-full border', STAGE_LABEL[stage].badgeClass].join(' ')}>
                  <Text className={['text-xs font-bold', STAGE_LABEL[stage].textClass].join(' ')}>
                    {STAGE_LABEL[stage].label}
                  </Text>
                </View>
              </View>
              <Text className="text-white font-extrabold text-lg mt-2">
                🗓 {booking.bookingDate} · ⏰ {booking.bookingTime}
              </Text>
              {appointmentCountdown ? (
                <Text className={['text-xs font-semibold mt-1', appointmentCountdown.isLate ? 'text-amber-300' : 'text-slate-400'].join(' ')}>
                  {appointmentCountdown.label}
                </Text>
              ) : null}
              <Text className="text-slate-400 text-xs mt-2">
                Status Pembayaran:{' '}
                <Text className={isPaid ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {isPaid ? '✓ LUNAS' : '⏳ BELUM DIBAYAR'}
                </Text>
              </Text>
            </View>

            {stage === 'completed' ? (
              <ServiceSummaryCard
                customerName={customerProfile?.name || booking.customerName}
                serviceName={booking.services?.[0]?.name || 'Layanan Cukur'}
                startedAt={booking.startedAt}
                completedAt={booking.completedAt}
              />
            ) : (
              <>
                <ServiceProgressTimeline stage={stage} isHomeService={isHomeService} />

                <CustomerDetailCard
                  name={customerProfile?.name || booking.customerName || 'Pelanggan URBarber'}
                  avatarUrl={customerProfile?.profileImageUrl}
                  notes={booking.notes}
                  onChatPress={handleOpenChat}
                  chatEnabled={isPaid}
                  chatLoading={chatInitializing}
                />

                {isHomeService ? (
                  <CustomerLocationCard
                    stage={stage}
                    destination={booking.location}
                    destinationAddress={booking.serviceAddress || booking.address}
                    barberLocation={tracking?.location}
                    barberSpeed={tracking?.speed}
                    lastUpdateSecondsAgo={lastUpdateSecondsAgo}
                    isStale={isTrackingStale}
                  />
                ) : null}

                <ServiceDetailCard
                  services={booking.services || []}
                  totalAmount={booking.totalAmount}
                  homeServiceFee={booking.homeServiceFee}
                  tipAmount={booking.tipAmount}
                  bookingDate={booking.bookingDate}
                  bookingTime={booking.bookingTime}
                  isHomeService={isHomeService}
                  estimatedMinutes={estimatedMinutes}
                />

                {stage === 'in_progress' && elapsed ? (
                  <ServiceTimerCard
                    formattedElapsed={elapsed.formatted}
                    elapsedSeconds={elapsed.totalSeconds}
                    estimatedMinutes={estimatedMinutes}
                  />
                ) : null}

                {/* Primary CTA -- exactly one, matching the real current stage */}
                {stage === 'requires_response' ? (
                  <View className="gap-3">
                    {!isPaid ? (
                      <View className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                        <Text className="text-amber-800 text-xs text-center font-medium">
                          ⚠️ Pesanan ini belum dibayar oleh pelanggan. Terima pesanan hanya dapat dilakukan setelah pembayaran lunas.
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-row gap-3">
                      <AppButton label="Tolak Pesanan" onPress={() => handleRespond('reject')} variant="secondary" disabled={mutating} className="flex-1 border-red-200" />
                      <AppButton label="Terima Pesanan" onPress={() => handleRespond('accept')} variant="primary" disabled={mutating || !isPaid} className="flex-1" />
                    </View>
                  </View>
                ) : stage === 'awaiting_trip' ? (
                  <AppButton label={mutating ? 'Memproses...' : 'Mulai Perjalanan'} onPress={handleStartTrip} variant="primary" disabled={mutating} className="bg-emerald-600" />
                ) : stage === 'en_route' ? (
                  <AppButton label={mutating ? 'Memproses...' : 'Saya Sudah Tiba'} onPress={handleMarkArrived} variant="primary" disabled={mutating} className="bg-sky-600" />
                ) : stage === 'arrived' || stage === 'ready_to_start' ? (
                  <AppButton label={mutating ? 'Memproses...' : 'Mulai Pelayanan'} onPress={handleStartService} variant="primary" disabled={mutating} className="bg-purple-600" />
                ) : stage === 'in_progress' ? (
                  <AppButton label={mutating ? 'Memproses...' : 'Selesaikan Pelayanan'} onPress={handleCompleteService} variant="primary" disabled={mutating} className="bg-emerald-600" />
                ) : stage === 'terminal_other' ? (
                  <View className="bg-slate-100 p-4 rounded-xl items-center">
                    <Text className="text-slate-500 text-xs font-semibold">
                      Pesanan ini {booking.status === 'rejected' ? 'ditolak' : 'dibatalkan'} dan tidak dapat diproses lagi.
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
