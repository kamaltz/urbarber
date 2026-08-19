/**
 * ServiceTimerCard
 * Displays elapsed service time, derived every tick from the canonical
 * `startedAt` timestamp (see service-timer.ts) -- never a locally-persisted
 * counter, so it recovers correctly across remounts/backgrounding and stays
 * consistent if another device opens the same booking.
 */
import { Text, View } from 'react-native';
import { hasExceededEstimate } from '../../utils/service-timer';

interface ServiceTimerCardProps {
  formattedElapsed: string;
  elapsedSeconds: number;
  estimatedMinutes: number | null;
}

export function ServiceTimerCard({ formattedElapsed, elapsedSeconds, estimatedMinutes }: ServiceTimerCardProps) {
  const exceeded = hasExceededEstimate(elapsedSeconds, estimatedMinutes);
  const estimatedSeconds = estimatedMinutes ? estimatedMinutes * 60 : null;
  const progressRatio = estimatedSeconds ? Math.min(1, elapsedSeconds / estimatedSeconds) : null;

  return (
    <View className="rounded-2xl bg-slate-900 p-5 items-center">
      <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Waktu Pelayanan</Text>
      <Text className="text-4xl font-extrabold text-white tabular-nums">{formattedElapsed}</Text>

      {estimatedMinutes ? (
        <Text className="text-xs text-slate-400 mt-2">Estimasi layanan ±{estimatedMinutes} menit</Text>
      ) : (
        <Text className="text-xs text-slate-500 mt-2">Estimasi waktu tidak tersedia</Text>
      )}

      {progressRatio !== null ? (
        <View className="w-full h-1.5 rounded-full bg-slate-700 mt-3 overflow-hidden">
          <View
            className={['h-full rounded-full', exceeded ? 'bg-amber-400' : 'bg-emerald-400'].join(' ')}
            style={{ width: `${Math.round(progressRatio * 100)}%` }}
          />
        </View>
      ) : null}

      {exceeded ? (
        <Text className="text-xs font-semibold text-amber-300 mt-2">Layanan telah melewati estimasi waktu.</Text>
      ) : null}
    </View>
  );
}
