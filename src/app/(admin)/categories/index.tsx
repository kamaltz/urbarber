import { adminRepository } from '@/features/admin/repository/admin.repository';
import { createCategory, updateCategory } from '@/features/admin/services/admin.service';
import type { CategoryRecord } from '@/features/admin/types/admin';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CategoryFormState {
  name: string;
  description: string;
  icon: string;
  active: boolean;
  order: string;
}

function CategoryRow({
  item,
  onEdit,
}: {
  item: CategoryRecord;
  onEdit: (cat: CategoryRecord) => void;
}) {
  return (
    <View className="bg-white rounded-xl px-4 py-3 mb-2 border border-slate-100 flex-row items-center">
      {item.icon ? (
        <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3">
          <Text className="text-xl">{item.icon}</Text>
        </View>
      ) : null}
      <View className="flex-1 mr-2">
        <Text className="font-semibold text-slate-800">{item.name}</Text>
        {item.description ? (
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {item.description}
          </Text>
        ) : null}
        <Text className="text-xs text-slate-400 mt-0.5">Urutan: {item.order}</Text>
      </View>
      <View className="items-end gap-1">
        <View
          className={`rounded-full px-2 py-0.5 ${
            item.active ? 'bg-green-100' : 'bg-slate-100'
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              item.active ? 'text-green-700' : 'text-slate-500'
            }`}
          >
            {item.active ? 'Aktif' : 'Nonaktif'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onEdit(item)}
          className="bg-blue-50 px-3 py-1 rounded-lg"
          id={`admin-category-edit-${item.id}`}
        >
          <Text className="text-xs font-semibold text-blue-600">Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminCategoriesScreen() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CategoryFormState>({
    name: '',
    description: '',
    icon: '',
    active: true,
    order: '0',
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await adminRepository.getCategories(false);
      setCategories(data);
    } catch {
      setCategories([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminRepository
      .getCategories(false)
      .then((data) => {
        if (active) setCategories(data);
      })
      .catch(() => {
        if (active) setCategories([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      icon: '',
      active: true,
      order: '0',
    });
    setModalVisible(true);
  };

  const openEdit = (cat: CategoryRecord) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      description: cat.description ?? '',
      icon: cat.icon ?? '',
      active: cat.active,
      order: String(cat.order),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validasi', 'Nama kategori wajib diisi.');
      return;
    }
    if (form.name.trim().length > 100) {
      Alert.alert('Validasi', 'Nama kategori maksimal 100 karakter.');
      return;
    }

    setSaving(true);
    try {
      const orderVal = parseInt(form.order, 10);
      const safeOrder = isNaN(orderVal) ? 0 : orderVal;

      if (editingId) {
        await updateCategory({
          categoryId: editingId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          active: form.active,
          order: safeOrder,
        });
      } else {
        await createCategory({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          icon: form.icon.trim() || undefined,
          order: safeOrder,
        });
      }
      setModalVisible(false);
      await handleRefresh();
    } catch (err: any) {
      Alert.alert('Gagal', err?.message ?? 'Gagal menyimpan kategori.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-1">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-1"
              id="admin-categories-back-btn"
            >
              <Text className="text-blue-600 text-base">‹</Text>
            </TouchableOpacity>
            <View>
              <Text className="text-lg font-bold text-slate-900">
                Manajemen Kategori
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                {categories.length} kategori
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          className="bg-blue-600 px-4 py-2 rounded-xl"
          onPress={openCreate}
          id="admin-category-add-btn"
        >
          <Text className="text-white text-sm font-semibold">+ Tambah</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CategoryRow item={item} onEdit={openEdit} />
          )}
          contentContainerClassName="px-4 pt-3 pb-10"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-slate-400">Belum ada kategori layanan.</Text>
              <TouchableOpacity
                className="bg-blue-600 px-6 py-3 rounded-xl mt-4"
                onPress={openCreate}
                id="admin-category-empty-add-btn"
              >
                <Text className="text-white font-semibold">
                  Buat Kategori Pertama
                </Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-slate-50">
          <View className="bg-white px-5 py-4 border-b border-slate-100 flex-row items-center justify-between">
            <Text className="text-base font-bold text-slate-900">
              {editingId ? 'Edit Kategori' : 'Tambah Kategori'}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              id="admin-category-modal-close"
            >
              <Text className="text-slate-500 text-base">Batal</Text>
            </TouchableOpacity>
          </View>

          <View className="px-5 pt-5 gap-4">
            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1.5">
                Nama Kategori *
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="Contoh: Cukur Rambut"
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                id="admin-category-name-input"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1.5">
                Deskripsi
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="Opsional"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
                id="admin-category-desc-input"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1.5">
                Ikon (emoji)
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="Contoh: ✂️"
                value={form.icon}
                onChangeText={(v) => setForm((f) => ({ ...f, icon: v }))}
                id="admin-category-icon-input"
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-slate-600 mb-1.5">
                Urutan Tampil
              </Text>
              <TextInput
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800"
                placeholder="0"
                value={form.order}
                onChangeText={(v) => setForm((f) => ({ ...f, order: v }))}
                keyboardType="numeric"
                id="admin-category-order-input"
              />
            </View>

            {editingId && (
              <View className="flex-row items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3">
                <Text className="text-sm font-medium text-slate-700">Aktif</Text>
                <Switch
                  value={form.active}
                  onValueChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
                />
              </View>
            )}

            <TouchableOpacity
              className={`bg-blue-600 rounded-xl py-4 items-center mt-2 ${
                saving ? 'opacity-50' : ''
              }`}
              onPress={handleSave}
              disabled={saving}
              id="admin-category-save-btn"
            >
              <Text className="text-white font-bold text-base">
                {saving
                  ? 'Menyimpan…'
                  : editingId
                    ? 'Simpan Perubahan'
                    : 'Buat Kategori'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
