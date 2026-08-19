/**
 * ServiceProgressTimeline
 * Vertical step indicator reflecting REAL backend/Firestore state (booking
 * status + tracking status), never a locally-guessed lifecycle. Home Service
 * gets the full 5-step travel timeline; on-the-spot bookings get the
 * simplified 3-step version (no travel/arrival concept).
 */
import { Text, View } from 'react-native';
import type { ServiceWorkspaceStage } from '../../utils/service-workspace-stage';

interface Step {
  key: string;
  label: string;
}

const HOME_SERVICE_STEPS: Step[] = [
  { key: 'accepted', label: 'Pesanan Diterima' },
  { key: 'en_route', label: 'Menuju Pelanggan' },
  { key: 'arrived', label: 'Tiba di Lokasi' },
  { key: 'in_progress', label: 'Mulai Pelayanan' },
  { key: 'completed', label: 'Selesai' },
];

const OTS_STEPS: Step[] = [
  { key: 'accepted', label: 'Pesanan Diterima' },
  { key: 'in_progress', label: 'Mulai Pelayanan' },
  { key: 'completed', label: 'Selesai' },
];

function stepIndexForStage(stage: ServiceWorkspaceStage, isHomeService: boolean): number {
  if (isHomeService) {
    switch (stage) {
      case 'awaiting_trip':
        return 0;
      case 'en_route':
        return 1;
      case 'arrived':
        return 2;
      case 'in_progress':
        return 3;
      case 'completed':
        return 4;
      default:
        return 0;
    }
  }

  switch (stage) {
    case 'ready_to_start':
      return 0;
    case 'in_progress':
      return 1;
    case 'completed':
      return 2;
    default:
      return 0;
  }
}

interface ServiceProgressTimelineProps {
  stage: ServiceWorkspaceStage;
  isHomeService: boolean;
}

export function ServiceProgressTimeline({ stage, isHomeService }: ServiceProgressTimelineProps) {
  if (stage === 'requires_response' || stage === 'terminal_other') return null;

  const steps = isHomeService ? HOME_SERVICE_STEPS : OTS_STEPS;
  const activeIndex = stepIndexForStage(stage, isHomeService);

  return (
    <View className="rounded-2xl bg-white border border-slate-200 p-4">
      {steps.map((step, index) => {
        const isDone = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.key} className="flex-row">
            <View className="items-center" style={{ width: 24 }}>
              <View
                className={[
                  'h-6 w-6 rounded-full items-center justify-center border-2',
                  isDone
                    ? 'bg-emerald-500 border-emerald-500'
                    : isCurrent
                    ? 'bg-[#D2691E] border-[#D2691E]'
                    : 'bg-white border-slate-300',
                ].join(' ')}
              >
                {isDone ? <Text className="text-white text-[10px] font-bold">✓</Text> : null}
              </View>
              {!isLast ? (
                <View className={['w-0.5 flex-1', isDone ? 'bg-emerald-500' : 'bg-slate-200'].join(' ')} style={{ minHeight: 24 }} />
              ) : null}
            </View>
            <View className="flex-1 pb-4 pl-3">
              <Text
                className={[
                  'text-sm',
                  isCurrent ? 'font-extrabold text-slate-900' : isDone ? 'font-semibold text-slate-500' : 'font-medium text-slate-400',
                ].join(' ')}
              >
                {step.label}
              </Text>
              {isCurrent ? <Text className="text-[11px] text-[#D2691E] font-semibold mt-0.5">Tahap saat ini</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
