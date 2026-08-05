import { AppButton } from '@/components/ui/AppButton';
import { Header } from '@/components/ui/Header';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { SafeAreaView, Text, View } from 'react-native';

export default function AdminDashboardScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Header title="Admin Dashboard" />
      <View className="flex-1 items-center justify-center px-6 gap-4">
        <Text className="text-xl font-bold text-slate-900">Dashboard Admin</Text>
        <Text className="text-center text-slate-600">
          Selamat datang, Admin {user?.displayName || user?.email}!
        </Text>
        <AppButton label="Keluar" onPress={logout} variant="secondary" className="mt-4 w-full" />
      </View>
    </SafeAreaView>
  );
}
