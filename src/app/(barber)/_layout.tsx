import { AppButton } from '@/components/ui/AppButton';
import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberProfile } from '@/features/barbers/types/barber';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BarberLayout() {
  const { isAuthenticated, emailVerified, user, role, loading: authLoading, logout } = useAuth();

  const userId = user?.uid;
  const isBarberUser = isAuthenticated && role === 'barber' && Boolean(userId);

  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [profileFetched, setProfileFetched] = useState<boolean>(false);

  // Fetch barber profile once the user is confirmed to be a barber
  useEffect(() => {
    let isMounted = true;
    if (isBarberUser && userId) {
      barberRepository
        .getBarberProfile(userId)
        .then((profile) => {
          if (!isMounted) return;
          setBarberProfile(profile);
        })
        .catch((err) => {
          if (!isMounted) return;
          console.warn('[BarberLayout fetch profile error]', err);
        })
        .finally(() => {
          if (isMounted) {
            setProfileFetched(true);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isBarberUser, userId]);

  // Auth-gated redirects via setTimeout to avoid Expo Router commit-phase cascade
  const verificationStatus = barberProfile?.verificationStatus;
  useEffect(() => {
    if (authLoading) return;
    if (isBarberUser && !profileFetched) return;

    let dest: string | undefined;

    if (!isAuthenticated) dest = '/(auth)/login';
    else if (user?.isUninitialized) dest = '/(auth)/complete-account-setup';
    else if (!emailVerified) dest = '/(auth)/verification-email';
    else if (role === 'customer') dest = '/(customer)/home';
    else if (role === 'admin') dest = '/admin-web-only';
    else if (user?.status === 'suspended') return; // handled in render
    else if (!barberProfile || !verificationStatus || verificationStatus === 'draft') dest = '/(barber-onboarding)/profile';
    else if (verificationStatus === 'pending' || verificationStatus === 'rejected') dest = '/(barber-onboarding)/status';

    if (!dest) return; // approved barber — no redirect needed

    const tid = setTimeout(() => router.replace(dest as any), 0);
    return () => clearTimeout(tid);
  }, [authLoading, isAuthenticated, emailVerified, user?.isUninitialized, user?.status, role, isBarberUser, profileFetched, verificationStatus]);

  // Loading states
  if (authLoading || (isBarberUser && !profileFetched)) return <Loading />;

  if (
    !isAuthenticated ||
    user?.isUninitialized ||
    !emailVerified ||
    role === 'customer' ||
    role === 'admin'
  ) {
    return <Loading />;
  }

  if (user?.status === 'suspended') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center p-6">
        <View className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 w-full items-center gap-3">
          <Text className="text-xl font-bold text-red-600">Akun Dinonaktifkan</Text>
          <Text className="text-slate-600 text-center text-sm">
            Akun Master Barber Anda sedang dinonaktifkan oleh administrator. Silakan hubungi dukungan pelanggan.
          </Text>
          <AppButton label="Keluar" onPress={logout} variant="secondary" className="w-full mt-4" />
        </View>
      </SafeAreaView>
    );
  }

  if (!barberProfile || verificationStatus !== 'approved') {
    return <Loading />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="booking/[bookingId]" />
      <Stack.Screen name="analysis" />
      <Stack.Screen name="reviews" />
    </Stack>
  );
}
