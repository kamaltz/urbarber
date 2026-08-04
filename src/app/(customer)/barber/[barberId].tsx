import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { routes } from '@/constants/routes';
import { MOCK_NEARBY_BARBERS } from '@/features/customer/mock/customers';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function BarberDetailScreen() {
  const { barberId } = useLocalSearchParams<{ barberId: string }>();
  const barber = MOCK_NEARBY_BARBERS.find((item) => item.barberId === barberId) ?? MOCK_NEARBY_BARBERS[0];

  return (
    <CustomerScreen
      title="Detail Barber"
      description={barber.location}
      action={{
        label: 'Pilih Barber',
        onPress: () => router.push({ pathname: routes.customer.bookingOptions, params: { barberId: barber.barberId, barberName: barber.name } }),
      }}>
      <View className="rounded-2xl bg-white p-5">
        <Text className="text-2xl font-bold text-slate-900">{barber.name}</Text>
        <Text className="mt-2 text-slate-600">{barber.serviceType}</Text>
        <Text className="mt-2 font-semibold text-[#D2691E]">★ {barber.rating} · {barber.reviewCount} ulasan</Text>
      </View>
    </CustomerScreen>
  );
}

