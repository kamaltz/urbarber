/**
 * Booking Options Screen
 * Customer selects between home service and on-site service
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
import { DatePicker } from '@/features/bookings/components/DatePicker';
import { PaymentSummary } from '@/features/bookings/components/PaymentSummary';
import { MOCK_SERVICES } from '@/features/bookings/mock/bookings';

export default function BookingOptionsScreen() {
  const { barberId, barberName } = useLocalSearchParams<{
    barberId: string;
    barberName: string;
  }>();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedService, setSelectedService] = useState(MOCK_SERVICES[0]);

  const handleBookingTypeSelect = (type: 'home' | 'onsite') => {
    if (!selectedDate || !selectedService) {
      alert('Pilih tanggal dan layanan');
      return;
    }

    router.push({
      pathname: '/(customer)/booking/schedule',
      params: {
        barberId,
        barberName,
        serviceName: selectedService.name,
        servicePrice: selectedService.price.toString(),
        bookingType: type,
      },
    });
  };

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
              <Text className="text-xl font-bold text-slate-900">Pemesanan Jadwal</Text>
            </Pressable>
          </View>

          <View className="gap-8 px-4 py-6 pb-8">
            {/* Date Picker */}
            <DatePicker
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />

            {/* Service Selection */}
            <View className="gap-3">
              <Text className="text-xl font-bold text-slate-900">Pilih Layanan</Text>

              <View className="gap-2">
                {MOCK_SERVICES.map((service) => (
                  <Pressable
                    key={service.id}
                    onPress={() => setSelectedService(service)}
                    className={`flex-row items-center rounded-xl p-4 border-2 ${
                      selectedService.id === service.id
                        ? 'border-orange-600 bg-orange-50'
                        : 'border-slate-200 bg-white'
                    }`}>
                    <View className="flex-1">
                      <Text className="font-semibold text-slate-900">{service.name}</Text>
                      {service.description && (
                        <Text className="mt-1 text-sm text-slate-600">{service.description}</Text>
                      )}
                      {service.durationMinutes && (
                        <Text className="mt-1 text-xs text-slate-500">
                          {service.durationMinutes} menit
                        </Text>
                      )}
                    </View>

                    <Text className="font-bold text-slate-900">
                      Rp {service.price.toLocaleString('id-ID')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Payment Summary */}
            <PaymentSummary
              subtotal={selectedService.price}
              totalPrice={selectedService.price}
            />

            {/* Booking Type Selection */}
            <View className="gap-3">
              <AppButton
                label="Cukur Ke Rumah"
                onPress={() => handleBookingTypeSelect('home')}
                className="h-14 rounded-lg"
                variant="primary"
              />

              <AppButton
                label="Cukur Di Tempat"
                onPress={() => handleBookingTypeSelect('onsite')}
                className="h-14 rounded-lg"
                variant="secondary"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
