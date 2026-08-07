import { AppButton } from '@/components/ui/AppButton';
import { Loading } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberProfile } from '@/features/barbers/types/barber';
import { Redirect, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function BarberLayout() {
  const { isAuthenticated, emailVerified, user, role, loading: authLoading, logout } = useAuth();

  const userId = user?.uid;
  const isBarberUser = isAuthenticated && role === 'barber' && Boolean(userId);

  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(isBarberUser);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isBarberUser && userId) {
      barberRepository
        .getBarberProfile(userId)
        .then((profile) => {
          if (!isMounted) return;
          setBarberProfile(profile);
          setProfileError(null);
        })
        .catch((err) => {
          if (!isMounted) return;
          setProfileError(err?.message || 'Gagal memuat profil barber.');
        })
        .finally(() => {
          if (isMounted) setProfileLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [isBarberUser, userId]);

  if (authLoading || profileLoading) return <Loading />;

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (user?.isUninitialized) return <Redirect href={"/(auth)/complete-account-setup" as any} />;
  if (!emailVerified) return <Redirect href={"/(auth)/verification-email" as any} />;

  if (role === 'customer') return <Redirect href="/(customer)/home" />;
  if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;

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

  // Check verification status: non-approved barbers must be routed to onboarding status
  if (!barberProfile || barberProfile.verificationStatus === 'draft') {
    return <Redirect href={"/(barber-onboarding)/profile" as any} />;
  }

  if (barberProfile.verificationStatus === 'pending' || barberProfile.verificationStatus === 'rejected') {
    return <Redirect href={"/(barber-onboarding)/status" as any} />;
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
