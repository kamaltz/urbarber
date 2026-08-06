import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberScheduleDay } from '@/features/barbers/types/barber';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

const DAYS_OF_WEEK: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DAY_LABELS: Record<string, string> = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu',
};

const DEFAULT_SCHEDULE: BarberScheduleDay[] = DAYS_OF_WEEK.map((day) => ({
  dayOfWeek: day,
  isOpen: day !== 'Sunday',
  startTime: '09:00',
  endTime: '20:00',
}));

export default function BarberScheduleScreen() {
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [scheduleDays, setScheduleDays] = useState<BarberScheduleDay[]>(DEFAULT_SCHEDULE);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [newOffDate, setNewOffDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    if (!barberId) return;
    try {
      setError(null);
      const data = await barberRepository.getWeeklySchedule(barberId);
      if (data && data.schedule && data.schedule.length > 0) {
        setScheduleDays(data.schedule);
        setUnavailableDates((data as any).unavailableDates || []);
      } else {
        setScheduleDays(DEFAULT_SCHEDULE);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat jadwal operasional.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [barberId]);

  useEffect(() => {
    let isMounted = true;
    if (!barberId) return;
    barberRepository
      .getWeeklySchedule(barberId)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.schedule && data.schedule.length > 0) {
          setScheduleDays(data.schedule);
          setUnavailableDates((data as any).unavailableDates || []);
        } else {
          setScheduleDays(DEFAULT_SCHEDULE);
        }
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setError(err?.message || 'Gagal memuat jadwal operasional.');
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
    fetchSchedule();
  };

  const handleToggleDay = (index: number) => {
    setScheduleDays((prev) =>
      prev.map((day, i) => (i === index ? { ...day, isOpen: !day.isOpen } : day))
    );
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setScheduleDays((prev) =>
      prev.map((day, i) => (i === index ? { ...day, [field]: value } : day))
    );
  };

  const handleAddOffDate = () => {
    const trimmed = newOffDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      Alert.alert('Format Gagal', 'Tanggal libur harus berformat YYYY-MM-DD (Contoh: 2026-08-17)');
      return;
    }
    if (unavailableDates.includes(trimmed)) {
      Alert.alert('Duplikat', 'Tanggal tersebut sudah ada di daftar libur.');
      return;
    }
    setUnavailableDates((prev) => [...prev, trimmed]);
    setNewOffDate('');
  };

  const handleRemoveOffDate = (dateToRemove: string) => {
    setUnavailableDates((prev) => prev.filter((d) => d !== dateToRemove));
  };

  const handleSaveSchedule = async () => {
    // Validate time formatting and logic
    for (const day of scheduleDays) {
      if (day.isOpen) {
        const start = day.startTime || '09:00';
        const end = day.endTime || '20:00';

        if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
          Alert.alert('Validasi Waktu', `Jam operasional hari ${DAY_LABELS[day.dayOfWeek]} harus berformat HH:mm.`);
          return;
        }

        if (start >= end) {
          Alert.alert('Validasi Waktu', `Jam buka hari ${DAY_LABELS[day.dayOfWeek]} harus lebih awal dari jam tutup.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await barberRepository.updateWeeklySchedule(barberId, {
        schedule: scheduleDays,
        unavailableDates,
      } as any);

      if (res.success) {
        Alert.alert('Sukses', 'Jadwal operasional berhasil disimpan.');
      } else {
        Alert.alert('Gagal', res.error?.message || 'Gagal menyimpan jadwal.');
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
      <Header title="Jadwal Jam Operasional" showBackButton={false} />

      <ScrollView
        className="flex-1 px-4 py-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error ? (
          <AppCard className="mb-4 bg-red-50 border-red-200">
            <Text className="text-red-700 text-sm">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchSchedule} variant="secondary" className="mt-2" />
          </AppCard>
        ) : null}

        <AppCard className="mb-6 p-4">
          <Text className="font-bold text-slate-900 text-base mb-1">Jam Buka Mingguan</Text>
          <Text className="text-slate-500 text-xs mb-4">
            Atur hari buka dan jam operasional untuk layanan pangkas rambut Anda.
          </Text>

          <View className="gap-3">
            {scheduleDays.map((day, idx) => (
              <View
                key={day.dayOfWeek}
                className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Switch
                    value={day.isOpen}
                    onValueChange={() => handleToggleDay(idx)}
                    trackColor={{ false: '#cbd5e1', true: '#f59e0b' }}
                  />
                  <Text className="font-bold text-slate-900 text-sm min-w-[60px]">
                    {DAY_LABELS[day.dayOfWeek]}
                  </Text>
                </View>

                {day.isOpen ? (
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={day.startTime || '09:00'}
                      onChangeText={(val) => handleTimeChange(idx, 'startTime', val)}
                      placeholder="09:00"
                      maxLength={5}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 text-xs font-semibold text-center w-16"
                    />
                    <Text className="text-slate-400 text-xs">-</Text>
                    <TextInput
                      value={day.endTime || '20:00'}
                      onChangeText={(val) => handleTimeChange(idx, 'endTime', val)}
                      placeholder="20:00"
                      maxLength={5}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-900 text-xs font-semibold text-center w-16"
                    />
                  </View>
                ) : (
                  <View className="bg-slate-200 px-3 py-1 rounded-md">
                    <Text className="text-slate-600 text-xs font-semibold">Tutup</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </AppCard>

        {/* Tanggal Libur Khusus / Unavailable Dates */}
        <AppCard className="mb-6 p-4">
          <Text className="font-bold text-slate-900 text-base mb-1">Tanggal Libur Khusus</Text>
          <Text className="text-slate-500 text-xs mb-3">
            Tambahkan tanggal pengecualian libur (Format: YYYY-MM-DD).
          </Text>

          <View className="flex-row gap-2 mb-3">
            <TextInput
              value={newOffDate}
              onChangeText={setNewOffDate}
              placeholder="Contoh: 2026-08-17"
              maxLength={10}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs"
            />
            <AppButton label="+ Libur" onPress={handleAddOffDate} variant="secondary" className="px-3" />
          </View>

          {unavailableDates.length === 0 ? (
            <Text className="text-slate-400 text-xs italic">Belum ada tanggal libur khusus.</Text>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {unavailableDates.map((dateStr) => (
                <View key={dateStr} className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg flex-row items-center gap-2">
                  <Text className="text-red-800 text-xs font-semibold">{dateStr}</Text>
                  <TouchableOpacity onPress={() => handleRemoveOffDate(dateStr)}>
                    <SymbolIcon name="xmark" size={14} color="#991b1b" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </AppCard>

        <AppButton
          label={saving ? 'Menyimpan Jadwal...' : 'Simpan Jadwal Operasional'}
          onPress={handleSaveSchedule}
          variant="primary"
          disabled={saving}
          className="mb-8 w-full"
        />
      </ScrollView>
    </View>
  );
}
