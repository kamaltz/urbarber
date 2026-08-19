/**
 * ServiceDetailCard
 * Compact service + schedule summary. totalAmount is the Barber's net
 * service value (base price only, per BarberBooking's canonical field) --
 * never the application fee, never the customer's gross payment.
 */
import { Text, View } from 'react-native';
import { formatCurrency } from '@/utils/formatters';
import type { BarberService } from '@/features/barbers/types/barber';

interface ServiceDetailCardProps {
  services: BarberService[];
  totalAmount: number;
  homeServiceFee?: number;
  tipAmount?: number;
  bookingDate: string;
  bookingTime: string;
  isHomeService: boolean;
  estimatedMinutes: number | null;
}

export function ServiceDetailCard({
  services,
  totalAmount,
  homeServiceFee,
  tipAmount,
  bookingDate,
  bookingTime,
  isHomeService,
  estimatedMinutes,
}: ServiceDetailCardProps) {
  return (
    <View className="rounded-2xl bg-white border border-slate-200 p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rincian Layanan</Text>
        <View className={['rounded-full px-2.5 py-1', isHomeService ? 'bg-[#EDEFFB]' : 'bg-amber-50'].join(' ')}>
          <Text className={['text-[10px] font-bold', isHomeService ? 'text-[#363062]' : 'text-amber-700'].join(' ')}>
            {isHomeService ? '🏠 Home Service' : '💈 Datang ke Barber'}
          </Text>
        </View>
      </View>

      {services.map((svc, i) => (
        <View key={svc.serviceId || i} className="flex-row items-center justify-between mb-1.5">
          <Text className="text-sm font-medium text-slate-900 flex-1" numberOfLines={1}>
            {svc.name}
          </Text>
          <Text className="text-sm font-bold text-slate-700">{formatCurrency(svc.price)}</Text>
        </View>
      ))}

      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-slate-100">
        <Text className="text-sm font-semibold text-slate-600">Nilai Layanan</Text>
        <Text className="text-base font-extrabold text-slate-900">{formatCurrency(totalAmount)}</Text>
      </View>

      {homeServiceFee || tipAmount ? (
        <Text className="text-[11px] text-slate-500 mt-1">
          {homeServiceFee ? `+ Biaya ke Rumah ${formatCurrency(homeServiceFee)}  ` : ''}
          {tipAmount ? `+ Tip ${formatCurrency(tipAmount)}` : ''}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
        <Text className="text-xs text-slate-500">🗓 {bookingDate} · ⏰ {bookingTime}</Text>
        <Text className="text-xs font-semibold text-slate-600">
          {estimatedMinutes ? `Estimasi ±${estimatedMinutes} menit` : 'Estimasi waktu tidak tersedia'}
        </Text>
      </View>
    </View>
  );
}
