import { adminRepository } from '@/features/admin/repository/admin.repository';
import { updateUserStatus } from '@/features/admin/services/admin.service';
import type { AdminBarberRecord } from '@/features/admin/types/admin';
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

function SectionRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</Text>
      <Text className="text-sm text-slate-800 mt-0.5">
        {value === null || value === undefined ? '-' : String(value)}
      </Text>
    </View>
  );
}

export default function AdminBarberDetailScreen() {
  const { barberId } = useLocalSearchParams<{ barberId: string }>();
  const [barber, setBarber] = useState<AdminBarberRecord | null>(null);
  const [userStatus, setUserStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchBarberData = useCallback(async () => {
    if (!barberId) return;
    try {
      const [barberData, userData] = await Promise.all([
        adminRepository.getBarberDetail(barberId),
        adminRepository.getUserDetail(barberId),
      ]);
      setBarber(barberData);
      setUserStatus(userData?.status ?? null);
    } catch {
      setBarber(null);
    }
  }, [barberId]);

  useEffect(() => {
    let active = true;
    if (!barberId) return;
    setLoading(true);
    Promise.all([
      adminRepository.getBarberDetail(barberId),
      adminRepository.getUserDetail(barberId),
    ])
      .then(([barberData, userData]) => {
        if (active) {
          setBarber(barberData);
          setUserStatus(userData?.status ?? null);
        }
      })
      .catch(() => {
        if (active) setBarber(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [barberId]);

  const handleStatusChange = () => {
    const isSuspended = userStatus === 'suspended';
    const targetStatus: 'active' | 'suspended' = isSuspended ? 'active' : 'suspended';
    const actionLabel = isSuspended ? 'aktifkan kembali' : 'tangguhkan';

    Alert.prompt(
      isSuspended ? 'Aktifkan Barber' : 'Tangguhkan Barber',
      `Masukkan alasan untuk ${actionLabel} barber "${barber?.displayName}":`,
      async (reason) => {
        if (!reason && !isSuspended) {
          Alert.alert('Gagal', 'Alasan wajib diisi untuk penangguhan.');
          return;
        }
        setSubmitting(true);
        try {
          await updateUserStatus(barberId!, targetStatus, reason ?? '');
          setUserStatus(targetStatus);
          Alert.alert('Berhasil', `Status barber berhasil diubah ke ${targetStatus}.`);
          fetchBarberData();
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

  if (!barber) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-red-500 text-center">Barber tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4" id="admin-barber-detail-back-btn">
          <Text className="text-blue-600 font-semibold">Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isSuspended = userStatus === 'suspended';

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1" id="admin-barber-back-btn">
          <Text className="text-blue-600 text-base">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>{barber.displayName}</Text>
          <Text className="text-xs text-slate-500">{barber.businessName ?? 'Barber'}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        {isSuspended && (
          <View className="bg-red-50 border border-red-200 mx-4 mt-4 rounded-2xl px-4 py-3">
            <Text className="text-sm font-semibold text-red-700">⚠️ Akun barber ini sedang ditangguhkan.</Text>
          </View>
        )}

        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-slate-100">
          <Text className="text-sm font-bold text-slate-700 mb-3">Profil Barber</Text>
          <SectionRow label="Nama Tampil" value={barber.displayName} />
          <SectionRow label="Nama Usaha" value={barber.businessName} />
          <SectionRow label="Status Verifikasi" value={barber.verificationStatus} />
          <SectionRow label="Status Listing" value={barber.listingStatus} />
          <SectionRow label="Status Akun" value={userStatus} />
          <SectionRow label="Menerima Booking" value={barber.acceptingNewBookings ? 'Ya' : 'Tidak'} />
          {typeof barber.ratingAverage === 'number' && barber.ratingAverage > 0 && (
            <SectionRow label="Rating" value={`${barber.ratingAverage.toFixed(1)} ⭐ (${barber.reviewCount ?? 0} ulasan)`} />
          )}
        </View>

        {/* Go to registration detail */}
        <TouchableOpacity
          className="bg-white border border-slate-100 mx-4 mt-3 rounded-2xl px-4 py-3 flex-row justify-between items-center"
          onPress={() => router.push({ pathname: '/(admin)/barber-registrations/[barberId]', params: { barberId } })}
          id="admin-barber-view-reg-btn"
        >
          <Text className="text-sm font-medium text-blue-600">📋 Lihat Detail Registrasi</Text>
          <Text className="text-blue-500">›</Text>
        </TouchableOpacity>

        {/* Status Action */}
        <View className="mx-4 mt-4">
          {isSuspended ? (
            <TouchableOpacity
              className={`bg-green-600 rounded-2xl py-4 items-center ${submitting ? 'opacity-50' : ''}`}
              onPress={handleStatusChange}
              disabled={submitting}
              id="admin-barber-activate-btn"
            >
              <Text className="text-white font-bold text-base">
                {submitting ? 'Memproses…' : '✓ Aktifkan Kembali Akun'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className={`bg-red-50 border border-red-200 rounded-2xl py-4 items-center ${submitting ? 'opacity-50' : ''}`}
              onPress={handleStatusChange}
              disabled={submitting}
              id="admin-barber-suspend-btn"
            >
              <Text className="text-red-600 font-semibold text-base">
                {submitting ? 'Memproses…' : '✕ Tangguhkan Akun'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
