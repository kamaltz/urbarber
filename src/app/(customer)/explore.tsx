import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppCard } from '@/components/ui/AppCard';
import { Rating } from '@/components/ui/Rating';
import { routes } from '@/constants/routes';
import { MOCK_NEARBY_BARBERS } from '@/features/customer/mock/customers';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

export default function ExploreScreen() {
  return (
    <CustomerScreen title="Cari Barber" description="Temukan barber terdekat dan pilih yang sesuai." showTabs>
      <View className="gap-3">
        {MOCK_NEARBY_BARBERS.map((barber) => (
          <AppCard key={barber.barberId} onPress={() => router.push(routes.customer.barber(barber.barberId))} className="p-4">
            <Text className="text-base font-bold text-slate-900">{barber.name}</Text>
            <Text className="mt-1 text-sm text-slate-600">{barber.serviceType} · {barber.distance}</Text>
            <View className="mt-2"><Rating value={barber.rating} size="sm" /></View>
          </AppCard>
        ))}
      </View>
    </CustomerScreen>
  );
}

