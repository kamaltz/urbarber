import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberProfile } from '@/features/barbers/types/barber';
import { uploadService } from '@/features/storage/services/upload.service';
import { MAP_CONFIG } from '@/config/map.config';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function BarberProfileScreen() {
  const { user, logout } = useAuth();
  const barberId = user?.uid || '';

  const [profile, setProfile] = useState<BarberProfile | null>(null);
  const [shopName, setShopName] = useState<string>('');
  const [shopDescription, setShopDescription] = useState<string>('');
  const [shopAddress, setShopAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState<boolean>(false);

  const fetchProfile = useCallback(async () => {
    if (!barberId) return;
    try {
      setError(null);
      const data = await barberRepository.getBarberProfile(barberId);
      if (data) {
        setProfile(data);
        setShopName(data.shopName || data.name || '');
        setShopDescription(data.shopDescription || '');
        setShopAddress(data.shopAddress || '');
        setPhone(data.phone || user?.phoneNumber || '');
        setProfileImage(data.profileImageUrl || null);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat profil barber.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barberId, user]);

  useEffect(() => {
    let isMounted = true;
    if (!barberId) return;
    barberRepository
      .getBarberProfile(barberId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setProfile(data);
          setShopName(data.shopName || data.name || '');
          setShopDescription(data.shopDescription || '');
          setShopAddress(data.shopAddress || '');
          setPhone(data.phone || user?.phoneNumber || '');
          setProfileImage(data.profileImageUrl || null);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Gagal memuat profil barber.');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [barberId, user?.phoneNumber]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const handlePickAvatar = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Izin Ditolak', 'Izin galeri dibutuhkan untuk mengunggah foto profil.');
        return;
      }

      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) return;

      const localUri = pickerResult.assets[0].uri;
      setUploading(true);

      const fileName = `profile_${Date.now()}.jpg`;
      const uploadRes = await uploadService.uploadPublicFile({
        uri: localUri,
        path: `${barberId}/barber/profile/${fileName}`,
        contentType: 'image/jpeg',
      });

      if (uploadRes.success && uploadRes.url) {
        setProfileImage(uploadRes.url);

        await barberRepository.updateBarberProfile(barberId, {
          shopImageUrl: uploadRes.url,
        });

        Alert.alert('Sukses', 'Foto profil berhasil diperbarui.');
      } else {
        Alert.alert('Gagal Upload', uploadRes.error?.message || 'Gagal mengunggah foto profil.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Saves the Barber's static shop/service location using a single foreground
   * location fetch -- not booking tracking, no continuous updates, no background
   * permission. location + geohash are always written together from the same
   * coordinates via barberRepository.updateBarberLocation.
   */
  const handleUpdateLocation = async () => {
    setSavingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Izin lokasi dibutuhkan untuk menyimpan lokasi barbershop.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const res = await barberRepository.updateBarberLocation(barberId, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        shopAddress: shopAddress.trim() || profile?.shopAddress || '',
      });

      if (res.success) {
        Alert.alert('Sukses', 'Lokasi barbershop berhasil disimpan.');
        fetchProfile();
      } else {
        Alert.alert('Gagal', res.error?.message || 'Gagal menyimpan lokasi.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Gagal mendapatkan lokasi saat ini.');
    } finally {
      setSavingLocation(false);
    }
  };

  const handleSaveProfile = async () => {
    const trimmedShopName = shopName.trim();
    if (!trimmedShopName) {
      Alert.alert('Validasi Gagal', 'Nama outlet / barber tidak boleh kosong.');
      return;
    }

    setSaving(true);
    try {
      const res = await barberRepository.updateBarberProfile(barberId, {
        name: trimmedShopName,
        shopName: trimmedShopName,
        shopDescription: shopDescription.trim(),
        shopAddress: shopAddress.trim(),
        phone: phone.trim(),
      });

      if (res.success) {
        Alert.alert('Sukses', 'Profil operasional berhasil disimpan.');
        fetchProfile();
      } else {
        Alert.alert('Gagal', res.error?.message || 'Gagal memperbarui profil.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Profil Operational Barber" showBackButton={false} />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchProfile} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        {/* Profile Avatar Card */}
        <AppCard className="mb-6 p-6 items-center">
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploading} className="relative">
            {profileImage ? (
              <Image source={{ uri: profileImage }} className="w-24 h-24 rounded-full" />
            ) : (
              <View className="w-24 h-24 rounded-full bg-amber-500 items-center justify-center">
                <Text className="text-slate-900 font-extrabold text-3xl">
                  {(shopName || user?.displayName || 'B')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-slate-900 p-2 rounded-full border-2 border-white">
              <SymbolIcon name="pencil" size={14} color="#ffffff" />
            </View>
          </TouchableOpacity>

          <Text className="font-bold text-slate-900 text-lg mt-3">
            {shopName || user?.displayName || 'Master Barber'}
          </Text>
          <Text className="text-slate-500 text-xs mt-0.5">{user?.email}</Text>

          <View className="bg-emerald-100 px-3 py-1 rounded-full mt-2">
            <Text className="text-emerald-800 font-semibold text-xs">Akun Terverifikasi & Aktif</Text>
          </View>
        </AppCard>

        {/* Operational Profile Fields */}
        <AppCard className="mb-6 p-4 gap-4">
          <Text className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
            Informasi Outlet Operasional
          </Text>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">Nama Barber / Barbershop *</Text>
            <TextInput
              value={shopName}
              onChangeText={setShopName}
              placeholder="Nama outlet barbershop..."
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">Nomor Telepon / WhatsApp</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="081234567890"
              keyboardType="phone-pad"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">Alamat Outlet / Layanan</Text>
            <TextInput
              value={shopAddress}
              onChangeText={setShopAddress}
              placeholder="Alamat lengkap barbershop..."
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
            />
          </View>

          <View className="gap-1">
            <Text className="text-xs font-semibold text-slate-700">Deskripsi Outlet</Text>
            <TextInput
              value={shopDescription}
              onChangeText={setShopDescription}
              placeholder="Deskripsi keahlian dan fasilitas barbershop..."
              multiline
              numberOfLines={3}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm h-20"
            />
          </View>

          {/* Protected Fields Notice */}
          <View className="bg-slate-100 p-3 rounded-xl gap-1">
            <Text className="text-slate-500 text-[11px] font-medium">
              🔒 Field Terlindungi: Role ({user?.role || 'barber'}), Status (Active), dan Status Verifikasi (Approved) hanya dapat diubah oleh Sistem/Admin.
            </Text>
          </View>
        </AppCard>

        {/* Shop Location */}
        <AppCard className="mb-6 p-4 gap-3">
          <Text className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
            Lokasi Barber & Barbershop (Permanent Shop Base)
          </Text>

          {profile?.location && typeof profile.location.latitude === 'number' && typeof profile.location.longitude === 'number' ? (
            <View className="gap-2">
              <View className="flex-row items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <Text className="text-base">📍</Text>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-emerald-900">Lokasi Sudah Dikonfigurasi (Configured)</Text>
                  <Text className="text-[11px] text-emerald-700 font-medium">
                    Koordinat: {profile.location.latitude.toFixed(5)}, {profile.location.longitude.toFixed(5)}
                    {profile.geohash ? ` (geohash: ${profile.geohash})` : ''}
                  </Text>
                </View>
              </View>

              {/* Map Preview */}
              <View className="h-44 overflow-hidden rounded-xl border border-slate-200 mt-1">
                <Map mapStyle={MAP_CONFIG.styleUrl} style={{ flex: 1 }}>
                  <Camera
                    initialViewState={{
                      center: [profile.location.longitude, profile.location.latitude],
                      zoom: 14,
                    }}
                  />
                  <Marker
                    id="barber-shop-marker"
                    coordinates={[profile.location.longitude, profile.location.latitude]}>
                    <View className="bg-slate-900 px-2.5 py-1.5 rounded-full border-2 border-white shadow-md flex-row items-center gap-1">
                      <Text className="text-xs">💈</Text>
                      <Text className="text-white text-[11px] font-bold">
                        {shopName || 'Outlet Barber'}
                      </Text>
                    </View>
                  </Marker>
                </Map>
              </View>
            </View>
          ) : (
            <View className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <Text className="text-xs font-bold text-amber-900">Lokasi Belum Dikonfigurasi (Not Configured)</Text>
              <Text className="text-[11px] text-amber-800 mt-0.5">
                Barbershop Anda belum dapat ditampilkan di peta pencarian terdekat Pelanggan sampai lokasi dikonfigurasi.
              </Text>
            </View>
          )}

          <Text className="text-xs text-slate-500">
            Lokasi ini digunakan untuk pencarian barber terdekat oleh Pelanggan (~10 km radius). Lokasi disimpan secara permanen di server dan dapat diperbarui kapan saja.
          </Text>

          <AppButton
            label={savingLocation ? 'Mengambil & Menyimpan Lokasi...' : '📍 Deteksi & Simpan Lokasi GPS Saat Ini'}
            onPress={handleUpdateLocation}
            variant="secondary"
            disabled={savingLocation}
            className="w-full"
          />
        </AppCard>

        <AppButton
          label={saving ? 'Menyimpan Profile...' : 'Simpan Perubahan Profile'}
          onPress={handleSaveProfile}
          variant="primary"
          disabled={saving || uploading}
          className="mb-4 w-full"
        />

        <AppButton
          label="📱 Beralih ke Mode Pelanggan (Customer)"
          onPress={() => router.replace('/(customer)/home' as any)}
          variant="secondary"
          className="mb-3 w-full border-slate-300 bg-white"
        />

        <AppButton label="Keluar Akun" onPress={logout} variant="secondary" className="mb-8 w-full" />
      </ScrollView>
    </View>
  );
}
