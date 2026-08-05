import { AppButton } from '@/components/ui/AppButton';
import { Header } from '@/components/ui/Header';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { SafeAreaView, Text, View } from 'react-native';

export default function BarberHomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Header title="Barber Dashboard" />
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-xl font-bold text-slate-900">Dashboard Barber</Text>
        <Text className="text-center text-slate-600">
          Selamat datang, {user?.displayName || user?.email}!
        </Text>
        <AppButton label="Keluar" onPress={logout} variant="secondary" className="mt-4 w-full" />
      </View>
    </SafeAreaView>
  );
}
