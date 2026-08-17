import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppInput } from '@/components/ui/AppInput';
import { routes } from '@/constants/routes';
import { customerLocationService } from '@/features/customer/services/customer-location.service';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

export default function BookingLocationScreen() {
  const params = useLocalSearchParams<Record<string, string>>();
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const handleSave = async () => {
    if (coords) {
      router.push({
        pathname: routes.customer.bookingInvoice,
        params: { ...params, address, latitude: String(coords.latitude), longitude: String(coords.longitude) },
      });
      return;
    }

    setLocating(true);
    setLocationError(null);
    const result = await customerLocationService.getCurrentLocation();
    setLocating(false);

    if (result.status !== 'granted') {
      setLocationError(
        result.status === 'denied'
          ? 'Izin lokasi diperlukan untuk booking layanan ke rumah. Aktifkan izin lokasi lalu coba lagi.'
          : result.message
      );
      return;
    }

    setCoords({ latitude: result.latitude, longitude: result.longitude });
    router.push({
      pathname: routes.customer.bookingInvoice,
      params: { ...params, address, latitude: String(result.latitude), longitude: String(result.longitude) },
    });
  };

  return (
    <CustomerScreen
      title="Lokasi Pelayanan"
      description="Masukkan alamat lengkap agar barber mudah menemukan lokasi Anda."
      action={{ label: locating ? 'Mengambil lokasi...' : 'Simpan Lokasi', onPress: handleSave, disabled: locating }}>
      <AppInput label="Alamat" placeholder="Nama jalan, nomor, patokan" value={address} onChangeText={setAddress} />
      {locationError && (
        <Text className="mt-2 text-sm text-red-600">{locationError}</Text>
      )}
    </CustomerScreen>
  );
}
