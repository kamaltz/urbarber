import { Text, View } from 'react-native';

export type PaymentSummaryProps = {
  subtotal: number;
  homeServiceFee?: number;
  tipAmount?: number;
  travelFee?: number;
  handlingFee?: number;
  discount?: number;
  couponCode?: string;
  totalPrice: number;
};

const formatCurrency = (amount?: number | string | null): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (!isFinite(num) || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('id-ID').format(num);
};

export function PaymentSummary({
  subtotal = 0,
  homeServiceFee = 0,
  tipAmount = 0,
  travelFee = 0,
  handlingFee = 0,
  discount = 0,
  couponCode = '',
  totalPrice = 0,
}: PaymentSummaryProps) {
  const effectiveHomeFee = homeServiceFee || travelFee || 0;

  return (
    <View className="gap-3.5 rounded-2xl bg-white p-4.5 border border-slate-200/80 shadow-xs">
      <Text className="text-xs font-bold text-[#363062] uppercase tracking-wider mb-0.5">
        Rincian Pembayaran
      </Text>

      {/* Subtotal */}
      <View className="flex-row justify-between items-center">
        <Text className="text-xs font-medium text-slate-600">Subtotal Layanan</Text>
        <Text className="text-sm font-bold text-[#363062]">Rp {formatCurrency(subtotal)}</Text>
      </View>

      {/* Mandatory Home Service Fee */}
      {effectiveHomeFee > 0 ? (
        <View className="flex-row justify-between items-center border-t border-slate-100 pt-2.5">
          <Text className="text-xs font-medium text-slate-600">Biaya Layanan ke Rumah</Text>
          <Text className="text-sm font-bold text-[#363062]">Rp {formatCurrency(effectiveHomeFee)}</Text>
        </View>
      ) : null}

      {/* Optional Barber Tip */}
      {tipAmount > 0 ? (
        <View className="flex-row justify-between items-center border-t border-slate-100 pt-2.5">
          <Text className="text-xs font-medium text-slate-600">Tip Barber (Opsional)</Text>
          <Text className="text-sm font-bold text-amber-600">Rp {formatCurrency(tipAmount)}</Text>
        </View>
      ) : null}

      {/* Handling Fee */}
      {handlingFee ? (
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-medium text-slate-600">Biaya Layanan Platform</Text>
          <Text className="text-sm font-bold text-[#363062]">Rp {formatCurrency(handlingFee)}</Text>
        </View>
      ) : null}

      {/* Discount */}
      {discount ? (
        <View className="flex-row justify-between items-center">
          <Text className="text-xs font-medium text-slate-600">
            Diskon {couponCode ? `(${couponCode})` : ''}
          </Text>
          <Text className="text-sm font-bold text-emerald-600">
            -Rp {formatCurrency(discount)}
          </Text>
        </View>
      ) : null}

      {/* Total */}
      <View className="flex-row justify-between items-center border-t border-slate-200/80 pt-3 mt-1">
        <Text className="text-base font-bold text-[#363062]">Total Pembayaran</Text>
        <Text className="text-lg font-extrabold text-[#D2691E]">
          Rp {formatCurrency(totalPrice || subtotal + effectiveHomeFee + tipAmount)}
        </Text>
      </View>
    </View>
  );
}
