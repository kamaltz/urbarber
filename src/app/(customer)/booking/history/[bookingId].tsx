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
          <Text className="text-center text-lg font-semibold text-[#363062]">
            {error || 'Booking tidak ditemukan'}
          </Text>
          <AppButton
            label="Kembali"
            onPress={() => router.back()}
            className="mt-6 h-12 rounded-xl px-8"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} removeClippedSubviews={false}>
          {/* Header Bar */}
          <View className="border-b border-slate-200 bg-white px-4 py-4 flex-row items-center justify-between shadow-xs">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <Text className="text-base font-bold text-[#363062]">←</Text>
              </View>
              <Text className="text-lg font-bold text-[#363062]">Riwayat Pemesanan</Text>
            </Pressable>
          </View>

          <View className="gap-5 px-4 py-5">
            {/* Booking Header */}
            <BookingHeader shop={booking.shop} />

            {/* Date & Time Container */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-2">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                📅 Tanggal & Waktu Pelaksanaan
              </Text>
              <View className="flex-row items-center gap-2 mt-1 rounded-xl bg-[#EDEFFB]/70 p-3 border border-[#363062]/10">
                <Text className="text-xs font-bold text-[#363062]">
                  {new Date(booking.scheduledAt).toLocaleDateString('id-ID', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                  })}
                </Text>
                <Text className="text-xs text-slate-400">•</Text>
                <Text className="text-xs font-bold text-[#363062]">{booking.scheduledTime}</Text>
              </View>
            </View>

            {/* Barber Info Container */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-2">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                ✂️ Master Barber
              </Text>
              <View className="rounded-xl bg-slate-50 p-3 border border-slate-200/60 mt-1">
                <Text className="text-sm font-bold text-[#363062]">{booking.barber.name}</Text>
                <Text className="mt-0.5 text-xs text-slate-500 font-medium">{booking.barber.specialization}</Text>
              </View>
            </View>

            {/* Services Container */}
            <View className="rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs gap-3">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
                💇 Layanan Selesai
              </Text>
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
            <View className="gap-3 mb-4">
              <AppButton
                label="Pesan Layanan Ini Lagi"
                onPress={() => router.push(`/(customer)/booking/options`)}
                className="h-13 rounded-xl bg-[#D2691E]"
              />

              {booking.status === 'completed' && (
                <AppButton
                  label="Beri Ulasan Barber"
                  onPress={() => router.push(`/(customer)/booking/rating/${booking.id}`)}
                  variant="secondary"
                  className="h-13 rounded-xl border-[#363062]/30"
                />
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
