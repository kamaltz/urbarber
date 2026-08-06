/**
 * Booking History Detail Screen
 * Shows details of a past booking
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
import { ServiceList } from '@/features/bookings/components/ServiceList';
import { useBookingDetail } from '@/features/bookings/hooks/use-booking-detail';

export default function BookingHistoryDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const { booking, loading, error } = useBookingDetail(bookingId || '');

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
            onPress={() => router.back()}
            className="mt-6 h-12 rounded-lg px-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          {/* Header */}
          <View className="border-b border-slate-200 px-4 py-4">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
              <Text className="text-2xl">←</Text>
              <Text className="text-xl font-bold text-slate-900">Riwayat Pemesanan</Text>
            </Pressable>
          </View>

          <View className="gap-6 px-4 py-6">
            {/* Booking Header */}
            <BookingHeader shop={booking.shop} backgroundColor="bg-slate-100" />

            {/* Date & Time */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-slate-900">📅 Tanggal & Waktu</Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-slate-900">
                  {new Date(booking.scheduledAt).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </Text>
                <Text className="text-slate-600">-</Text>
                <Text className="text-slate-900">{booking.scheduledTime}</Text>
              </View>
            </View>

            {/* Barber Info */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-slate-900">✂️ Master Barber</Text>
              <View className="rounded-lg bg-slate-50 p-3">
                <Text className="font-semibold text-slate-900">{booking.barber.name}</Text>
                <Text className="mt-1 text-sm text-slate-600">{booking.barber.specialization}</Text>
              </View>
            </View>

            {/* Services */}
            <View className="gap-2">
              <Text className="text-base font-semibold text-slate-900">💇 Layanan</Text>
              <ServiceList services={booking.services} showDuration={false} />
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

            {/* Action Buttons */}
            <View className="gap-3">
              <AppButton
                label="Pesan Lagi"
                onPress={() => router.push(`/(customer)/booking/options`)}
                className="h-12 rounded-lg"
              />

              {booking.status === 'completed' && (
                <AppButton
                  label="Beri Ulasan"
                  onPress={() => router.push(`/(customer)/booking/rating/${booking.id}`)}
                  variant="secondary"
                  className="h-12 rounded-lg"
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
