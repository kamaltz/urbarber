import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Redirect, Slot } from 'expo-router';
import { Text, View } from 'react-native';

export default function AdminLayout() {
  const { isAuthenticated, emailVerified, user, role, loading } = useAuth();

  if (loading) return <Loading />;

  // Must be authenticated
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  // Must have verified email
  if (!emailVerified) return <Redirect href="/(auth)/authentication" />;

  // Redirect non-admin roles to their home screens
  if (role === 'customer') return <Redirect href="/(customer)/home" />;
  if (role === 'barber') return <Redirect href="/(barber)/home" />;

  // Must have admin role (set by Firebase custom claims via provisioning script)
  if (role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-xl font-bold text-red-600 text-center">Akses Ditolak</Text>
        <Text className="text-slate-600 mt-2 text-center">
          Akun Anda tidak memiliki akses administrator.
        </Text>
      </View>
    );
  }

  // Suspended admin cannot use admin operations
  if (user?.status === 'suspended') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-xl font-bold text-orange-600 text-center">Akun Ditangguhkan</Text>
        <Text className="text-slate-600 mt-2 text-center">
          Akun administrator Anda telah ditangguhkan. Hubungi super admin.
        </Text>
      </View>
    );
  }

  return <Slot />;
}
