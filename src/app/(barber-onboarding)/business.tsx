import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRegistrationService } from '@/features/barbers/services/barber-registration.service';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function BarberOnboardingBusinessScreen() {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [shopAddress, setShopAddress] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (uid) {
      barberRegistrationService.getRegistration(uid).then((reg) => {
        if (!isMounted) return;
        if (reg) {
          if (reg.shopAddress) setShopAddress(reg.shopAddress);
          if (reg.serviceArea) setServiceArea(reg.serviceArea);
          if (reg.ownerName) setOwnerName(reg.ownerName);
          if (reg.phoneNumber) setPhoneNumber(reg.phoneNumber);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [uid]);

  const handleNext = async () => {
    setError('');
    if (!shopAddress.trim()) {
      setError('Alamat lengkap barbershop / domisili usaha wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await barberRegistrationService.saveProfileDraft(uid, {
        ownerName: ownerName || user?.displayName || 'Mitra Barber',
        phoneNumber: phoneNumber || user?.phoneNumber || '',
        shopAddress: shopAddress.trim(),
        serviceArea: serviceArea.trim(),
      });

      if (!res.success) {
        setError(res.error || 'Gagal menyimpan alamat usaha.');
        return;
      }

      router.push('/(barber-onboarding)/documents' as any);
    } catch (err: any) {
      setError('Terjadi kesalahan saat menyimpan data.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 px-5 pt-6 pb-8">
          <View className="flex-row items-center gap-2 mb-4">
            <Pressable onPress={() => router.back()} hitSlop={10}>
              <Text className="text-2xl text-slate-700">‹ Kembali</Text>
            </Pressable>
          </View>

          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#D2691E]">
              Langkah 2 dari 4 — Lokasi Usaha
            </Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">
              Alamat & Jangkauan Layanan
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Tentukan alamat barbershop / pangkas rambut dan area jangkauan home-service.
            </Text>
          </View>

          <View className="gap-4">
            <AppInput
              label="Alamat Lengkap Barbershop / Operasional *"
              placeholder="Contoh: Jl. Sudirman No. 45, Jakarta Selatan"
              value={shopAddress}
              onChangeText={setShopAddress}
              multiline
              numberOfLines={3}
              editable={!isLoading}
            />

            <AppInput
              label="Area Jangkauan Layanan Home-Service"
              placeholder="Contoh: Jakarta Selatan, Kebayoran Baru, Cilandak"
              value={serviceArea}
              onChangeText={setServiceArea}
              editable={!isLoading}
            />

            {error ? (
              <Text className="text-center text-sm text-rose-600">{error}</Text>
            ) : null}

            <AppButton
              label={isLoading ? 'Menyimpan...' : 'Lanjut ke Upload Dokumen ›'}
              onPress={handleNext}
              loading={isLoading}
              className="h-[54px] rounded-xl bg-[#D2691E] mt-4"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
