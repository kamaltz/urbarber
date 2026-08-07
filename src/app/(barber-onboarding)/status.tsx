import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  barberRegistrationService,
  type BarberRegistrationData,
} from '@/features/barbers/services/barber-registration.service';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, Text, View } from 'react-native';

export default function BarberOnboardingStatusScreen() {
  const { user, logout, reloadUser } = useAuth();
  const uid = user?.uid || '';

  const [regData, setRegData] = useState<BarberRegistrationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!uid) return;
    try {
      const data = await barberRegistrationService.getRegistration(uid);
      setRegData(data);

      if (data?.verificationStatus === 'approved') {
        await reloadUser();
        router.replace('/(barber)/home');
      }
    } catch (err) {
      console.warn('Failed to fetch barber verification status:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [uid, reloadUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (uid) {
        fetchStatus();
      } else {
        setIsLoading(false);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [uid, fetchStatus]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await reloadUser();
    await fetchStatus();
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const handleEditProfile = () => {
    router.push('/(barber-onboarding)/profile' as any);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#D2691E" size="large" />
      </SafeAreaView>
    );
  }

  const verifStatus = regData?.verificationStatus || 'pending';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center px-6 py-8">
        {verifStatus === 'pending' ? (
          <View className="items-center rounded-2xl bg-amber-50 p-6 border border-amber-200 mb-6">
            <Text className="text-4xl mb-2">⏳</Text>
            <Text className="text-xl font-bold text-amber-900 text-center">
              Verifikasi Pendaftaran Diproses
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-700">
              Pendaftaran akun Mitra Barber Anda sedang ditinjau oleh tim verifikasi platform URBarber.
            </Text>
            <Text className="mt-3 text-xs text-slate-500 text-center">
              Proses verifikasi membutuhkan waktu 1-2 hari kerja. Anda akan menerima notifikasi setelah status pendaftaran Anda disetujui.
            </Text>
          </View>
        ) : verifStatus === 'rejected' ? (
          <View className="items-center rounded-2xl bg-rose-50 p-6 border border-rose-200 mb-6">
            <Text className="text-4xl mb-2">⚠️</Text>
            <Text className="text-xl font-bold text-rose-900 text-center">
              Pendaftaran Ditolak
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-700">
              {regData?.rejectionReason ||
                'Permohonan pendaftaran Mitra Barber Anda belum dapat disetujui. Silakan periksa kembali kelengkapan profil dan dokumen Anda.'}
            </Text>
          </View>
        ) : (
          <View className="items-center rounded-2xl bg-emerald-50 p-6 border border-emerald-200 mb-6">
            <Text className="text-4xl mb-2">🎉</Text>
            <Text className="text-xl font-bold text-emerald-900 text-center">
              Pendaftaran Disetujui!
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-700">
              Selamat, akun Mitra Barber Anda telah aktif. Silakan masuk ke dashboard operasional Anda.
            </Text>
          </View>
        )}

        <View className="gap-3">
          {verifStatus === 'rejected' ? (
            <AppButton
              label="Perbaiki Profile & Unggah Ulang Dokumen"
              onPress={handleEditProfile}
              className="h-[54px] rounded-xl bg-[#D2691E]"
            />
          ) : (
            <AppButton
              label={isRefreshing ? 'Memeriksa Status...' : 'Cek Status Verifikasi Terkini'}
              onPress={handleRefresh}
              loading={isRefreshing}
              className="h-[54px] rounded-xl bg-slate-900"
            />
          )}

          <AppButton
            label="Keluar dari Akun"
            onPress={handleLogout}
            variant="secondary"
            className="h-[54px] rounded-xl mt-2"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
