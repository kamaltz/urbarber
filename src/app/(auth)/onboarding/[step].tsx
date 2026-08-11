import { AppButton } from '@/components/ui/AppButton';
import { routes } from '@/constants/routes';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, Text, View } from 'react-native';

const steps = [
  {
    eyebrow: 'URBARBER',
    title: 'Selamat Datang',
    description: 'Temukan pengalaman grooming premium yang lebih mudah, cepat, dan nyaman di genggaman Anda.',
    icon: '✂',
    subtitle: 'Solusi Grooming Pria Modern',
    button: 'Mulai',
  },
  {
    eyebrow: 'TEMUKAN',
    title: 'Barber Terbaik di Sekitarmu',
    description: 'Jelajahi barber profesional, ragam layanan, harga transparan, dan ulasan asli dalam satu aplikasi.',
    icon: '⌖',
    subtitle: 'Pilihan Barber Terverifikasi',
    button: 'Selanjutnya',
  },
  {
    eyebrow: 'PESAN',
    title: 'Atur Jadwal Tanpa Antre',
    description: 'Pilih layanan serta waktu yang paling cocok, lalu pantau status pesanan secara langsung.',
    icon: '▣',
    subtitle: 'Booking Instan & Transparan',
    button: 'Selanjutnya',
  },
  {
    eyebrow: 'FLEKSIBEL',
    title: 'Datang atau Panggil ke Rumah',
    description: 'Nikmati layanan di barbershop favoritmu atau panggil barber berpengalaman langsung ke lokasimu.',
    icon: '⌂',
    subtitle: 'Layanan Home Service & On-Shop',
    button: 'Masuk',
  },
] as const;

export default function OnboardingScreen() {
  const { step: rawStep } = useLocalSearchParams<{ step: string }>();
  const parsedStep = Number(rawStep);
  const step = Number.isInteger(parsedStep) && parsedStep >= 0 && parsedStep <= 3 ? (parsedStep as 0 | 1 | 2 | 3) : 0;
  const content = steps[step];

  const continueFlow = () => {
    if (step < 3) router.push(routes.auth.onboarding((step + 1) as 1 | 2 | 3));
    else router.replace(routes.auth.login);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Top Header / Skip affordance */}
      <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
        <View className="flex-row items-center gap-1.5 rounded-full bg-[#EDEFFB] px-3 py-1">
          <View className="h-2 w-2 rounded-full bg-[#363062]" />
          <Text className="text-xs font-semibold tracking-wider text-[#363062]">
            {step + 1} / {steps.length}
          </Text>
        </View>

        {step > 0 ? (
          <Pressable
            onPress={() => router.replace(routes.auth.login)}
            className="rounded-full px-3 py-1 active:bg-slate-100"
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text className="text-sm font-semibold text-slate-500">Lewati</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Hero Illustration & Graphic Badge Area */}
      <View className="flex-1 items-center justify-center px-6">
        <View className="relative items-center justify-center">
          {/* Subtle Ambient Glow */}
          <View className="absolute h-64 w-64 rounded-full bg-[#EDEFFB] opacity-80" />
          <View className="absolute h-48 w-48 rounded-full bg-[#D2691E]/10" />

          {/* Elevated Icon Card */}
          <View className="h-44 w-44 items-center justify-center rounded-3xl bg-white p-4 shadow-lg shadow-slate-200 border border-slate-100">
            <View className="h-24 w-24 items-center justify-center rounded-2xl bg-[#363062]/5">
              <Text className="text-6xl text-[#D2691E]">{content.icon}</Text>
            </View>
          </View>
        </View>

        <View className="mt-8 items-center">
          <Text className="text-xs font-bold tracking-[4px] text-[#D2691E] uppercase">
            {content.eyebrow}
          </Text>
          <Text className="mt-1 text-xs font-medium text-slate-400">
            {content.subtitle}
          </Text>
        </View>
      </View>

      {/* Bottom Sheet Card Container */}
      <View className="rounded-t-[32px] bg-[#363062] px-6 pt-8 pb-8 shadow-2xl">
        <Text className="text-2xl font-bold leading-8 text-white">
          {content.title}
        </Text>
        <Text className="mt-3 min-h-[52px] text-sm leading-6 text-slate-300">
          {content.description}
        </Text>

        {/* Step Indicator Pagination Slider */}
        <View className="my-6 flex-row items-center gap-2">
          {steps.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === step ? 'w-8 bg-[#D2691E]' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </View>

        {/* Primary CTA Button */}
        <AppButton
          label={content.button}
          onPress={continueFlow}
          className="h-[54px] rounded-xl bg-[#D2691E] active:bg-[#b85a19]"
        />
      </View>
    </SafeAreaView>
  );
}
