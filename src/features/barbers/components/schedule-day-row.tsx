/**
 * ScheduleDayRow Component
 * Single day schedule row with toggle and time fields
 */

import React from 'react';
import { Pressable, Text, View, Switch, TextInput } from 'react-native';
import type { BarberScheduleDay } from '../types/barber';

interface ScheduleDayRowProps {
  day: BarberScheduleDay;
  onToggle?: (dayOfWeek: string, isOpen: boolean) => void;
  onStartTimeChange?: (dayOfWeek: string, time: string) => void;
  onEndTimeChange?: (dayOfWeek: string, time: string) => void;
  editable?: boolean;
}

const dayLabels: Record<string, string> = {
  Monday: 'Senin',
  Tuesday: 'Selasa',
  Wednesday: 'Rabu',
  Thursday: 'Kamis',
  Friday: 'Jumat',
  Saturday: 'Sabtu',
  Sunday: 'Minggu',
};

export function ScheduleDayRow({
  day,
  onToggle,
  onStartTimeChange,
  onEndTimeChange,
  editable = true,
}: ScheduleDayRowProps) {
  return (
    <View className="bg-white border border-slate-100 rounded-lg p-4 mb-3">
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-slate-900 font-semibold text-base">
          {dayLabels[day.dayOfWeek]}
        </Text>
        {editable && (
          <Switch
            value={day.isOpen}
            onValueChange={(value) =>
              onToggle?.(day.dayOfWeek, value)
            }
            trackColor={{ false: '#e5e7eb', true: '#fed7aa' }}
            thumbColor={day.isOpen ? '#d2691e' : '#9ca3af'}
          />
        )}
        {!editable && (
          <Text className={day.isOpen ? 'text-green-600' : 'text-slate-400'}>
            {day.isOpen ? 'Buka' : 'Tutup'}
          </Text>
        )}
      </View>

      {day.isOpen && (
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Text className="text-slate-500 text-xs font-medium mb-2">
              Jam Buka
            </Text>
            <TextInput
              value={day.startTime || ''}
              onChangeText={(text) => onStartTimeChange?.(day.dayOfWeek, text)}
              placeholder="08:00"
              editable={editable}
              className="border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
            />
          </View>
          <View className="flex-1">
            <Text className="text-slate-500 text-xs font-medium mb-2">
              Jam Tutup
            </Text>
            <TextInput
              value={day.endTime || ''}
              onChangeText={(text) => onEndTimeChange?.(day.dayOfWeek, text)}
              placeholder="17:00"
              editable={editable}
              className="border border-slate-200 rounded-lg px-3 py-2 text-slate-900"
            />
          </View>
        </View>
      )}
    </View>
  );
}
