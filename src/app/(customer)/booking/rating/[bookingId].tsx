import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
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
import { ReviewForm } from '@/features/bookings/components/ReviewForm';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useBookingDetail } from '@/features/bookings/hooks/use-booking-detail';
import { bookingRepository } from '@/features/bookings/repository/booking.repository';

export default function BookingRatingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { user } = useAuth();
  const { booking, loading, error, hasReviewed } = useBookingDetail(bookingId || '');
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
            textClassName="text-[#363062]"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Re-derived from the backend (bookingRepository.getBookingReview), not a
  // local-only flag -- prevents reaching this screen with a resubmittable
  // form when a review already exists (e.g. re-navigating here directly
  // after a previous successful submission).
  if (hasReviewed === true) {
    return (
      <SafeAreaView className="flex-1 bg-[#363062]">
        <View className="flex-1 items-center justify-center px-5">
          <Text className="text-4xl mb-3">✅</Text>
          <Text className="text-center text-lg font-bold text-white mb-2">Sudah Diulas</Text>
          <Text className="text-center text-sm text-white/70 mb-4">
            Anda sudah memberikan ulasan untuk pemesanan ini. Terima kasih!
          </Text>
          <AppButton
            label="Kembali"
            onPress={() => router.back()}
            className="mt-2 h-12 rounded-xl px-8 bg-white"
            textClassName="text-[#363062]"
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
      Alert.alert('Gagal', 'Sesi atau data booking tidak valid. Silakan muat ulang halaman.');
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
        Alert.alert('Terima Kasih', 'Ulasan Anda berhasil dikirim!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else if (result.error?.code === 'ALREADY_REVIEWED') {
        // Backend rejects a second review for the same booking with 409
        // ALREADY_REVIEWED -- surface that as a normal info message, not an
        // error, and send the user back since there is nothing left to
        // retry (the pre-check below should normally prevent reaching this
        // screen with a stale form in the first place).
        Alert.alert('Info', result.error.message || 'Booking ini sudah diberi ulasan.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Gagal', result.error?.message || 'Gagal mengirim ulasan. Silakan coba lagi.');
      }
    } catch (err) {
      Alert.alert('Error', 'Terjadi kesalahan. Coba lagi.');
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
