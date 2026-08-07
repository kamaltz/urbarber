/**
 * Booking Detail Screen
 * Shows active booking details and status
 */

import { router, useLocalSearchParams } from 'expo-router';
import {
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
          <Text className="text-center text-lg font-semibold text-slate-900">
            {error || 'Booking tidak ditemukan'}
          </Text>
          <AppButton
            label="Kembali"
            onPress={handleBack}
            className="mt-6 h-12 rounded-lg px-8"
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header */}
          <View className="border-b border-slate-200 px-4 py-4">
            <Pressable onPress={handleBack} className="flex-row items-center gap-2">
              <Text className="text-2xl">←</Text>
              <Text className="text-xl font-bold text-slate-900">Detail Pemesanan</Text>
            </Pressable>
          </View>

          <View className="gap-6 px-4 py-6">
            {/* Booking Header */}
            <BookingHeader shop={booking.shop ?? { name: 'URBarber Shop', address: '' }} />

            {/* Progress Tracker */}
            <View className="rounded-lg bg-slate-50 p-4">
              <ProgressTracker status={booking.status} />
            </View>

            {/* Date & Time */}
            <View className="gap-2">
              <Text className="text-lg font-bold text-slate-900">📅 Tanggal & Waktu</Text>
              <View className="rounded-lg bg-slate-50 p-4">
                <Text className="font-semibold text-slate-900">
                  {new Date(booking.scheduledAt).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
                <Text className="mt-1 text-slate-600">{booking.scheduledTime}</Text>
              </View>
            </View>

            {/* Barber Info */}
            <View className="gap-2">
              <Text className="text-lg font-bold text-slate-900">✂️ Master Barber</Text>
              <View className="rounded-lg bg-slate-50 p-4">
                <Text className="font-semibold text-slate-900">{booking.barber?.name || 'Master Barber'}</Text>
                <Text className="mt-1 text-sm text-slate-600">{booking.barber?.specialization || 'Barber Profesional'}</Text>
              </View>
            </View>

            {/* Services */}
            <View className="gap-2">
              <Text className="text-lg font-bold text-slate-900">💇 Layanan yang Dipilih</Text>
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
            <View className="rounded-lg bg-slate-50 p-4 border border-slate-200 flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-slate-500 font-medium">Status Pembayaran</Text>
                <Text className="text-sm font-bold text-slate-900 uppercase">
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
                  className="rounded-lg bg-[#D2691E] px-4 py-2"
                >
                  <Text className="text-xs font-bold text-white">Bayar Sekarang</Text>
                </Pressable>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View className="gap-3">
              <View className="flex-row gap-3">
                <Pressable className="flex-1 items-center gap-2 rounded-lg bg-slate-100 py-3">
                  <Text className="text-2xl">🗺️</Text>
                  <Text className="text-xs font-semibold text-slate-900">Peta</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/(customer)/chat/${booking.id}` as any)}
                  className="flex-1 items-center gap-2 rounded-lg bg-slate-100 py-3"
                >
                  <Text className="text-2xl">💬</Text>
                  <Text className="text-xs font-semibold text-slate-900">Chat</Text>
                </Pressable>

                {['pending', 'accepted'].includes(booking.status) && (
                  <Pressable
                    onPress={handleCancel}
                    className="flex-1 items-center gap-2 rounded-lg bg-red-100 py-3">
                    <Text className="text-2xl">❌</Text>
                    <Text className="text-xs font-semibold text-red-700">Batalkan</Text>
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
