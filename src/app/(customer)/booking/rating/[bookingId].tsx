/**
 * Booking Rating Screen
 * Allows customer to submit review and rating for a completed booking
 */

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
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useBookingDetail } from '@/features/bookings/hooks/use-booking-detail';
import { bookingRepository } from '@/features/bookings/repository/booking.repository';

export default function BookingRatingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const { booking, loading, error } = useBookingDetail(bookingId || '');
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmitReview = async (data: {
    rating: number;
    reviewText: string;
    tags: string[];
  }) => {
    if (!user?.uid || !booking.barberId) {
      alert('Sesi atau data booking tidak valid. Silakan muat ulang halaman.');
      return;
    }

    setSubmitting(true);

    try {
      const result = await bookingRepository.submitReview(bookingId || '', {
        ...data,
        customerId: user.uid,
        barberId: booking.barberId,
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
    <SafeAreaView className="flex-1 bg-orange-600">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="px-4 py-4">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
              <Text className="text-2xl text-white">←</Text>
              <Text className="text-xl font-bold text-white">Beri Ulasan</Text>
            </Pressable>
          </View>

          {/* Shop Header */}
          <View className="px-4 pb-4">
            <BookingHeader shop={booking.shop} backgroundColor="bg-white" />
          </View>

          {/* Form - White bottom sheet */}
          <View className="flex-1 gap-6 rounded-t-3xl bg-white px-4 pb-8 pt-6">
            <ReviewForm onSubmit={handleSubmitReview} loading={submitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
