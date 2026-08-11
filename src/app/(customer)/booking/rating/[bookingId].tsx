import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { ReviewForm } from '@/features/bookings/components/ReviewForm';
import { useBookingDetail } from '@/features/bookings/hooks/use-booking-detail';
import { bookingRepository } from '@/features/bookings/repository/booking.repository';

const MOCK_CUSTOMER_ID = 'CUST001'; // Mock customer ID

export default function BookingRatingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { booking, loading, error } = useBookingDetail(bookingId || '');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#363062]">
        <Loading />
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView className="flex-1 bg-[#363062]">
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-center text-lg font-bold text-white mb-2">
            {error || 'Booking tidak ditemukan'}
          </Text>
          <AppButton
            label="Kembali"
            onPress={() => router.back()}
            className="mt-4 h-12 rounded-xl px-8 bg-white"
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmitReview = async (data: {
    rating: number;
    reviewText: string;
    tags: string[];
  }) => {
    setSubmitting(true);

    try {
      const result = await bookingRepository.submitReview(bookingId || '', {
        ...data,
        customerId: MOCK_CUSTOMER_ID,
      });

      if (result.success) {
        alert('Terima kasih atas ulasan Anda!');
        router.back();
      } else {
        alert(result.error?.message || 'Gagal mengirim ulasan');
      }
    } catch (err) {
      alert('Terjadi kesalahan. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#363062]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled">
          {/* Top Bar Header */}
          <View className="px-5 py-4 flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Text className="text-base font-bold text-white">←</Text>
              </View>
              <Text className="text-lg font-bold text-white">Beri Ulasan Barber</Text>
            </Pressable>
          </View>

          {/* Shop Header Card */}
          <View className="px-5 pb-5 pt-1">
            <BookingHeader shop={booking.shop} backgroundColor="bg-white/10" />
          </View>

          {/* Form Bottom Sheet Container */}
          <View className="flex-1 rounded-t-[32px] bg-slate-50 px-5 pb-8 pt-6 border-t border-white/20 shadow-lg">
            <ReviewForm onSubmit={handleSubmitReview} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
