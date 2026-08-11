import { AppButton } from '@/components/ui/AppButton';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberService } from '@/features/barbers/types/barber';
import { formatCurrency } from '@/utils/formatters';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function BarberServicesScreen() {
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [services, setServices] = useState<BarberService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<BarberService | null>(null);
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priceStr, setPriceStr] = useState<string>('');
  const [durationStr, setDurationStr] = useState<string>('30');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchServices = useCallback(async () => {
    if (!barberId) return;
    try {
      setError(null);
      const data = await barberRepository.getBarberServices(barberId);
      setServices(data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar layanan.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barberId]);

  useEffect(() => {
    let isMounted = true;
    if (!barberId) return;
    barberRepository
      .getBarberServices(barberId)
      .then((data) => {
        if (!isMounted) return;
        setServices(data);
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Gagal memuat daftar layanan.');
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
  }, [barberId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const openAddModal = () => {
    setEditingService(null);
    setName('');
    setDescription('');
    setPriceStr('');
    setDurationStr('30');
    setModalVisible(true);
  };

  const openEditModal = (service: BarberService) => {
    setEditingService(service);
    setName(service.name || '');
    setDescription(service.description || '');
    setPriceStr(String(service.price || 0));
    setDurationStr(String(service.durationMinutes || 30));
    setModalVisible(true);
  };

  const handleSaveService = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validasi Gagal', 'Nama layanan tidak boleh kosong.');
      return;
    }
    if (trimmedName.length > 100) {
      Alert.alert('Validasi Gagal', 'Nama layanan maksimal 100 karakter.');
      return;
    }
    if (description.length > 500) {
      Alert.alert('Validasi Gagal', 'Deskripsi maksimal 500 karakter.');
      return;
    }

    const parsedPrice = parseInt(priceStr, 10);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert('Validasi Gagal', 'Harga layanan harus berupa angka positif.');
      return;
    }

    const parsedDuration = parseInt(durationStr, 10);
    if (isNaN(parsedDuration) || parsedDuration < 15 || parsedDuration > 480) {
      Alert.alert('Validasi Gagal', 'Durasi layanan harus antara 15 hingga 480 menit.');
      return;
    }

    setSaving(true);
    try {
      if (editingService) {
        // Edit Existing Service
        const res = await barberRepository.updateBarberService(editingService.serviceId, {
          name: trimmedName,
          description: description.trim(),
          price: parsedPrice,
          durationMinutes: parsedDuration,
        });
        if (res.success) {
          setModalVisible(false);
          fetchServices();
        } else {
          Alert.alert('Gagal', res.error?.message || 'Gagal memperbarui layanan.');
        }
      } else {
        // Add New Service
        const res = await barberRepository.addBarberService(barberId, {
          name: trimmedName,
          description: description.trim(),
          price: parsedPrice,
          durationMinutes: parsedDuration,
        });
        if (res.success) {
          setModalVisible(false);
          fetchServices();
        } else {
          Alert.alert('Gagal', res.error?.message || 'Gagal menambah layanan.');
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (service: BarberService) => {
    const nextState = !service.isActive;
    const res = await barberRepository.toggleBarberService(service.serviceId, nextState);
    if (res.success) {
      fetchServices();
    } else {
      Alert.alert('Gagal', res.error?.message || 'Gagal mengubah status aktif layanan.');
    }
  };

  if (loading && !refreshing) return <Loading />;

  return (
    <View className="flex-1 bg-slate-50">
      <Header title="Kelola Layanan & Harga" showBackButton={false} />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <View className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <Text className="text-rose-700 text-xs font-bold">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchServices} variant="secondary" className="mt-2" />
          </View>
        ) : null}

        {/* Section Header & Add CTA */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="font-bold text-[#363062] text-base">Katalog Layanan Master Barber</Text>
            <Text className="text-slate-500 text-xs">Atur tarif harga & estimasi durasi cukur</Text>
          </View>
          <TouchableOpacity
            onPress={openAddModal}
            className="rounded-xl bg-[#D2691E] px-3.5 py-2.5 shadow-xs active:bg-[#B05416]">
            <Text className="text-xs font-bold text-white">+ Tambah Layanan</Text>
          </TouchableOpacity>
        </View>

        {services.length === 0 ? (
          <View className="p-8 items-center justify-center my-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#EDEFFB] border border-[#363062]/10 mb-3">
              <Text className="text-3xl">📜</Text>
            </View>
            <Text className="text-[#363062] font-bold text-base mt-1">Belum Ada Layanan</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              Tambahkan layanan pangkas rambut atau perawatan pertama Anda.
            </Text>
          </View>
        ) : (
          <View className="gap-3.5 mb-8">
            {services.map((svc) => (
              <View
                key={svc.serviceId}
                className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-xs flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text className="font-bold text-[#363062] text-base">{svc.name}</Text>
                    <View
                      className={
                        svc.isActive
                          ? 'bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200'
                          : 'bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200'
                      }>
                      <Text
                        className={
                          svc.isActive
                            ? 'text-emerald-800 text-[10px] font-bold'
                            : 'text-slate-500 text-[10px] font-bold'
                        }>
                        {svc.isActive ? 'Aktif ✓' : 'Nonaktif'}
                      </Text>
                    </View>
                  </View>
                  {svc.description ? (
                    <Text className="text-slate-500 text-xs mt-1 leading-relaxed">{svc.description}</Text>
                  ) : null}

                  <View className="flex-row items-center gap-3 mt-2.5">
                    <Text className="font-extrabold text-[#D2691E] text-sm">
                      {formatCurrency(svc.price)}
                    </Text>
                    <View className="rounded-lg bg-[#EDEFFB] px-2.5 py-0.5">
                      <Text className="text-[#363062] text-[11px] font-bold">⏱ {svc.durationMinutes} Menit</Text>
                    </View>
                  </View>
                </View>

                <View className="items-end gap-3">
                  <Switch
                    value={svc.isActive}
                    onValueChange={() => handleToggleActive(svc)}
                    trackColor={{ false: '#cbd5e1', true: '#D2691E' }}
                  />
                  <TouchableOpacity
                    onPress={() => openEditModal(svc)}
                    className="bg-[#EDEFFB] border border-[#363062]/20 py-1.5 px-3.5 rounded-xl active:bg-slate-200">
                    <Text className="text-[#363062] text-xs font-bold">Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Service Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-[32px] p-6 gap-4 border-t border-white/20 shadow-lg">
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-3.5">
              <Text className="font-bold text-[#363062] text-lg">
                {editingService ? 'Edit Layanan Barber' : 'Tambah Layanan Baru'}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                <SymbolIcon name="xmark" size={16} color="#363062" />
              </TouchableOpacity>
            </View>

            <View className="gap-1">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">Nama Layanan *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Potong Rambut Fade"
                placeholderTextColor="#94A3B8"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#363062] text-sm font-medium"
              />
            </View>

            <View className="gap-1">
              <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">Deskripsi Layanan</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Penjelasan singkat layanan pangkas..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#363062] text-sm font-medium h-20"
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">Harga (Rp) *</Text>
                <TextInput
                  value={priceStr}
                  onChangeText={setPriceStr}
                  placeholder="50000"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#363062] text-sm font-medium"
                />
              </View>

              <View className="flex-1 gap-1">
                <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">Durasi (Menit) *</Text>
                <TextInput
                  value={durationStr}
                  onChangeText={setDurationStr}
                  placeholder="30"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[#363062] text-sm font-medium"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-2 mb-2">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 h-13 items-center justify-center rounded-xl bg-slate-100 active:bg-slate-200">
                <Text className="text-xs font-bold text-slate-700">Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveService}
                disabled={saving}
                className={`flex-1 h-13 items-center justify-center rounded-xl shadow-xs ${
                  saving ? 'bg-slate-300' : 'bg-[#D2691E] active:bg-[#B05416]'
                }`}>
                <Text className="text-xs font-bold text-white">
                  {saving ? 'Menyimpan...' : 'Simpan Layanan'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
