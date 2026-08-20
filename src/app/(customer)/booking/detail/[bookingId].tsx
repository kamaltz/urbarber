import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    InteractionManager,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { Loading } from '@/components/ui/Loading';
import { BookingHeader } from '@/features/bookings/components/BookingHeader';
import { PaymentSummary } from '@/features/bookings/components/PaymentSummary';
import { ProgressTracker } from '@/features/bookings/components/ProgressTracker';
import { ServiceList } from '@/features/bookings/components/ServiceList';
import { useBookingDetail } from '@/features/bookings/hooks/use-booking-detail';
import type { Booking, BookingStatus } from '@/features/bookings/types/booking';
import { chatRepository } from '@/features/chat/repository/chat.repository';

const STATUS_INFO: Record<BookingStatus, { label: string; explanation: string; badgeClass: string }> = {
  pending: {
    label: 'Menunggu Konfirmasi',
    explanation: 'Barber belum menerima pemesanan Anda. Anda dapat membatalkan selama menunggu.',
    badgeClass: 'bg-amber-100 text-amber-800',
  },
  accepted: {
    label: 'Diterima',
    explanation: 'Barber telah menerima pemesanan Anda dan akan segera menuju lokasi/menyiapkan layanan.',
    badgeClass: 'bg-blue-100 text-blue-800',
  },
  in_progress: {
    label: 'Sedang Berlangsung',
    explanation: 'Layanan sedang berlangsung. Selamat menikmati layanan dari Barber Anda.',
    badgeClass: 'bg-[#EDEFFB] text-[#363062]',
  },
  completed: {
    label: 'Selesai',
    explanation: 'Layanan telah selesai. Terima kasih telah menggunakan URBarber -- jangan lupa beri penilaian.',
    badgeClass: 'bg-emerald-100 text-emerald-800',
  },
  cancelled: {
    label: 'Dibatalkan',
    explanation: 'Pemesanan ini telah dibatalkan.',
    badgeClass: 'bg-slate-200 text-slate-600',
  },
  rejected: {
    label: 'Ditolak',
    explanation: 'Barber menolak pemesanan ini. Silakan coba barber lain.',
    badgeClass: 'bg-rose-100 text-rose-700',
  },
};

