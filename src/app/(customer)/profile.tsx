import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppCard } from '@/components/ui/AppCard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

const items = [
  ['Akun', '/(customer)/profile/account'],
  ['Ubah Password', '/(customer)/profile/change-password'],
  ['Bantuan', '/(customer)/profile/help'],
  ['Tentang', '/(customer)/profile/about'],
] as const;

export default function ProfileScreen() {
  const { user } = useAuth();
  const displayName = user?.displayName || 'Customer URBarber';

  return (
    <CustomerScreen title="Profil" showTabs>
      <View className="mb-6 items-center rounded-2xl bg-white p-6">
        <Avatar name={displayName} size="xl" status="online" />
        <Text className="mt-3 text-xl font-bold text-slate-900">{displayName}</Text>
        <Text className="mt-1 text-sm text-slate-500">{user?.email || 'Lengkapi informasi akun Anda'}</Text>
      </View>
      {items.map(([label, path]) => (
        <AppCard key={path} onPress={() => router.push(path)} className="mb-3 flex-row items-center justify-between p-4">
          <Text className="font-semibold text-slate-900">{label}</Text>
          <Text className="text-xl text-slate-400">›</Text>
        </AppCard>
      ))}
    </CustomerScreen>
  );
}
