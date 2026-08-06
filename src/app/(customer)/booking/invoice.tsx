import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Loading } from '@/components/ui/Loading';
import { routes } from '@/constants/routes';
import { paymentRepository } from '@/features/payments/repository/payment.repository';
import type { PaymentRecord, PaymentStatus } from '@/types/domain';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

export default function BookingInvoiceScreen() {
  const params = useLocalSearchParams<{
    barberId?: string;
    serviceId?: string;
    date?: string;
    startTime?: string;
    address?: string;
    notes?: string;
    serviceName?: string;
    servicePrice?: string;
    barberName?: string;
    bookingId?: string;
  }>();

  const [bookingId, setBookingId] = useState<string | null>(params.bookingId || null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!params.bookingId);
  const [error, setError] = useState<string | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Initialize booking & Midtrans Snap payment
  const handleInitiatePayment = useCallback(async () => {
    if (bookingId && redirectUrl) return;

    setLoading(true);
    setError(null);

    const res = await paymentRepository.createBookingPayment({
      barberId: params.barberId || '',
      serviceId: params.serviceId || '',
      date: params.date || new Date().toISOString().split('T')[0],
      startTime: params.startTime || '10:00',
      address: params.address || 'Alamat Pelanggan',
      notes: params.notes || '',
    });

    if (res.success && res.data) {
      setBookingId(res.data.bookingId);
      setRedirectUrl(res.data.redirectUrl);
    } else {
      setError(res.error?.message || 'Gagal menyiapkan tagihan pembayaran.');
    }
    setLoading(false);
  }, [bookingId, redirectUrl, params]);

  useEffect(() => {
    if (!params.bookingId && !bookingId) {
      void handleInitiatePayment();
    }
  }, [params.bookingId, bookingId, handleInitiatePayment]);

  // Real-time subscription to payment document
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = paymentRepository.subscribePaymentStatus(
      bookingId,
      (record) => {
        setPaymentRecord(record);
        if (record?.status === 'paid') {
          // Automatic navigation on paid
          setTimeout(() => {
            router.replace(routes.customer.activeBooking(bookingId));
          }, 1200);
        }
      }
    );

    return () => unsubscribe();
  }, [bookingId]);

  // Open Snap Redirect browser
  const handleOpenSnapBrowser = async () => {
    if (!redirectUrl && bookingId) {
      void handleInitiatePayment();
      return;
    }

    if (!redirectUrl) {
      setError('URL pembayaran tidak tersedia. Silakan coba lagi.');
      return;
    }

    try {
      setSyncing(true);
      await WebBrowser.openBrowserAsync(redirectUrl);
    } catch (err: any) {
      if (__DEV__) console.warn('[WebBrowser Open Error]', err);
    } finally {
      // After browser closes, call syncBookingPaymentStatus server-side
      if (bookingId) {
        await paymentRepository.syncBookingPaymentStatus(bookingId);
      }
      setSyncing(false);
    }
  };

  const price = Number(params.servicePrice || paymentRecord?.grossAmount || 0);
  const currentStatus: PaymentStatus = paymentRecord?.status || 'initiated';

  const renderStatusBadge = () => {
    switch (currentStatus) {
      case 'paid':
        return (
          <View className="rounded-xl bg-emerald-100 p-4 border border-emerald-200 mb-4 items-center">
            <Text className="text-xl mb-1">✅</Text>
            <Text className="text-base font-bold text-emerald-800">Pembayaran Berhasil!</Text>
            <Text className="text-xs text-emerald-700 mt-1">
              Pesanan Anda telah dikonfirmasi dan menunggu kedatangan barber.
            </Text>
          </View>
        );
      case 'pending':
      case 'initiated':
        return (
          <View className="rounded-xl bg-amber-100 p-4 border border-amber-200 mb-4 items-center">
            <Text className="text-xl mb-1">⏳</Text>
            <Text className="text-base font-bold text-amber-800">Menunggu Pembayaran</Text>
            <Text className="text-xs text-amber-700 mt-1 text-center">
              Silakan selesaikan pembayaran melalui gerbang Midtrans Snap.
            </Text>
          </View>
        );
      case 'expired':
        return (
          <View className="rounded-xl bg-slate-100 p-4 border border-slate-300 mb-4 items-center">
            <Text className="text-xl mb-1">⌛</Text>
            <Text className="text-base font-bold text-slate-800">Pembayaran Kadaluwarsa</Text>
            <Text className="text-xs text-slate-600 mt-1 text-center">
              Batas waktu pembayaran telah habis. Jadwal slot telah dilepaskan.
            </Text>
          </View>
        );
      case 'cancelled':
        return (
          <View className="rounded-xl bg-red-100 p-4 border border-red-200 mb-4 items-center">
            <Text className="text-xl mb-1">🚫</Text>
            <Text className="text-base font-bold text-red-800">Pembayaran Dibatalkan</Text>
            <Text className="text-xs text-red-700 mt-1 text-center">
              Transaksi pembayaran dibatalkan oleh pengguna atau sistem.
            </Text>
          </View>
        );
      case 'failed':
      default:
        return (
          <View className="rounded-xl bg-red-100 p-4 border border-red-200 mb-4 items-center">
            <Text className="text-xl mb-1">❌</Text>
            <Text className="text-base font-bold text-red-800">Pembayaran Gagal</Text>
            <Text className="text-xs text-red-700 mt-1 text-center">
              Transaksi pembayaran tidak berhasil. Silakan coba kembali.
            </Text>
          </View>
        );
    }
  };

  if (loading) {
    return (
      <CustomerScreen title="Tagihan Pembayaran" description="Menyiapkan gerbang pembayaran Midtrans Snap...">
        <View className="py-20 items-center justify-center">
          <Loading />
          <Text className="text-xs text-slate-500 mt-4 font-medium">Menghubungkan ke server Midtrans Sandbox...</Text>
        </View>
      </CustomerScreen>
    );
  }

  return (
    <CustomerScreen
      title="Rincian Tagihan & Pembayaran"
      description="Selesaikan pembayaran dengan Midtrans Snap Sandbox (Virtual Account / QRIS / E-Wallet)."
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {renderStatusBadge()}

        {/* Invoice Summary Card */}
        <AppCard className="p-5 mb-5 border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Rincian Pemesanan
          </Text>

          <View className="mb-3 pb-3 border-b border-slate-100">
            <Text className="text-xs text-slate-500">Master Barber</Text>
            <Text className="text-sm font-bold text-slate-900">{params.barberName || 'Barber URBarber'}</Text>
          </View>

          <View className="mb-3 pb-3 border-b border-slate-100">
            <Text className="text-xs text-slate-500">Layanan Dipilih</Text>
            <Text className="text-sm font-semibold text-slate-800">{params.serviceName || 'Layanan Pangkas Rambut'}</Text>
          </View>

          <View className="mb-3 pb-3 border-b border-slate-100">
            <Text className="text-xs text-slate-500">Jadwal & Waktu</Text>
            <Text className="text-sm font-semibold text-slate-800">
              {params.date || '-'} · {params.startTime || '-'}
            </Text>
          </View>

          <View className="mb-1">
            <Text className="text-xs text-slate-500">Alamat Panggilan (Home Service)</Text>
            <Text className="text-xs font-medium text-slate-700 mt-0.5">{params.address || '-'}</Text>
          </View>

          <View className="mt-4 pt-4 border-t border-slate-200 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-slate-900">Total Pembayaran</Text>
            <Text className="text-lg font-black text-[#D2691E]">
              Rp {price.toLocaleString('id-ID')}
            </Text>
          </View>
        </AppCard>

        {/* Errors & Feedback */}
        {error ? (
          <View className="rounded-xl bg-red-50 p-4 border border-red-200 mb-5">
            <Text className="text-xs font-medium text-red-700 text-center">{error}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View className="gap-3 mb-8">
          {currentStatus === 'paid' ? (
            <AppButton
              label="Lihat Detail Pesanan"
              onPress={() => bookingId && router.replace(routes.customer.activeBooking(bookingId))}
              variant="primary"
            />
          ) : (
            <>
              <AppButton
                label={syncing ? 'Menyinkronkan Status...' : 'Bayar Sekarang (Midtrans Snap)'}
                onPress={handleOpenSnapBrowser}
                variant="primary"
                disabled={syncing || !redirectUrl}
              />

              {syncing ? (
                <View className="flex-row items-center justify-center gap-2 py-2">
                  <ActivityIndicator size="small" color="#D2691E" />
                  <Text className="text-xs text-slate-600">Mengecek status transaksi di Midtrans...</Text>
                </View>
              ) : null}

              <AppButton
                label="Kembali ke Beranda"
                onPress={() => router.replace(routes.customer.home)}
                variant="secondary"
              />
            </>
          )}
        </View>
      </ScrollView>
    </CustomerScreen>
  );
}