function isHomeService(booking: Booking): boolean {
  return booking.bookingType === 'home' || booking.serviceLocationType === 'customer_home';
}

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const { booking, loading, error, refresh, cancelBooking, hasReviewed } = useBookingDetail(bookingId || '');
  const [chatInitializing, setChatInitializing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Re-derive booking + review state from the backend every time this screen
  // regains focus -- e.g. returning from the rating screen after submitting
  // a review, or after a barber accepts/completes the booking elsewhere.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

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

  if (error || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-lg font-semibold text-[#363062]">
            {error || 'Booking tidak ditemukan'}
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-500">
            {error ? 'Periksa koneksi internet Anda dan coba lagi.' : 'Pemesanan mungkin telah dihapus.'}
          </Text>
          <View className="mt-6 flex-row gap-3">
            {error ? <AppButton label="Coba Lagi" onPress={refresh} className="h-12 rounded-xl px-8" /> : null}
            <AppButton
              label="Kembali"
              onPress={handleBack}
              variant={error ? 'secondary' : 'primary'}
              className="h-12 rounded-xl px-8"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = STATUS_INFO[booking.status];
  const homeService = isHomeService(booking);
  const trackingAvailable = homeService && ['accepted', 'in_progress'].includes(booking.status);

  const handleCancel = () => {
    if (cancelling) return;

    Alert.alert(
      'Konfirmasi Pembatalan',
      'Apakah Anda yakin ingin membatalkan pemesanan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Batalkan',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await cancelBooking();
              if (result.success) {
                const refundMessage = !result.refund
                  ? 'Pesanan berhasil dibatalkan.'
                  : result.refund.status === 'auto_approved'
                  ? `Pesanan dibatalkan. Dana sebesar Rp${result.refund.amount.toLocaleString('id-ID')} akan dikembalikan sepenuhnya.`
                  : 'Pesanan dibatalkan. Karena barber sudah dalam perjalanan, pengembalian dana akan ditinjau oleh admin terlebih dahulu.';

                // Defer navigation using InteractionManager to allow Fabric to complete
                // view tree reconciliation before transitioning to new screen.
                // Critical fix for Fabric crash: "addViewAt: child already has a parent"
                // Pattern from booking/invoice.tsx (batch 09 remediation)
                Alert.alert('Pesanan Dibatalkan', refundMessage, [
                  {
                    text: 'OK',
                    onPress: () => {
                      InteractionManager.runAfterInteractions(() => {
                        handleBack();
                      });
                    },
                  },
                ]);
              } else {
                setCancelling(false);
                Alert.alert('Gagal', result.error?.message || 'Gagal membatalkan booking.');
              }
            } catch {
              setCancelling(false);
              Alert.alert('Error', 'Terjadi kesalahan saat membatalkan booking.');
            }
          },
        },
      ]
    );
  };

  const handleOpenChat = async () => {
    if (booking.paymentStatus !== 'paid') {
      Alert.alert('Chat tidak tersedia', 'Selesaikan pembayaran untuk membuka chat.');
      return;
    }

    setChatInitializing(true);
    try {
      const conversationId = await chatRepository.ensureConversation(booking.id);
      router.push(`/(customer)/chat/${conversationId}` as any);
    } catch (err: any) {
      Alert.alert('Chat tidak tersedia', err?.message || 'Gagal membuka percakapan. Silakan coba lagi.');
    } finally {
      setChatInitializing(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} removeClippedSubviews={false}>
          {/* Top Bar Header */}
          <View className="border-b border-slate-200 bg-white px-4 py-4 flex-row items-center justify-between shadow-xs">
            <Pressable onPress={handleBack} className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <Text className="text-base font-bold text-[#363062]">←</Text>
              </View>
              <Text className="text-lg font-bold text-[#363062]">Detail Pemesanan</Text>
            </Pressable>
            <View className={`rounded-full px-3 py-1.5 ${statusInfo.badgeClass}`}>
              <Text className="text-xs font-bold">{statusInfo.label}</Text>
            </View>
          </View>

          <View className="gap-5 px-4 py-5">
            {/* Status Card */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">Status Pemesanan</Text>
                <View className={`rounded-full px-2.5 py-1 ${statusInfo.badgeClass}`}>
                  <Text className="text-[11px] font-bold">{statusInfo.label}</Text>
                </View>
              </View>
              <Text className="text-xs text-slate-600 leading-5">{statusInfo.explanation}</Text>
            </View>

            {/* Progress Timeline (only meaningful for the active pipeline) */}
            {!['cancelled', 'rejected'].includes(booking.status) ? (
              <ProgressTracker status={booking.status} />
            ) : null}

            {/* Barber Card */}
            <BookingHeader shop={booking.shop ?? { name: 'URBarber Shop', address: '', imageUrl: '', location: '', distance: '', rating: '' }} />

            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-2">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                ✂️ Detail Barber
              </Text>
              <View className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 mt-1">
                <Text className="text-sm font-bold text-[#363062]">{booking.barber?.name || 'Master Barber'}</Text>
                <Text className="mt-0.5 text-xs text-slate-500 font-medium">{booking.barber?.specialization || 'Barber Profesional'}</Text>
              </View>
              {booking.barberId ? (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(customer)/barber/[barberId]', params: { barberId: booking.barberId } })
                  }
                  className="self-start"
                >
                  <Text className="text-xs font-bold text-[#D2691E]">Lihat Profil Barber →</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Date & Time Container */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-2">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                📅 Tanggal & Waktu Layanan
              </Text>
              <View className="rounded-xl bg-[#EDEFFB]/70 p-3 border border-[#363062]/10 mt-1">
                <Text className="text-sm font-bold text-[#363062]">
                  {new Date(booking.scheduledAt).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text className="mt-1 text-xs text-slate-600 font-medium">Jam: {booking.scheduledTime}</Text>
              </View>
            </View>

            {/* Services Container */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                  💇 Layanan yang Dipilih
                </Text>
                <View className="rounded-full bg-slate-100 px-2.5 py-1">
                  <Text className="text-[11px] font-bold text-slate-600">
                    {homeService ? 'Cukur di Rumah' : 'Datang ke Barber'}
                  </Text>
                </View>
              </View>
              <ServiceList services={booking.services ?? []} />
            </View>

            {/* Location (home service only) */}
            {homeService && booking.serviceAddress ? (
              <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-2">
                <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                  📍 Lokasi Layanan
                </Text>
                <View className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 mt-1">
                  <Text className="text-xs font-medium text-slate-700 leading-5">{booking.serviceAddress}</Text>
                </View>
              </View>
            ) : null}

            {/* Payment Summary */}
            <PaymentSummary
              subtotal={booking.subtotal}
              travelFee={booking.travelFee}
              handlingFee={booking.handlingFee}
              discount={booking.discount}
              couponCode={booking.couponCode}
              tipAmount={booking.tipAmount}
              totalPrice={booking.totalPrice}
            />

            {/* Payment Status Banner */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-slate-500 font-medium">Status Pembayaran</Text>
                <Text className="text-sm font-bold text-[#363062] uppercase mt-0.5">
                  {booking.paymentStatus || 'Initiated'}
                </Text>
              </View>

              {(!booking.paymentStatus || ['pending', 'initiated', 'failed'].includes(booking.paymentStatus)) ? (
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(customer)/booking/invoice',
                      params: {
                        bookingId: booking.id,
                        serviceName: booking.services?.[0]?.name || 'Layanan Barber',
                        servicePrice: String(booking.totalPrice || 0),
                        barberName: booking.barber?.name || 'Barber URBarber',
                      },
                    })
                  }
                  className="rounded-xl bg-[#D2691E] px-4 py-2.5 active:bg-[#B05416]"
                >
                  <Text className="text-xs font-bold text-white">Bayar Sekarang</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Action Buttons -- only actions valid for the current state are shown */}
            <View className="gap-3 mb-4">
              <View className="flex-row flex-wrap gap-3">
                {trackingAvailable ? (
                  <Pressable
                    onPress={() => router.push(`/(customer)/booking/tracking/${booking.id}` as any)}
                    className="flex-1 items-center gap-1.5 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs active:bg-slate-50">
                    <Text className="text-xl">🗺️</Text>
                    <Text className="text-xs font-bold text-[#363062]">Lacak Barber</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={handleOpenChat}
                  disabled={booking.paymentStatus !== 'paid' || chatInitializing}
                  className={`flex-1 items-center gap-1.5 rounded-xl p-3 border shadow-xs ${
                    booking.paymentStatus === 'paid'
                      ? 'bg-white border-slate-200/80 active:bg-slate-50'
                      : 'bg-slate-100 border-slate-200 opacity-60'
                  }`}
                >
                  {chatInitializing ? (
                    <ActivityIndicator size="small" color="#363062" />
                  ) : (
                    <Text className="text-xl">💬</Text>
                  )}
                  <Text className={`text-xs font-bold ${
                    booking.paymentStatus === 'paid' ? 'text-[#363062]' : 'text-slate-400'
                  }`}>Chat Barber</Text>
                </Pressable>

                {booking.status === 'completed' ? (
                  <Pressable
                    onPress={() => router.push(`/(customer)/booking/rating/${booking.id}` as any)}
                    disabled={hasReviewed === true}
                    className={`flex-1 items-center gap-1.5 rounded-xl p-3 border shadow-xs ${
                      hasReviewed === true
                        ? 'bg-slate-100 border-slate-200 opacity-70'
                        : 'bg-white border-slate-200/80 active:bg-slate-50'
                    }`}>
                    <Text className="text-xl">{hasReviewed === true ? '✅' : '⭐'}</Text>
                    <Text className={`text-xs font-bold ${hasReviewed === true ? 'text-slate-500' : 'text-[#363062]'}`}>
                      {hasReviewed === true ? 'Sudah Diulas' : 'Nilai Layanan'}
                    </Text>
                  </Pressable>
                ) : null}

                {['pending', 'accepted'].includes(booking.status) && (
                  <Pressable
                    onPress={handleCancel}
                    disabled={cancelling}
                    className={`flex-1 items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 p-3 active:bg-rose-100 ${
                      cancelling ? 'opacity-50' : ''
                    }`}>
                    {cancelling ? (
                      <ActivityIndicator size="small" color="#e11d48" />
                    ) : (
                      <Text className="text-xl">❌</Text>
                    )}
                    <Text className="text-xs font-bold text-rose-700">
                      {cancelling ? 'Memproses...' : 'Batalkan'}
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
