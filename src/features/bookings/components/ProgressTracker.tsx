/**
 * Progress Tracker Component - Shows booking status progression
 */

import { Text, View } from 'react-native';
import { BookingStatus } from '../types/booking';

export type ProgressTrackerProps = {
  status: BookingStatus;
};

const STAGES = [
  { key: 'booked', label: 'Dipesan', icon: '📋' },
  { key: 'waiting', label: 'Menunggu', icon: '⏱️' },
  { key: 'on_process', label: 'Proses', icon: '✂️' },
  { key: 'finished', label: 'Selesai', icon: '✓' },
];

export function ProgressTracker({ status }: ProgressTrackerProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <View className="gap-2">
      {/* Stage Labels */}
      <View className="flex-row justify-between px-2">
        {STAGES.map((stage, idx) => (
          <View
            key={stage.key}
            className={`items-center ${idx <= currentStageIndex ? 'opacity-100' : 'opacity-40'}`}>
            <Text className="text-lg">{stage.icon}</Text>
            <Text className="mt-1 text-xs font-semibold text-slate-700">{stage.label}</Text>
          </View>
        ))}
      </View>

      {/* Progress Line */}
      <View className="mt-4 flex-row items-center">
        {STAGES.map((_, idx) => (
          <View key={idx} className="flex-1 flex-row items-center">
            <View
              className={`h-2 flex-1 ${idx <= currentStageIndex ? 'bg-orange-600' : 'bg-slate-300'}`}
            />
            {idx < STAGES.length - 1 && (
              <View className="mx-1 h-2 w-2 rounded-full bg-white" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
