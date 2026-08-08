import { adminRepository } from '@/features/admin/repository/admin.repository';
import { updateUserStatus } from '@/features/admin/services/admin.service';
import type { AdminUserRecord } from '@/features/admin/types/admin';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_STYLE: Record<string, string> = {
  active: 'text-green-600',
  pending_verification: 'text-yellow-600',
  suspended: 'text-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  pending_verification: 'Menunggu',
  suspended: 'Ditangguhkan',
};

function UserRow({
  item,
  onStatusChange,
}: {
  item: AdminUserRecord;
  onStatusChange: (user: AdminUserRecord) => void;
}) {
  return (
    <View className="bg-white rounded-xl px-4 py-3 mb-2 border border-slate-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="font-semibold text-slate-800">{item.name}</Text>
          <Text className="text-xs text-slate-500">{item.email}</Text>
        </View>
        <View className="items-end">
          <Text className="text-xs text-slate-400 capitalize">{item.role}</Text>
          <Text className={`text-xs font-medium mt-0.5 ${STATUS_STYLE[item.status] ?? 'text-slate-500'}`}>
            {STATUS_LABEL[item.status] ?? item.status}
          </Text>
        </View>
      </View>
      <View className="flex-row mt-2 gap-2">
        {item.status !== 'suspended' ? (
          <TouchableOpacity
            className="flex-1 bg-red-50 border border-red-200 rounded-lg py-1.5 items-center"
            onPress={() => onStatusChange(item)}
            id={`admin-suspend-user-${item.uid}`}
          >
            <Text className="text-xs font-semibold text-red-600">Tangguhkan</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="flex-1 bg-green-50 border border-green-200 rounded-lg py-1.5 items-center"
            onPress={() => onStatusChange(item)}
            id={`admin-activate-user-${item.uid}`}
          >
            <Text className="text-xs font-semibold text-green-600">Aktifkan Kembali</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await adminRepository.getUsers(roleFilter, statusFilter);
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    adminRepository.getUsers(roleFilter, statusFilter)
      .then((data) => {
        if (active) setUsers(data);
      })
      .catch(() => {
        if (active) setUsers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [roleFilter, statusFilter]);

  const handleStatusChange = (user: AdminUserRecord) => {
    const isSuspended = user.status === 'suspended';
    const actionLabel = isSuspended ? 'aktifkan kembali' : 'tangguhkan';
    const targetStatus: 'active' | 'suspended' = isSuspended ? 'active' : 'suspended';

    Alert.prompt(
      `${isSuspended ? 'Aktifkan' : 'Tangguhkan'} Akun`,
      `Masukkan alasan untuk ${actionLabel} akun "${user.name}":`,
      async (reason) => {
        if (!reason && !isSuspended) {
          Alert.alert('Gagal', 'Alasan wajib diisi untuk penangguhan.');
          return;
        }
        try {
          await updateUserStatus(user.uid, targetStatus, reason ?? '');
          setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, status: targetStatus } : u));
          Alert.alert('Berhasil', `Status akun berhasil diubah.`);
        } catch (err: any) {
          Alert.alert('Gagal', err?.message ?? 'Gagal mengubah status.');
        }
      },
      'plain-text',
    );
  };

  const filteredUsers = search.trim()
    ? users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const ROLE_FILTERS = [
    { label: 'Semua', value: undefined },
    { label: 'Customer', value: 'customer' },
    { label: 'Barber', value: 'barber' },
  ];

  const STATUS_FILTERS = [
    { label: 'Semua', value: undefined },
    { label: 'Aktif', value: 'active' },
    { label: 'Menunggu', value: 'pending_verification' },
    { label: 'Ditangguhkan', value: 'suspended' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100">
        <Text className="text-lg font-bold text-slate-900">Manajemen Pengguna</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{filteredUsers.length} pengguna ditemukan</Text>
      </View>

      {/* Search */}
      <View className="bg-white px-4 py-2 border-b border-slate-100">
        <TextInput
          className="bg-slate-100 rounded-xl px-4 py-2.5 text-sm text-slate-800"
          placeholder="Cari nama atau email…"
          value={search}
          onChangeText={setSearch}
          id="admin-users-search"
        />
      </View>

      {/* Role Filter */}
      <View className="flex-row bg-white px-4 py-2 border-b border-slate-100 gap-2">
        {ROLE_FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setRoleFilter(f.value)}
            id={`admin-role-filter-${f.label}`}
            className={`px-3 py-1.5 rounded-lg ${roleFilter === f.value ? 'bg-blue-600' : 'bg-slate-100'}`}
          >
            <Text className={`text-xs font-semibold ${roleFilter === f.value ? 'text-white' : 'text-slate-600'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Filter */}
      <View className="flex-row bg-white px-4 py-2 border-b border-slate-100 gap-1.5">
        {STATUS_FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            onPress={() => setStatusFilter(f.value)}
            id={`admin-status-filter-${f.label}`}
            className={`px-3 py-1 rounded-lg ${statusFilter === f.value ? 'bg-slate-700' : 'bg-slate-100'}`}
          >
            <Text className={`text-xs font-medium ${statusFilter === f.value ? 'text-white' : 'text-slate-600'}`}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.uid}
          renderItem={({ item }) => <UserRow item={item} onStatusChange={handleStatusChange} />}
          contentContainerClassName="px-4 pt-3 pb-10"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-slate-400">Tidak ada pengguna ditemukan.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
