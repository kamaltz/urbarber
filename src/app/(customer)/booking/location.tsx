import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppInput } from '@/components/ui/AppInput';
import { routes } from '@/constants/routes';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

export default function BookingLocationScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [address, setAddress] = useState('');
  return (
    <CustomerScreen title="Lokasi Pelayanan" description="Masukkan alamat lengkap agar barber mudah menemukan lokasi Anda."
      action={{ label: 'Simpan Lokasi', onPress: () => router.push({ pathname: routes.customer.bookingInvoice, params: { ...params, address } }) }}>
      <AppInput label="Alamat" placeholder="Nama jalan, nomor, patokan" value={address} onChangeText={setAddress} />
    </CustomerScreen>
  );
}
