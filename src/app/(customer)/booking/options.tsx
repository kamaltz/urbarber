/**
 * Booking Options Screen
 * Customer selects between home service and on-site service
 */

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import {
  resolveActiveBookingServices,
  type BookingOptionService,
} from '@/features/bookings/utils/resolve-active-services';

export default function BookingOptionsScreen() {
  const { barberId, barberName } = useLocalSearchParams<{
    barberId: string;
    barberName: string;
  }>();

  const [selectedDate, setSelectedDate] = useState('');
  const [services, setServices] = useState<BookingOptionService[]>([]);
  const [selectedService, setSelectedService] = useState<BookingOptionService | null>(null);
  const [loadingServices, setLoadingServices] = useState<boolean>(Boolean(barberId));

  // Batch 10B-5E: this screen previously selected from a hardcoded MOCK_SERVICES
  // array whose ids ('1', '2', ...) were never real barberServices/{serviceId}
  // documents -- payment preparation always failed SERVICE_NOT_FOUND downstream.
  // barberRepository.getBarberServices is the same real-data source the Detail
  // Barber screen already uses (useBarberDetail); only the authoritative
  // Firestore document id may ever be forwarded as serviceId.
  useEffect(() => {
    let isMounted = true;
    // loadingServices already initializes to Boolean(barberId), so a falsy
    // barberId starts (and stays) false here -- no synchronous setState needed.
    if (!barberId) {
      return;
    }

    barberRepository.getBarberServices(barberId, true).then((raw) => {
      if (!isMounted) return;
      const active = resolveActiveBookingServices(raw);
      setServices(active);
      setSelectedService(active[0] || null);
      setLoadingServices(false);
    });

    return () => {
      isMounted = false;
    };
  }, [barberId]);

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
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price.toString(),
        bookingType: type,
        date: selectedDate,
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

              {loadingServices ? (
                <View className="items-center py-6">
                  <ActivityIndicator color="#D2691E" />
                </View>
              ) : services.length === 0 ? (
                <View className="rounded-xl bg-white p-6 items-center border border-slate-100">
                  <Text className="text-sm text-slate-500 text-center">
                    Belum ada daftar layanan aktif untuk barber ini.
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {services.map((service) => (
                    <Pressable
                      key={service.id}
                      onPress={() => setSelectedService(service)}
                      className={`flex-row items-center rounded-xl p-4 border-2 ${
                        selectedService?.id === service.id
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
              )}
            </View>

            {/* Payment Summary */}
            <PaymentSummary
              subtotal={selectedService?.price || 0}
              totalPrice={selectedService?.price || 0}
            />

            {/* Booking Type Selection */}
            <View className="gap-3">
              <AppButton
                label="Cukur Ke Rumah"
                onPress={() => handleBookingTypeSelect('home')}
                className="h-14 rounded-lg"
                variant="primary"
                disabled={loadingServices || !selectedService}
              />

              <AppButton
                label="Cukur Di Tempat"
                onPress={() => handleBookingTypeSelect('onsite')}
                className="h-14 rounded-lg"
                variant="secondary"
                disabled={loadingServices || !selectedService}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
