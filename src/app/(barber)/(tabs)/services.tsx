import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
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
        if (__DEV__) {
          // TEMP DIAGNOSTIC (Batch 10B-5E-R2) -- remove after live retest confirmed. No tokens/secrets.
          data.forEach((svc) => {
            console.warn('[SERVICE_DOMAIN_DEBUG]', {
              rawCount: data.length,
              normalizedCount: data.length,
              serviceIdPresent: Boolean(svc.serviceId),
              serviceIdLength: svc.serviceId?.length ?? 0,
              name: svc.name,
              isActive: svc.isActive,
              price: svc.price,
              durationMinutes: svc.durationMinutes,
            });
          });
        }
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
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchServices} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="font-bold text-slate-900 text-base">Daftar Layanan Master Barber</Text>
            <Text className="text-slate-500 text-xs">Atur tarif harga dan durasi layanan</Text>
          </View>
          <AppButton label="+ Tambah Layanan" onPress={openAddModal} variant="primary" className="py-2 px-3" />
        </View>

        {services.length === 0 ? (
          <AppCard className="p-8 items-center justify-center my-6">
            <SymbolIcon name="list.bullet" size={40} color="#94a3b8" />
            <Text className="text-slate-700 font-bold text-base mt-3">Belum Ada Layanan</Text>
            <Text className="text-slate-500 text-xs text-center mt-1">
              Tambahkan layanan pangkas rambut atau perawatan pertama Anda.
            </Text>
          </AppCard>
        ) : (
          <View className="gap-3 mb-6">
            {services.map((svc) => (
              <View
                key={svc.serviceId}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-row items-center justify-between">
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-bold text-slate-900 text-base">{svc.name}</Text>
                    <View
                      className={
                        svc.isActive ? 'bg-emerald-100 px-2 py-0.5 rounded' : 'bg-slate-100 px-2 py-0.5 rounded'
                      }>
                      <Text
                        className={
                          svc.isActive
                            ? 'text-emerald-800 text-[10px] font-semibold'
                            : 'text-slate-600 text-[10px] font-semibold'
                        }>
                        {svc.isActive ? 'Aktif' : 'Nonaktif'}
                      </Text>
                    </View>
                  </View>
                  {svc.description ? (
                    <Text className="text-slate-500 text-xs mt-1">{svc.description}</Text>
                  ) : null}

                  <View className="flex-row items-center gap-4 mt-2">
                    <Text className="font-extrabold text-amber-600 text-sm">
                      {formatCurrency(svc.price)}
                    </Text>
                    <Text className="text-slate-500 text-xs">⏱ {svc.durationMinutes} Menit</Text>
                  </View>
                </View>

                <View className="items-end gap-3">
                  <Switch
                    value={svc.isActive}
                    onValueChange={() => handleToggleActive(svc)}
                    trackColor={{ false: '#cbd5e1', true: '#f59e0b' }}
                  />
                  <TouchableOpacity
                    onPress={() => openEditModal(svc)}
                    className="bg-slate-100 py-1 px-3 rounded-lg">
                    <Text className="text-slate-700 text-xs font-semibold">Edit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add / Edit Service Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6 gap-4">
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
              <Text className="font-bold text-slate-900 text-lg">
                {editingService ? 'Edit Layanan' : 'Tambah Layanan Baru'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <SymbolIcon name="xmark" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View className="gap-1">
              <Text className="text-xs font-semibold text-slate-700">Nama Layanan *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Potong Rambut Fade"
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
              />
            </View>

            <View className="gap-1">
              <Text className="text-xs font-semibold text-slate-700">Deskripsi</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Penjelasan singkat layanan..."
                multiline
                numberOfLines={3}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm h-20"
              />
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold text-slate-700">Harga (Rp) *</Text>
                <TextInput
                  value={priceStr}
                  onChangeText={setPriceStr}
                  placeholder="50000"
                  keyboardType="numeric"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                />
              </View>

              <View className="flex-1 gap-1">
                <Text className="text-xs font-semibold text-slate-700">Durasi (Menit) *</Text>
                <TextInput
                  value={durationStr}
                  onChangeText={setDurationStr}
                  placeholder="30"
                  keyboardType="numeric"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm"
                />
              </View>
            </View>

            <View className="flex-row gap-3 mt-2">
              <AppButton
                label="Batal"
                onPress={() => setModalVisible(false)}
                variant="secondary"
                className="flex-1"
              />
              <AppButton
                label={saving ? 'Menyimpan...' : 'Simpan Layanan'}
                onPress={handleSaveService}
                variant="primary"
                disabled={saving}
                className="flex-1"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
