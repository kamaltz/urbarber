import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppCard } from '@/components/ui/AppCard';
import { routes } from '@/constants/routes';
import { MOCK_BARBER_SUGGESTIONS } from '@/features/customer/mock/customers';
import { router } from 'expo-router';
import { Text } from 'react-native';

export default function FavoritesScreen() {
  return (
    <CustomerScreen title="Barber Favorit" showTabs>
      {MOCK_BARBER_SUGGESTIONS.slice(0, 2).map((barber) => (
        <AppCard key={barber.barberId} onPress={() => router.push(routes.customer.barber(barber.barberId))} className="mb-3 p-4">
          <Text className="font-bold text-slate-900">{barber.name}</Text>
          <Text className="mt-1 text-sm text-slate-600">{barber.location}</Text>
        </AppCard>
      ))}
    </CustomerScreen>
  );
}

