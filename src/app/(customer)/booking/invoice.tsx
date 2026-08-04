import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { routes } from '@/constants/routes';
import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function BookingInvoiceScreen() {
  const { serviceName, servicePrice, selectedDate, selectedTime, barberName } = useLocalSearchParams<Record<string, string>>();
  const price = Number(servicePrice || 0);
  return (
    <CustomerScreen title="Konfirmasi Pesanan" description="Periksa detail berikut sebelum menyelesaikan pemesanan."
      action={{ label: 'Konfirmasi Booking', onPress: () => router.replace(routes.customer.bookingHistory) }}>
      <View className="gap-3 rounded-2xl bg-white p-5">
        <Text className="font-bold text-slate-900">{barberName || 'Barber pilihan Anda'}</Text>
        <Text className="text-slate-600">{serviceName || 'Layanan barber'}</Text>
        <Text className="text-slate-600">{selectedDate || '-'} · {selectedTime || '-'}</Text>
        <Text className="mt-2 border-t border-slate-200 pt-3 text-lg font-bold text-[#D2691E]">Rp {price.toLocaleString('id-ID')}</Text>
      </View>
    </CustomerScreen>
  );
}
