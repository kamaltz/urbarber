import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { router } from 'expo-router';

export default function AdminWebOnlyScreen() {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
      <View className="bg-white rounded-2xl p-8 shadow-lg max-w-sm w-full">
        <Text className="text-2xl font-bold text-slate-900 text-center mb-4">
          Admin Portal
        </Text>

        <Text className="text-center text-slate-700 mb-8 leading-6">
          Akun Admin hanya dapat digunakan melalui URBarber Admin Web.
        </Text>

        <Text className="text-center text-sm text-slate-500 mb-8">
          Silakan akses admin.urbarber.com untuk melanjutkan.
        </Text>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-blue-600 rounded-lg py-3 active:bg-blue-700"
        >
          <Text className="text-white font-semibold text-center">
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
