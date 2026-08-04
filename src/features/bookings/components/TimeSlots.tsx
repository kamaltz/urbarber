/**
 * Time Slot Component - Time slot selection
 */

import { Pressable, Text, View } from 'react-native';
import { TimeSlot } from '../types/booking';

export type TimeSlotsProps = {
  slots: TimeSlot[];
  selectedTime: string;
  onTimeSelect: (time: string) => void;
  loading?: boolean;
};

export function TimeSlots({
  slots,
  selectedTime,
  onTimeSelect,
  loading = false,
}: TimeSlotsProps) {
  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-slate-900">Waktu yang tersedia</Text>

      {loading ? (
        <Text className="text-center text-slate-600">Memuat waktu yang tersedia...</Text>
      ) : slots.length === 0 ? (
        <Text className="text-center text-slate-600">Tidak ada waktu yang tersedia untuk tanggal ini</Text>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {slots.map((slot) => (
            <Pressable
              key={slot.id}
              onPress={() => {
                if (slot.available) {
                  onTimeSelect(slot.time);
                }
              }}
              disabled={!slot.available}
              className={`px-4 py-3 rounded-lg border-2 ${
                !slot.available
                  ? 'border-slate-300 bg-slate-100'
                  : selectedTime === slot.time
                    ? 'border-orange-600 bg-orange-50'
                    : 'border-orange-600 bg-white'
              }`}>
              <Text
                className={`font-semibold text-center ${
                  !slot.available
                    ? 'text-slate-400'
                    : selectedTime === slot.time
                      ? 'text-orange-600'
                      : 'text-orange-600'
                }`}>
                {slot.time}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
