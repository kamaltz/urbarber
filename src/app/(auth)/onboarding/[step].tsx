import { AppButton } from '@/components/ui/AppButton';
import { routes } from '@/constants/routes';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, Text, View } from 'react-native';

const steps = [
  { eyebrow: 'URBARBER', title: 'Selamat Datang', description: 'Temukan pengalaman grooming yang lebih mudah dan nyaman.', icon: '✂', button: 'Mulai' },
  { eyebrow: 'TEMUKAN', title: 'Barber Terbaik di Sekitarmu', description: 'Jelajahi barber profesional, layanan, harga, dan ulasan dalam satu aplikasi.', icon: '⌖', button: 'Selanjutnya' },
  { eyebrow: 'PESAN', title: 'Atur Jadwal Tanpa Antre', description: 'Pilih layanan serta waktu yang cocok, lalu pantau proses booking secara langsung.', icon: '▣', button: 'Selanjutnya' },
  { eyebrow: 'FLEKSIBEL', title: 'Datang atau Panggil ke Rumah', description: 'Nikmati layanan di barbershop atau panggil barber ke lokasi pilihanmu.', icon: '⌂', button: 'Masuk' },
] as const;

export default function OnboardingScreen() {
  const { step: rawStep } = useLocalSearchParams<{ step: string }>();
  const parsedStep = Number(rawStep);
  const step = Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep <= 3 ? parsedStep as 0 | 1 | 2 | 3 : 0;
  const content = steps[step];

  const continueFlow = () => {
    if (step < 3) router.push(routes.auth.onboarding((step + 1) as 1 | 2 | 3));
    else router.replace(routes.auth.login);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <View className="flex-1 items-center justify-center overflow-hidden px-6">
        <View className="absolute h-72 w-72 rounded-full bg-orange-100" />
        <View className="h-44 w-44 items-center justify-center rounded-full bg-white shadow-lg">
          <Text className="text-7xl text-[#D2691E]">{content.icon}</Text>
        </View>
        <Text className="mt-8 text-xs font-bold tracking-[4px] text-[#D2691E]">{content.eyebrow}</Text>
      </View>
      <View className="rounded-t-[32px] bg-[#F59E0B] px-[18px] pb-5 pt-6">
        <Text className="text-2xl font-bold leading-8 text-white">{content.title}</Text>
        <Text className="mt-2 min-h-12 text-sm leading-5 text-white/90">{content.description}</Text>
        <View className="my-5 flex-row gap-2">
          {steps.map((_, index) => <View key={index} className={`h-2 rounded-full ${index === step ? 'w-7 bg-white' : 'w-2 bg-white/40'}`} />)}
        </View>
        <AppButton label={content.button} onPress={continueFlow} className="h-[54px] rounded-lg bg-[#D2691E]" />
        {step > 0 ? <Text onPress={() => router.replace(routes.auth.login)} className="mt-4 text-center text-sm font-semibold text-white">Lewati</Text> : null}
      </View>
    </SafeAreaView>
  );
}
