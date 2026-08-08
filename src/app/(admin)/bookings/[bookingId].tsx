import { adminRepository } from '@/features/admin/repository/admin.repository';
import type { AdminBookingRecord } from '@/features/admin/types/admin';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SectionRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</Text>
      <Text className="text-sm text-slate-800 mt-0.5">
        {value === null || value === undefined ? '-' : String(value)}
      </Text>
    </View>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}

const STATUS_STYLES: Record<string, string> = {
  pending:     'bg-yellow-100 text-yellow-700',
  accepted:    'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  rejected:    'bg-red-50 text-red-500',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu', accepted: 'Diterima', in_progress: 'Berlangsung',
  completed: 'Selesai', cancelled: 'Dibatalkan', rejected: 'Ditolak',
};

export default function AdminBookingDetailScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<AdminBookingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!bookingId) return;
    setLoading(true);
    adminRepository.getBookingDetail(bookingId)
      .then((data) => {
        if (active) setBooking(data);
      })
      .catch(() => {
        if (active) setBooking(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [bookingId]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-red-500 text-center">Booking tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4" id="admin-booking-detail-back-btn">
          <Text className="text-blue-600 font-semibold">Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[booking.status] ?? 'bg-slate-100 text-slate-500';
  const [statusBg, statusTxt] = statusStyle.split(' ');

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1" id="admin-booking-back-btn">
          <Text className="text-blue-600 text-base">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900">Detail Booking</Text>
          <Text className="text-xs text-slate-500">#{bookingId.slice(-8).toUpperCase()}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${statusBg}`}>
          <Text className={`text-xs font-semibold ${statusTxt}`}>{STATUS_LABEL[booking.status] ?? booking.status}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-slate-100">
          <Text className="text-sm font-bold text-slate-700 mb-3">Informasi Booking</Text>
          <SectionRow label="ID Booking" value={bookingId} />
          <SectionRow label="Tanggal" value={booking.date} />
          <SectionRow label="Jam Mulai" value={booking.startTime} />
          <SectionRow label="Status" value={STATUS_LABEL[booking.status] ?? booking.status} />
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-slate-100">
          <Text className="text-sm font-bold text-slate-700 mb-3">Pihak Terlibat</Text>
          <SectionRow label="ID Pelanggan" value={booking.customerId} />
          <SectionRow label="ID Barber" value={booking.barberId} />
        </View>

        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-slate-100">
          <Text className="text-sm font-bold text-slate-700 mb-3">Pembayaran</Text>
          <SectionRow label="Metode Pembayaran" value={
            booking.paymentMethod === 'cash_on_service' ? 'Tunai di Tempat' : 'Online (Sandbox)'
          } />
          <SectionRow label="Status Pembayaran" value={booking.paymentStatus} />
          <View className="mt-2 pt-3 border-t border-slate-100">
            <Text className="text-xs text-slate-500 uppercase tracking-wide">Total Layanan</Text>
            <Text className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(booking.totalPrice)}</Text>
          </View>
        </View>

        {/* Read-only note */}
        <View className="mx-4 mt-4 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
          <Text className="text-xs text-slate-500">
            ℹ️ Data booking hanya dapat dilihat oleh admin. Modifikasi booking dilakukan melalui alur pelanggan/barber.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
