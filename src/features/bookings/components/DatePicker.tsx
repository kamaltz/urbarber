/**
 * Date Picker Component - Calendar date selection
 */

import { Pressable, Text, View } from 'react-native';
import { getZonedToday } from '../utils/slot-datetime';

export type DatePickerProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  startDate?: Date;
  endDate?: Date;
};

export function DatePicker({
  selectedDate,
  onDateChange,
  startDate,
  endDate,
}: DatePickerProps) {
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Canonical WIB date, not the device's local date: a device in another zone (or an
  // emulator left on UTC) would otherwise render a different month, and grey out or
  // open up a day the server disagrees about. Zero-padded ISO dates compare
  // correctly as plain strings, so no further Date construction is needed to order them.
  const todayStr = getZonedToday();
  const [todayYear, todayMonth, todayDay] = todayStr.split('-').map(Number);

  const currentDate = startDate ?? new Date(todayYear, todayMonth - 1, todayDay);
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days: (number | null)[] = Array(firstDay).fill(null);

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const formatDateString = (year: number, month: number, day: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isPastDate = (year: number, month: number, day: number): boolean => {
    return formatDateString(year, month, day) < todayStr;
  };

  return (
    <View className="gap-4">
      <Text className="text-xl font-bold text-slate-900">{getMonthName(currentDate)}</Text>

      {/* Weekday headers */}
      <View className="flex-row justify-between px-2">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
          <Text key={day} className="w-12 text-center text-sm font-semibold text-slate-600">
            {day}
          </Text>
        ))}
      </View>

      {/* Date grid */}
      <View className="gap-2">
        {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIdx) => (
          <View key={weekIdx} className="flex-row justify-between">
            {days.slice(weekIdx * 7, (weekIdx + 1) * 7).map((day, dayIdx) => {
              if (!day) {
                return <View key={`empty-${weekIdx}-${dayIdx}`} className="h-12 w-12" />;
              }

              const dateStr = formatDateString(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day,
              );
              const isSelected = selectedDate === dateStr;
              const isPast = isPastDate(currentDate.getFullYear(), currentDate.getMonth(), day);
              const isDisabled = isPast;

              return (
                <Pressable
                  key={dateStr || `day-${weekIdx}-${dayIdx}`}
                  onPress={() => {
                    if (!isDisabled) {
                      onDateChange(dateStr);
                    }
                  }}
                  disabled={isDisabled}
                  className={`h-12 w-12 items-center justify-center rounded-lg ${
                    isDisabled
                      ? 'bg-slate-100 border border-slate-300'
                      : isSelected
                        ? 'bg-orange-600 border border-orange-600'
                        : 'bg-white border border-slate-200'
                  }`}>
                  <Text
                    className={`font-semibold ${
                      isDisabled
                        ? 'text-slate-400'
                        : isSelected
                          ? 'text-white'
                          : 'text-slate-900'
                    }`}>
                    {day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
