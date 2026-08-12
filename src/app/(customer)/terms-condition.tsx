import { AppButton } from '@/components/ui/AppButton';
import { backOrReplace } from '@/lib/navigation';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

const TERMS_SECTIONS = [
  {
    id: '1',
    title: '1. Ketentuan Umum & Registrasi',
    content:
      'Dengan mendaftar dan menggunakan aplikasi URBarber, Anda menyetujui untuk memberikan data diri yang akurat dan sah. Pengguna bertanggung jawab menjaga kerahasiaan akun serta seluruh aktivitas yang terjadi di bawah akun tersebut.',
  },
  {
    id: '2',
    title: '2. Pemesanan & Slot Booking',
    content:
      'Pemesanan layanan barber menggunakan sistem penahanan slot sementara (15 menit). Slot booking secara sah dimiliki oleh pelanggan setelah status pembayaran terkonfirmasi LUNAS (paid). Pembatalan hanya dapat dilakukan sebelum status pengerjaan masuk ke dalam tahap in_progress.',
  },
  {
    id: '3',
    title: '3. Pembayaran & Kebijakan Refund',
    content:
      'Seluruh transaksi diproses secara aman melalui payment gateway Midtrans Sandbox. Jika booking yang sudah dibayar ditolak oleh pihak barber, sistem akan mencatat status refundRequired untuk penanganan rekonsiliasi manual oleh admin.',
  },
  {
    id: '4',
    title: '4. Privasi & Pelacakan Lokasi',
    content:
      'URBarber mengakses lokasi perangkat (GPS foreground) hanya saat layanan aktif berjalan untuk mengarahkan barber ke lokasi pelanggan atau menampilkan posisi barber kepada pelanggan yang bersangkutan.',
  },
] as const;

export default function TermsScreen() {
  const handleAccept = () => {
    backOrReplace('/(customer)/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Top Header Navigation Bar */}
      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <Pressable
          onPress={handleAccept}
          className="mr-3 rounded-full p-2 active:bg-slate-100"
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Text className="text-xl font-bold text-[#363062]">←</Text>
        </Pressable>
        <View>
          <Text className="text-lg font-bold text-[#363062]">Syarat & Ketentuan</Text>
          <Text className="text-xs text-slate-500">Terakhir diperbarui: Agustus 2026</Text>
        </View>
      </View>

      {/* Main Scroll Content */}
      <ScrollView className="flex-1 px-4 py-5" contentContainerClassName="pb-6">
        {/* Banner Card */}
        <View className="mb-5 rounded-2xl bg-[#EDEFFB] p-4 border border-[#363062]/10">
          <View className="flex-row items-center gap-2 mb-1">
            <Text className="text-base">📜</Text>
            <Text className="font-bold text-[#363062] text-sm">Informasi Penting</Text>
          </View>
          <Text className="text-xs leading-5 text-[#363062]/80">
            Harap baca syarat dan ketentuan berikut secara seksama sebelum menggunakan seluruh fitur layanan URBarber.
          </Text>
        </View>

        {/* Legal Sections */}
        <View className="gap-4">
          {TERMS_SECTIONS.map((section) => (
            <View
              key={section.id}
              className="rounded-2xl bg-white p-5 border border-slate-200 shadow-sm"
            >
              <Text className="text-base font-bold text-[#363062] mb-2">
                {section.title}
              </Text>
              <Text className="text-sm leading-6 text-slate-600">
                {section.content}
              </Text>
            </View>
          ))}
        </View>

        {/* Footnote Notice */}
        <View className="mt-6 items-center px-4">
          <Text className="text-center text-xs leading-5 text-slate-400">
            Dengan menekan tombol di bawah, Anda mengonfirmasi bahwa Anda telah membaca, memahami, dan menyetujui seluruh ketentuan layanan URBarber.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Action */}
      <View className="border-t border-slate-200 bg-white px-4 py-4">
        <AppButton
          label="Saya Mengerti & Setuju"
          onPress={handleAccept}
          className="h-[54px] rounded-xl bg-[#D2691E] active:bg-[#b85a19]"
        />
      </View>
    </SafeAreaView>
  );
}
