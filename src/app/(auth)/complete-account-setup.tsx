import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { accountBootstrapService } from '@/features/auth/services/account-bootstrap.service';
import { firebaseAuth } from '@/lib/firebase';
import type { PublicRegistrationRole } from '@/types/domain';
import { router } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';

export default function CompleteAccountSetupScreen() {
  const { user, logout, reloadUser } = useAuth();
  const [requestedRole, setRequestedRole] = useState<PublicRegistrationRole>('customer');
  const [name, setName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRetrySetup = async () => {
    setError('');
    if (!name.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        setError('Sesi pengguna tidak terautentikasi. Silakan login kembali.');
        return;
      }

      const res = await accountBootstrapService.initializeAccount({
        requestedRole,
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      if (!res.success) {
        setError(res.error?.message || 'Gagal menyelesaikan inisialisasi akun.');
        return;
      }

      // Force token refresh & reload user profile in AuthProvider
      await reloadUser();
    } catch (err: any) {
      setError('Terjadi kesalahan saat menyelesaikan penyiapan akun.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6 py-8">
        <View className="items-center rounded-2xl bg-amber-50 p-6 border border-amber-200 mb-6">
          <Text className="text-4xl mb-2">⚙️</Text>
          <Text className="text-xl font-bold text-amber-900 text-center">Lengkapi Penyiapan Akun</Text>
          <Text className="mt-2 text-center text-sm text-slate-700">
            Akun autentikasi Anda ditemukan, tetapi profil peran database belum terinisialisasi.
          </Text>
        </View>

        {/* Role Selector */}
        <View className="flex-row mb-4 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${
              requestedRole === 'customer' ? 'bg-white shadow-sm' : ''
            }`}
            onPress={() => setRequestedRole('customer')}
            disabled={isLoading}>
            <Text
              className={`text-xs font-bold ${
                requestedRole === 'customer' ? 'text-slate-900' : 'text-slate-500'
              }`}>
              👤 Pelanggan (Customer)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-2.5 rounded-lg items-center ${
              requestedRole === 'barber' ? 'bg-[#D2691E] shadow-sm' : ''
            }`}
            onPress={() => setRequestedRole('barber')}
            disabled={isLoading}>
            <Text
              className={`text-xs font-bold ${
                requestedRole === 'barber' ? 'text-white' : 'text-slate-500'
              }`}>
              💈 Mitra Barber
            </Text>
          </TouchableOpacity>
        </View>

        <View className="gap-4">
          <AppInput
            label="Nama Lengkap *"
            placeholder="Masukkan nama lengkap Anda"
            value={name}
            onChangeText={setName}
            editable={!isLoading}
          />

          <AppInput
            label="Nomor Telepon"
            placeholder="+62 812 3456 7890"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
            editable={!isLoading}
          />

          {error ? (
            <Text className="text-center text-sm text-rose-600">{error}</Text>
          ) : null}

          <AppButton
            label={isLoading ? 'Menginisialisasi...' : 'Selesaikan Penyiapan Akun'}
            onPress={handleRetrySetup}
            loading={isLoading}
            className="h-[54px] rounded-xl bg-slate-900 mt-2"
          />

          <AppButton
            label="Keluar dari Akun"
            onPress={handleLogout}
            variant="secondary"
            className="h-[54px] rounded-xl"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
