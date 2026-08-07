import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRegistrationService } from '@/features/barbers/services/barber-registration.service';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function BarberOnboardingProfileScreen() {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [ownerName, setOwnerName] = useState(user?.displayName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [shopName, setShopName] = useState('');
  const [shopDescription, setShopDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (uid) {
        const reg = await barberRegistrationService.getRegistration(uid);
        if (!isMounted) return;
        if (reg) {
          if (reg.ownerName) setOwnerName(reg.ownerName);
          if (reg.phoneNumber) setPhoneNumber(reg.phoneNumber);
          if (reg.shopName) setShopName(reg.shopName);
          if (reg.shopDescription) setShopDescription(reg.shopDescription);
        }
      }
      if (isMounted) {
        setIsFetching(false);
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [uid]);

  const handleNext = async () => {
    setError('');
    if (!ownerName.trim()) {
      setError('Nama pemilik wajib diisi.');
      return;
    }
    if (!phoneNumber.trim()) {
      setError('Nomor telepon wajib diisi.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await barberRegistrationService.saveProfileDraft(uid, {
        ownerName: ownerName.trim(),
        phoneNumber: phoneNumber.trim(),
        shopName: shopName.trim() || ownerName.trim(),
        shopDescription: shopDescription.trim(),
      });

      if (!res.success) {
        setError(res.error || 'Gagal menyimpan draf profil.');
        return;
      }

      router.push('/(barber-onboarding)/business' as any);
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
          {/* Header & Step Indicator */}
          <View className="mb-6">
            <Text className="text-xs font-bold uppercase tracking-wider text-[#D2691E]">
              Langkah 1 dari 4 — Profil
            </Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">
              Profil Barber & Usaha
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Lengkapi informasi pribadi dan nama barbershop/outlet Anda.
            </Text>
          </View>

          <View className="gap-4">
            <AppInput
              label="Nama Lengkap Pemilik *"
              placeholder="Contoh: Budi Santoso"
              value={ownerName}
              onChangeText={setOwnerName}
              editable={!isLoading && !isFetching}
            />

            <AppInput
              label="Nomor Telepon *"
              placeholder="+62 812 3456 7890"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!isLoading && !isFetching}
            />

            <AppInput
              label="Nama Barbershop / Display Name *"
              placeholder="Contoh: Crown Barbershop Utama"
              value={shopName}
              onChangeText={setShopName}
              editable={!isLoading && !isFetching}
            />

            <AppInput
              label="Deskripsi Singkat Usaha"
              placeholder="Jelaskan keahlian atau layanan unggulan Anda..."
              value={shopDescription}
              onChangeText={setShopDescription}
              multiline
              numberOfLines={3}
              editable={!isLoading && !isFetching}
            />

            {error ? (
              <Text className="text-center text-sm text-rose-600">{error}</Text>
            ) : null}

            <AppButton
              label={isLoading ? 'Menyimpan...' : 'Lanjut ke Alamat Usaha ›'}
              onPress={handleNext}
              loading={isLoading || isFetching}
              className="h-[54px] rounded-xl bg-[#D2691E] mt-4"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
