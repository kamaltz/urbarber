import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import {
  barberRegistrationService,
  type BarberRegistrationData,
} from '@/features/barbers/services/barber-registration.service';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function BarberOnboardingReviewScreen() {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [regData, setRegData] = useState<BarberRegistrationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (uid) {
      barberRegistrationService.getRegistration(uid).then((data) => {
        if (!isMounted) return;
        setRegData(data);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [uid]);

  const handleSubmit = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const res = await barberRegistrationService.submitRegistration();
      if (!res.success) {
        setError(res.error || 'Gagal mengirimkan pendaftaran.');
        return;
      }

      router.replace('/(barber-onboarding)/status' as any);
    } catch (err: any) {
      setError('Terjadi kesalahan saat mengirimkan pendaftaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-5 pt-6 pb-8">
        <View className="flex-row items-center gap-2 mb-4">
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text className="text-2xl text-slate-700">‹ Kembali</Text>
          </Pressable>
        </View>

        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#D2691E]">
            Langkah 4 dari 4 — Ringkasan
          </Text>
          <Text className="text-2xl font-bold text-slate-900 mt-1">
            Peninjauan Pendaftaran
          </Text>
          <Text className="text-sm text-slate-500 mt-1">
            Periksa kembali data Anda sebelum mengirimkan permohonan verifikasi.
          </Text>
        </View>

        <View className="gap-4">
          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4 gap-3">
            <View>
              <Text className="text-xs text-slate-500 font-medium">Nama Pemilik / Mitra</Text>
              <Text className="text-base font-bold text-slate-900">{regData?.ownerName || user?.displayName || '-'}</Text>
            </View>

            <View>
              <Text className="text-xs text-slate-500 font-medium">Nomor Telepon</Text>
              <Text className="text-base font-bold text-slate-900">{regData?.phoneNumber || user?.phoneNumber || '-'}</Text>
            </View>

            <View>
              <Text className="text-xs text-slate-500 font-medium">Nama Barbershop / Display Name</Text>
              <Text className="text-base font-bold text-slate-900">{regData?.shopName || '-'}</Text>
            </View>

            <View>
              <Text className="text-xs text-slate-500 font-medium">Alamat Usaha</Text>
              <Text className="text-sm font-semibold text-slate-800">{regData?.shopAddress || '-'}</Text>
            </View>

            <View>
              <Text className="text-xs text-slate-500 font-medium">Dokumen Terunggah</Text>
              <Text className="text-sm font-bold text-emerald-600">
                {regData?.documentPaths?.ktp ? '✓ Dokumen KTP Terverifikasi' : '❌ KTP Belum Diunggah'}
              </Text>
            </View>
          </View>

          {error ? (
            <Text className="text-center text-sm text-rose-600 mt-1">{error}</Text>
          ) : null}

          <AppButton
            label={isSubmitting ? 'Mengirim Pendaftaran...' : 'Kirim Pendaftaran Mitra Barber'}
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!regData?.documentPaths?.ktp}
            className="h-[54px] rounded-xl bg-[#D2691E] mt-4"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
