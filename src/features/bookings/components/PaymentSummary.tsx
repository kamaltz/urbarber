/**
 * Payment Summary Component - Shows payment breakdown
 */

import { Text, View } from 'react-native';

export type PaymentSummaryProps = {
  subtotal: number;
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
  // Format number according to Indonesian locale (without currency symbol)
  return new Intl.NumberFormat('id-ID').format(num);
};

export function PaymentSummary({
  subtotal = 0,
  travelFee = 0,
  handlingFee = 0,
  discount = 0,
  couponCode = '',
  totalPrice = 0,
}: PaymentSummaryProps) {
  return (
    <View className="gap-3 rounded-lg bg-slate-50 p-4">
      {/* Subtotal */}
      <View className="flex-row justify-between">
        <Text className="text-slate-600">Subtotal Layanan</Text>
        <Text className="font-semibold text-slate-900">Rp {formatCurrency(subtotal)}</Text>
      </View>

      {/* Travel Fee */}
      {travelFee ? (
        <View className="flex-row justify-between border-t border-slate-200 pt-3">
          <Text className="text-slate-600">Biaya Perjalanan</Text>
          <Text className="font-semibold text-slate-900">Rp {formatCurrency(travelFee)}</Text>
        </View>
      ) : null}

      {/* Handling Fee */}
      {handlingFee ? (
        <View className="flex-row justify-between">
          <Text className="text-slate-600">Biaya Layanan</Text>
          <Text className="font-semibold text-slate-900">Rp {formatCurrency(handlingFee)}</Text>
        </View>
      ) : null}

      {/* Discount */}
      {discount ? (
        <View className="flex-row justify-between">
          <Text className="text-slate-600">
            Diskon {couponCode ? `(${couponCode})` : ''}
          </Text>
          <Text className="font-semibold text-green-600">
            -Rp {formatCurrency(discount)}
          </Text>
        </View>
      ) : null}

      {/* Total */}
      <View className="flex-row justify-between border-t border-slate-200 pt-3">
        <Text className="text-lg font-bold text-slate-900">Harga Total</Text>
        <Text className="text-lg font-bold text-orange-600">
          Rp {formatCurrency(totalPrice)}
        </Text>
      </View>
    </View>
  );
}
