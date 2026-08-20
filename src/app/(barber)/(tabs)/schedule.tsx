import { AppButton } from '@/components/ui/AppButton';
import { Header } from '@/components/ui/Header';
import { Loading } from '@/components/ui/Loading';
import { SymbolIcon } from '@/components/ui/SymbolIcon';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import type { BarberScheduleDay, UnavailableDateRange } from '@/features/barbers/types/barber';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { DEFAULT_BARBER_SCHEDULE_DAYS } from '@/features/barbers/constants/schedule.constants';

const DAY_LABELS: Record<string, string> = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu',
};

const DEFAULT_SCHEDULE: BarberScheduleDay[] = DEFAULT_BARBER_SCHEDULE_DAYS;

/** Format-example placeholder date, always relative to today rather than a
 * fixed year, so it never looks stale in a future year. */
function exampleFutureDateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function BarberScheduleScreen() {
  const { user } = useAuth();
  const barberId = user?.uid || '';

  const [scheduleDays, setScheduleDays] = useState<BarberScheduleDay[]>(DEFAULT_SCHEDULE);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [newOffDate, setNewOffDate] = useState<string>('');
  const [unavailableDateRanges, setUnavailableDateRanges] = useState<UnavailableDateRange[]>([]);
  const [newRangeStart, setNewRangeStart] = useState<string>('');
  const [newRangeEnd, setNewRangeEnd] = useState<string>('');
  // One "Libur Khusus" section, two write modes into the two canonical
  // fields the availability engine already reads (both consulted together
  // -- see applyUnavailableDates in slot-generator.ts). Harian never
  // replaces Rentang Hari or vice versa; this only controls which input
  // form and canonical field is currently active.
  const [holidayMode, setHolidayMode] = useState<'daily' | 'range'>('daily');
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
        setUnavailableDateRanges((data as any).unavailableDateRanges || []);
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
      Alert.alert('Format Gagal', `Tanggal libur harus berformat YYYY-MM-DD (Contoh: ${exampleFutureDateStr(14)})`);
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

  const formatOffDate = (dateStr: string) => {
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateStr;
    return parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleAddOffRange = () => {
    const start = newRangeStart.trim();
    const end = newRangeEnd.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      Alert.alert(
        'Format Gagal',
        `Tanggal mulai dan selesai harus berformat YYYY-MM-DD (Contoh: ${exampleFutureDateStr(30)} – ${exampleFutureDateStr(35)}).`
      );
      return;
    }
    // Plain ISO string comparison sorts correctly across month/year
    // boundaries (e.g. Dec -> Jan) without needing Date parsing.
    if (start > end) {
      Alert.alert('Validasi Gagal', 'Tanggal mulai harus sebelum atau sama dengan tanggal selesai.');
      return;
    }

    setUnavailableDateRanges((prev) => [...prev, { start, end }]);
    setNewRangeStart('');
    setNewRangeEnd('');
  };

  const handleRemoveOffRange = (index: number) => {
    setUnavailableDateRanges((prev) => prev.filter((_, i) => i !== index));
  };

  // Single combined, chronologically-sorted view of both holiday types so
  // the barber never has to inspect two unrelated blocks to see their full
  // "Libur Khusus" list.
  type HolidayListItem =
    | { kind: 'daily'; date: string }
    | { kind: 'range'; range: UnavailableDateRange; rangeIndex: number };

  const combinedHolidays: HolidayListItem[] = [
    ...unavailableDates.map((date): HolidayListItem => ({ kind: 'daily', date })),
    ...unavailableDateRanges.map(
      (range, rangeIndex): HolidayListItem => ({ kind: 'range', range, rangeIndex })
    ),
  ].sort((a, b) => {
    const aStart = a.kind === 'daily' ? a.date : a.range.start;
    const bStart = b.kind === 'daily' ? b.date : b.range.start;
    return aStart.localeCompare(bStart);
  });

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
        unavailableDateRanges,
      });

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
          <View className="mb-4 p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <Text className="text-rose-700 text-xs font-bold">{error}</Text>
            <AppButton label="Coba Lagi" onPress={fetchSchedule} variant="secondary" className="mt-2" />
          </View>
        ) : null}

        {/* Weekly Schedule Section */}
        <View className="mb-5 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Text className="font-bold text-[#363062] text-base mb-1">Jam Buka Mingguan</Text>
          <Text className="text-slate-500 text-xs mb-4">
            Atur hari buka dan jam operasional untuk menerima janji pemesanan pangkas rambut.
          </Text>

          <View className="gap-3">
            {scheduleDays.map((day, idx) => (
              <View
                key={day.dayOfWeek ? `sched-${day.dayOfWeek}` : `sched-day-${idx}`}
                className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <Switch
                    value={day.isOpen}
                    onValueChange={() => handleToggleDay(idx)}
                    trackColor={{ false: '#cbd5e1', true: '#D2691E' }}
                  />
                  <Text className="font-bold text-[#363062] text-sm min-w-[60px]">
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
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[#363062] text-xs font-bold text-center w-16 shadow-xs"
                    />
                    <Text className="text-slate-400 text-xs font-bold">-</Text>
                    <TextInput
                      value={day.endTime || '20:00'}
                      onChangeText={(val) => handleTimeChange(idx, 'endTime', val)}
                      placeholder="20:00"
                      maxLength={5}
                      className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-[#363062] text-xs font-bold text-center w-16 shadow-xs"
                    />
                  </View>
                ) : (
                  <View className="bg-slate-200/70 px-3 py-1 rounded-lg">
                    <Text className="text-slate-500 text-xs font-bold">Tutup</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Libur Khusus -- one unified section covering both single-day and
            multi-day holidays (§2/§3 unification). */}
        <View className="mb-6 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <Text className="font-bold text-[#363062] text-base mb-1">Libur Khusus</Text>
          <Text className="text-slate-500 text-xs mb-3.5">
            Tambahkan tanggal libur satu hari atau rentang beberapa hari (Format: YYYY-MM-DD).
          </Text>

          {/* Mode Switch */}
          <View className="flex-row bg-slate-100 rounded-xl p-1 mb-3.5">
            <TouchableOpacity
              onPress={() => setHolidayMode('daily')}
              className={`flex-1 h-9 items-center justify-center rounded-lg ${
                holidayMode === 'daily' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text
                className={`text-xs font-bold ${
                  holidayMode === 'daily' ? 'text-[#363062]' : 'text-slate-500'
                }`}>
                Harian
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setHolidayMode('range')}
              className={`flex-1 h-9 items-center justify-center rounded-lg ${
                holidayMode === 'range' ? 'bg-white shadow-xs' : ''
              }`}>
              <Text
                className={`text-xs font-bold ${
                  holidayMode === 'range' ? 'text-[#363062]' : 'text-slate-500'
                }`}>
                Rentang Hari
              </Text>
            </TouchableOpacity>
          </View>

          {holidayMode === 'daily' ? (
            <View className="flex-row gap-2.5 mb-3.5">
              <TextInput
                value={newOffDate}
                onChangeText={setNewOffDate}
                placeholder={`Contoh: ${exampleFutureDateStr(14)}`}
                maxLength={10}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[#363062] text-xs font-medium"
              />
              <TouchableOpacity
                onPress={handleAddOffDate}
                className="h-11 rounded-xl bg-[#EDEFFB] px-4 justify-center items-center border border-[#363062]/20 active:bg-slate-200">
                <Text className="text-xs font-bold text-[#363062]">Tambahkan Libur</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="flex-row items-center gap-2.5 mb-3.5">
                <TextInput
                  value={newRangeStart}
                  onChangeText={setNewRangeStart}
                  placeholder={`Mulai: ${exampleFutureDateStr(30)}`}
                  maxLength={10}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[#363062] text-xs font-medium"
                />
                <Text className="text-slate-400 text-xs font-bold">–</Text>
                <TextInput
                  value={newRangeEnd}
                  onChangeText={setNewRangeEnd}
                  placeholder={`Selesai: ${exampleFutureDateStr(35)}`}
                  maxLength={10}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[#363062] text-xs font-medium"
                />
              </View>
              <TouchableOpacity
                onPress={handleAddOffRange}
                className="h-11 justify-center items-center rounded-xl bg-[#EDEFFB] border border-[#363062]/20 active:bg-slate-200 mb-3.5">
                <Text className="text-xs font-bold text-[#363062]">Tambahkan Rentang Libur</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Combined list -- both types together, sorted chronologically */}
          {combinedHolidays.length === 0 ? (
            <Text className="text-slate-400 text-xs italic">Belum ada libur khusus.</Text>
          ) : (
            <View className="gap-2">
              {combinedHolidays.map((item) =>
                item.kind === 'daily' ? (
                  <View
                    key={`daily-${item.date}`}
                    className="bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl flex-row items-center justify-between gap-2">
                    <View className="flex-1 flex-row items-center gap-2">
                      <View className="bg-rose-200/70 px-2 py-0.5 rounded-full">
                        <Text className="text-rose-800 text-[10px] font-bold">Harian</Text>
                      </View>
                      <Text className="text-rose-800 text-xs font-bold flex-1">{formatOffDate(item.date)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveOffDate(item.date)} hitSlop={8}>
                      <SymbolIcon name="xmark" size={14} color="#991b1b" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View
                    key={`range-${item.range.start}-${item.range.end}-${item.rangeIndex}`}
                    className="bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl flex-row items-center justify-between gap-2">
                    <View className="flex-1 flex-row items-center gap-2">
                      <View className="bg-rose-200/70 px-2 py-0.5 rounded-full">
                        <Text className="text-rose-800 text-[10px] font-bold">Rentang</Text>
                      </View>
                      <Text className="text-rose-800 text-xs font-bold flex-1">
                        {formatOffDate(item.range.start)} – {formatOffDate(item.range.end)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveOffRange(item.rangeIndex)} hitSlop={8}>
                      <SymbolIcon name="xmark" size={14} color="#991b1b" />
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>
          )}
        </View>

        {/* Save Action Button */}
        <TouchableOpacity
          onPress={handleSaveSchedule}
          disabled={saving}
          className={`h-14 items-center justify-center rounded-xl shadow-xs mb-8 ${
            saving ? 'bg-slate-300' : 'bg-[#D2691E] active:bg-[#B05416]'
          }`}>
          <Text className="text-base font-bold text-white">
            {saving ? 'Menyimpan Jadwal...' : 'Simpan Jadwal Operasional'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
