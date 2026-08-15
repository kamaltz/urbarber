import { Text, View } from 'react-native';
import type { BookingStatus } from '@/types/domain';

export type ProgressTrackerProps = {
  status: BookingStatus;
};

const STAGES = [
  { key: 'pending', label: 'Menunggu', icon: '⏱️' },
  { key: 'accepted', label: 'Diterima', icon: '📋' },
  { key: 'in_progress', label: 'Proses', icon: '✂️' },
  { key: 'completed', label: 'Selesai', icon: '✓' },
];

export function ProgressTracker({ status }: ProgressTrackerProps) {
  const currentStageIndex = STAGES.findIndex((s) => s.key === status);

  return (
    <View className="gap-3 rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs">
      <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider">
        Status Progres Pemesanan
      </Text>

      {/* Stage Labels */}
      <View className="flex-row justify-between px-1 mt-1">
        {STAGES.map((stage, idx) => (
          <View
            key={stage.key}
            className={`items-center ${idx <= currentStageIndex ? 'opacity-100' : 'opacity-35'}`}>
            <View className={`h-9 w-9 items-center justify-center rounded-xl mb-1 ${
              idx <= currentStageIndex ? 'bg-[#EDEFFB] border border-[#363062]/20' : 'bg-slate-100'
            }`}>
              <Text className="text-base">{stage.icon}</Text>
            </View>
            <Text className="text-[11px] font-bold text-[#363062]">{stage.label}</Text>
          </View>
        ))}
      </View>

      {/* Progress Line */}
      <View className="mt-2 flex-row items-center px-2">
        {STAGES.map((_, idx) => (
          <View key={`line-${idx}`} className="flex-1 flex-row items-center">
            <View
              className={`h-2 flex-1 rounded-full ${
                idx <= currentStageIndex ? 'bg-[#D2691E]' : 'bg-slate-200'
              }`}
            />
            {idx < STAGES.length - 1 && (
              <View className="mx-1 h-2 w-2 rounded-full bg-white border border-slate-300" />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
