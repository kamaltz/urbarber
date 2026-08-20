import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { BrandText } from '@/components/ui/BrandText';
import Constants from 'expo-constants';
import { ScrollView, Text, View } from 'react-native';

const APP_HIGHLIGHTS = [
  { icon: '💈', title: 'Layanan Home Service & On-Shop', desc: 'Pesan barber panggil ke lokasi Anda atau buat janji temu di barbershop.' },
  { icon: '⭐', title: 'Barber Terverifikasi', desc: 'Jaminan kualitas dengan daftar barber profesional dan ulasan asli pelanggan.' },
  { icon: '⚡', title: 'Pemesanan Real-Time', desc: 'Atur jadwal bebas antre dengan status tracking dan konfirmasi instan.' },
] as const;

export default function AboutScreen() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <CustomerScreen
      title="Tentang URBarber"
      description="Platform digital pemesanan layanan barber panggil (home-service) dan barbershop modern."
      scroll={false}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* App Branding Banner */}
        <View className="items-center py-6 mb-4 rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs">
          <BrandLogo variant="compact" className="w-20 h-20 rounded-2xl shadow-md mb-3" />
          <BrandText size="lg" className="mb-1" />
          <View className="mt-2 rounded-full bg-[#EDEFFB] px-3.5 py-1">
            <Text className="text-xs font-bold text-[#363062]">
              Versi Aplikasi {appVersion}
            </Text>
          </View>
        </View>

        {/* Application Description Card */}
        <View className="p-5 mb-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider mb-2">
            Deskripsi Platform
          </Text>
          <Text className="text-xs text-slate-600 leading-relaxed mb-3">
            URBarber adalah solusi digital terpadu untuk pemesanan jasa panggil barber (home-service) dan janji temu barbershop di wilayah Garut, Jawa Barat.
          </Text>
          <Text className="text-xs text-slate-600 leading-relaxed">
            Menghubungkan pelanggan dengan mitra barber berpengalaman dengan harga transparan, opsi pembayaran terintegrasi, dan pemantauan lokasi real-time.
          </Text>
        </View>

        {/* App Highlights List */}
        <View className="p-5 mb-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs gap-4">
          <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
            Keunggulan Utama
          </Text>

          {APP_HIGHLIGHTS.map((item, idx) => (
            <View key={idx} className="flex-row gap-3 items-start">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#EDEFFB]">
                <Text className="text-base">{item.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#363062]">{item.title}</Text>
                <Text className="text-xs text-slate-500 mt-0.5 leading-4">{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Technology Baseline Card */}
        <View className="p-5 mb-6 rounded-2xl bg-[#EDEFFB]/70 border border-[#363062]/10">
          <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider mb-2">
            Teknologi Baseline
          </Text>
          <Text className="text-xs text-[#363062]/80 font-medium">• Expo SDK 57 (React Native 0.86)</Text>
          <Text className="text-xs text-[#363062]/80 font-medium mt-1.5">• Firebase Auth & Cloud Firestore</Text>
          <Text className="text-xs text-[#363062]/80 font-medium mt-1.5">• Supabase Storage & Midtrans Payment</Text>
          <Text className="text-xs text-[#363062]/80 font-medium mt-1.5">• NativeWind (Tailwind CSS v3)</Text>
        </View>
      </ScrollView>
    </CustomerScreen>
  );
}
