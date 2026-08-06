import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppCard } from '@/components/ui/AppCard';
import Constants from 'expo-constants';
import { ScrollView, Text, View } from 'react-native';

export default function AboutScreen() {
  const appVersion = Constants.expoConfig?.version || '1.0.0';

  return (
    <CustomerScreen
      title="Tentang URBarber"
      description="Platform digital pemesanan jasa panggil barber (home-service) berbasis mobile."
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="items-center py-6 mb-2">
          <View className="w-20 h-20 rounded-2xl bg-[#D2691E] items-center justify-center shadow-sm mb-3">
            <Text className="text-3xl font-black text-white">UR</Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900">URBarber</Text>
          <Text className="text-xs text-slate-500 mt-1">Versi Aplikasi {appVersion}</Text>
        </View>

        <AppCard className="p-5 mb-4">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Deskripsi Aplikasi
          </Text>
          <Text className="text-xs text-slate-700 leading-relaxed mb-3">
            URBarber adalah aplikasi pemesanan jasa panggil barber ke rumah di wilayah Garut yang menghubungkan pelanggan dengan barber profesional terverifikasi secara praktis dan transparan.
          </Text>
          <Text className="text-xs text-slate-700 leading-relaxed">
            Dilengkapi dengan fitur pencarian berdasar kategori, peninjauan profil barber, ulasan asli pelanggan, dan alur pemesanan terintegrasi.
          </Text>
        </AppCard>

        <AppCard className="p-5 mb-6 bg-slate-50 border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Teknologi Baseline
          </Text>
          <Text className="text-xs text-slate-600">• Expo SDK 57 (React Native 0.86)</Text>
          <Text className="text-xs text-slate-600 mt-1">• Firebase Authentication & Cloud Firestore</Text>
          <Text className="text-xs text-slate-600 mt-1">• Supabase Media Storage</Text>
          <Text className="text-xs text-slate-600 mt-1">• NativeWind (Tailwind CSS v3)</Text>
        </AppCard>
      </ScrollView>
    </CustomerScreen>
  );
}
