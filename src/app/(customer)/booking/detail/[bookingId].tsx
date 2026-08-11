import { router, useLocalSearchParams } from 'expo-router';
import {
    Alert,
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

export default function BookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const { booking, loading, error, cancelBooking } = useBookingDetail(bookingId || '');

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
          <AppButton
            label="Kembali"
            onPress={handleBack}
            className="mt-6 h-12 rounded-xl px-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleCancel = async () => {
    const result = await cancelBooking();
    if (result.success) {
      alert('Booking berhasil dibatalkan');
      handleBack();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          {/* Top Bar Header */}
          <View className="border-b border-slate-200 bg-white px-4 py-4 flex-row items-center justify-between shadow-xs">
            <Pressable onPress={handleBack} className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <Text className="text-base font-bold text-[#363062]">←</Text>
              </View>
              <Text className="text-lg font-bold text-[#363062]">Detail Pemesanan</Text>
            </Pressable>
          </View>

          <View className="gap-5 px-4 py-5">
            {/* Booking Header */}
            <BookingHeader shop={booking.shop ?? { name: 'URBarber Shop', address: '' }} />

            {/* Progress Tracker */}
            <ProgressTracker status={booking.status} />

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

            {/* Barber Info Container */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-2">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                ✂️ Master Barber
              </Text>
              <View className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 mt-1">
                <Text className="text-sm font-bold text-[#363062]">{booking.barber?.name || 'Master Barber'}</Text>
                <Text className="mt-0.5 text-xs text-slate-500 font-medium">{booking.barber?.specialization || 'Barber Profesional'}</Text>
              </View>
            </View>

            {/* Services Container */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-3">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                💇 Layanan yang Dipilih
              </Text>
              <ServiceList services={booking.services ?? []} />
            </View>

            {/* Payment Summary */}
            <PaymentSummary
              subtotal={booking.subtotal}
              travelFee={booking.travelFee}
              handlingFee={booking.handlingFee}
              discount={booking.discount}
              couponCode={booking.couponCode}
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

            {/* Action Buttons */}
            <View className="gap-3 mb-4">
              <View className="flex-row gap-3">
                <Pressable className="flex-1 items-center gap-1.5 rounded-xl bg-white p-3 border border-slate-200/80 shadow-xs active:bg-slate-50">
                  <Text className="text-xl">🗺️</Text>
                  <Text className="text-xs font-bold text-[#363062]">Peta Navigasi</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    if (booking.paymentStatus !== 'paid') {
                      Alert.alert('Chat tidak tersedia', 'Selesaikan pembayaran untuk membuka chat.');
                      return;
                    }
                    router.push(`/(customer)/chat/${booking.id}` as any);
                  }}
                  disabled={booking.paymentStatus !== 'paid'}
                  className={`flex-1 items-center gap-1.5 rounded-xl p-3 border shadow-xs ${
                    booking.paymentStatus === 'paid'
                      ? 'bg-white border-slate-200/80 active:bg-slate-50'
                      : 'bg-slate-100 border-slate-200 opacity-60'
                  }`}
                >
                  <Text className="text-xl">💬</Text>
                  <Text className={`text-xs font-bold ${
                    booking.paymentStatus === 'paid' ? 'text-[#363062]' : 'text-slate-400'
                  }`}>Chat Barber</Text>
                </Pressable>

                {['pending', 'accepted'].includes(booking.status) && (
                  <Pressable
                    onPress={handleCancel}
                    className="flex-1 items-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 p-3 active:bg-rose-100">
                    <Text className="text-xl">❌</Text>
                    <Text className="text-xs font-bold text-rose-700">Batalkan</Text>
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
