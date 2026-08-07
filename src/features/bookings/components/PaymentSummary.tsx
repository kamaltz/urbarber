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

const formatCurrency = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null) return '0';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0';
  return num.toLocaleString('id-ID');
};

export function PaymentSummary({
  subtotal,
  travelFee,
  handlingFee,
  discount,
  couponCode,
  totalPrice,
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
