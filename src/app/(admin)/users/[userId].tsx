import { adminRepository } from '@/features/admin/repository/admin.repository';
import { updateUserStatus } from '@/features/admin/services/admin.service';
import type { AdminUserRecord } from '@/features/admin/types/admin';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SectionRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | boolean | null | undefined;
}) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </Text>
      <Text className="text-sm text-slate-800 mt-0.5">
        {value === null || value === undefined
          ? '-'
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)}
      </Text>
    </View>
  );
}

export default function AdminUserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [user, setUser] = useState<AdminUserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchUserData = useCallback(async () => {
    if (!userId) return;
    try {
      const userData = await adminRepository.getUserDetail(userId);
      setUser(userData);
    } catch {
      setUser(null);
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    if (!userId) return;
    setLoading(true);
    adminRepository
      .getUserDetail(userId)
      .then((userData) => {
        if (active) setUser(userData);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const handleStatusChange = () => {
    const isSuspended = user?.status === 'suspended';
    const targetStatus: 'active' | 'suspended' = isSuspended ? 'active' : 'suspended';
    const actionLabel = isSuspended ? 'aktifkan kembali' : 'tangguhkan';

    Alert.prompt(
      isSuspended ? 'Aktifkan Pengguna' : 'Tangguhkan Pengguna',
      `Masukkan alasan untuk ${actionLabel} pengguna "${user?.name}":`,
      async (reason) => {
        if (!reason && !isSuspended) {
          Alert.alert('Gagal', 'Alasan wajib diisi untuk penangguhan.');
          return;
        }
        setSubmitting(true);
        try {
          await updateUserStatus(userId!, targetStatus, reason ?? '');
          await fetchUserData();
          Alert.alert('Berhasil', `Status pengguna berhasil diubah ke ${targetStatus}.`);
        } catch (err: any) {
          Alert.alert('Gagal', err?.message ?? 'Gagal mengubah status.');
        } finally {
          setSubmitting(false);
        }
      },
      'plain-text',
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-red-500 text-center">Pengguna tidak ditemukan.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4"
          id="admin-user-detail-back-btn"
        >
          <Text className="text-blue-600 font-semibold">Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isSuspended = user.status === 'suspended';
  const roleLabel = user.role === 'customer' ? 'Pelanggan' : 'Barber';

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1" id="admin-user-back-btn">
          <Text className="text-blue-600 text-base">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>
            {user.name}
          </Text>
          <Text className="text-xs text-slate-500">{roleLabel}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        {isSuspended && (
          <View className="bg-red-50 border border-red-200 mx-4 mt-4 rounded-2xl px-4 py-3">
            <Text className="text-sm font-semibold text-red-700">
              ⚠️ Akun pengguna ini sedang ditangguhkan.
            </Text>
          </View>
        )}

        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-slate-100">
          <Text className="text-sm font-bold text-slate-700 mb-3">Informasi Pengguna</Text>
          <SectionRow label="Nama" value={user.name} />
          <SectionRow label="Email" value={user.email} />
          <SectionRow label="Tipe Pengguna" value={roleLabel} />
          <SectionRow label="Status Akun" value={user.status} />
          {user.phoneNumber && (
            <SectionRow label="Nomor Telepon" value={user.phoneNumber} />
          )}
          <SectionRow label="Tanggal Daftar" value={user.createdAt ? new Date((user.createdAt as any).seconds * 1000).toLocaleDateString('id-ID') : '-'} />
        </View>

        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-slate-100">
          <Text className="text-sm font-bold text-slate-700 mb-3">Tindakan</Text>
          <TouchableOpacity
            onPress={handleStatusChange}
            disabled={submitting}
            className={`rounded-xl py-3 px-4 flex-row items-center justify-center ${
              isSuspended
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            } ${submitting ? 'opacity-50' : ''}`}
            id={`admin-user-status-btn-${userId}`}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={isSuspended ? '#059669' : '#dc2626'} />
            ) : (
              <Text
                className={`font-semibold ${
                  isSuspended ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {isSuspended ? '✓ Aktifkan Kembali' : '⊘ Tangguhkan Akun'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
