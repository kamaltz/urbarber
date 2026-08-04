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
        <Text className="font-semibold text-slate-900">Rp {subtotal.toLocaleString('id-ID')}</Text>
      </View>

      {/* Travel Fee */}
      {travelFee ? (
        <View className="flex-row justify-between border-t border-slate-200 pt-3">
          <Text className="text-slate-600">Biaya Perjalanan</Text>
          <Text className="font-semibold text-slate-900">Rp {travelFee.toLocaleString('id-ID')}</Text>
        </View>
      ) : null}

      {/* Handling Fee */}
      {handlingFee ? (
        <View className="flex-row justify-between">
          <Text className="text-slate-600">Biaya Layanan</Text>
          <Text className="font-semibold text-slate-900">Rp {handlingFee.toLocaleString('id-ID')}</Text>
        </View>
      ) : null}

      {/* Discount */}
      {discount ? (
        <View className="flex-row justify-between">
          <Text className="text-slate-600">
            Diskon {couponCode ? `(${couponCode})` : ''}
          </Text>
          <Text className="font-semibold text-green-600">
            -Rp {discount.toLocaleString('id-ID')}
          </Text>
        </View>
      ) : null}

      {/* Total */}
      <View className="flex-row justify-between border-t border-slate-200 pt-3">
        <Text className="text-lg font-bold text-slate-900">Harga Total</Text>
        <Text className="text-lg font-bold text-orange-600">
          Rp {totalPrice.toLocaleString('id-ID')}
        </Text>
      </View>
    </View>
  );
}
