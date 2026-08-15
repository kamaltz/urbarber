/**
 * Booking Schedule Screen
 * Customer selects appointment date and time
 */

import { AppButton } from '@/components/ui/AppButton';
import { DatePicker } from '@/features/bookings/components/DatePicker';
import { PaymentSummary } from '@/features/bookings/components/PaymentSummary';
import { TimeSlots } from '@/features/bookings/components/TimeSlots';
import { useScheduleSelector } from '@/features/bookings/hooks/use-schedule-selector';
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

export default function BookingScheduleScreen() {
  const { barberId, barberName, serviceId, serviceName, servicePrice, bookingType, date } = useLocalSearchParams<{
    barberId: string;
    barberName: string;
    serviceId: string;
    serviceName: string;
    servicePrice: string;
    bookingType: 'home' | 'onsite';
    date: string;
  }>();

  const price = parseInt(servicePrice || '50000', 10);

  const {
    selectedDate,
    selectedTime,
    availableSlots,
    loading,
    onDateSelect,
    onTimeSelect,
  } = useScheduleSelector(barberId || '', date);

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) {
      alert('Pilih tanggal dan waktu');
      return;
    }

    router.push({
      pathname: bookingType === 'home' ? '/(customer)/booking/location' : '/(customer)/booking/invoice',
      params: {
        barberId,
        barberName,
        serviceId: serviceId || '',
        serviceName,
        servicePrice: price.toString(),
        bookingType,
        date: selectedDate,
        startTime: selectedTime,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }} removeClippedSubviews={false}>
          {/* Header */}
          <View className="border-b border-slate-200 px-4 py-4">
            <Pressable onPress={() => router.back()} className="flex-row items-center gap-2">
              <Text className="text-2xl">←</Text>
              <Text className="text-xl font-bold text-slate-900">Pemesanan Jadwal</Text>
            </Pressable>
          </View>

          <View className="gap-8 px-4 py-6 pb-8">
            {/* Date Picker */}
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={onDateSelect}
            />

            {/* Time Slots */}
            {availableSlots && (
              <TimeSlots
                slots={availableSlots.slots}
                selectedTime={selectedTime}
                onTimeSelect={onTimeSelect}
                loading={loading}
              />
            )}

            {/* Payment Summary */}
            <PaymentSummary
              subtotal={price}
              totalPrice={price}
            />

            {/* Continue Button */}
            <AppButton
              label="Proses Pesanan"
              onPress={handleContinue}
              disabled={!selectedDate || !selectedTime}
              className="h-14 rounded-lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
