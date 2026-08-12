import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Loading } from '@/components/ui/Loading';
import { routes } from '@/constants/routes';
import { paymentRepository } from '@/features/payments/repository/payment.repository';
import { createPaidCheckoutGuard } from '@/features/payments/utils/paid-checkout-guard';
import type { PaymentRecord, PaymentStatus } from '@/types/domain';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

export default function BookingInvoiceScreen() {
  const params = useLocalSearchParams<{
    barberId?: string;
    serviceId?: string;
    date?: string;
    startTime?: string;
    selectedDate?: string;
    selectedTime?: string;
    address?: string;
    notes?: string;
    serviceName?: string;
    servicePrice?: string;
    barberName?: string;
    bookingId?: string;
    bookingType?: 'home' | 'onsite';
  }>();

  // Unique requestId per booking flow session (retained on retry)
  const requestIdRef = useRef<string | null>(null);

  const getRequestId = useCallback(() => {
    if (!requestIdRef.current) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 9);
      requestIdRef.current = `REQ-${timestamp}-${randomStr}`;
    }
    return requestIdRef.current;
  }, []);

  const [bookingId, setBookingId] = useState<string | null>(params.bookingId || null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!params.bookingId);
  const [error, setError] = useState<string | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  // One-shot guard: authoritative "paid" can arrive via the Firestore subscription
  // and/or the sync-status response. Only the first signal may navigate.
  const paidGuardRef = useRef(createPaidCheckoutGuard());
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToActiveBooking = useCallback((id: string, status: PaymentStatus = 'paid') => {
    if (!paidGuardRef.current.consumeIfPaid(status)) return;
    navigateTimeoutRef.current = setTimeout(() => {
      // Dismiss the entire booking-creation stack (options/schedule/location/invoice)
      // before landing on Active Booking, so Back cannot reopen a paid checkout.
      router.dismissTo(routes.customer.home);
      router.push(routes.customer.activeBooking(id));
    }, 1200);
  }, []);

  useEffect(() => {
    return () => {
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    };
  }, []);

  // Initialize booking & Midtrans Snap payment via Vercel Backend
  const handleInitiatePayment = useCallback(async () => {
    if (bookingId && paymentUrl) return;

    setLoading(true);
    setError(null);

    const res = await paymentRepository.createBookingPayment({
      requestId: getRequestId(),
      barberId: params.barberId || '',
      serviceId: params.serviceId || '',
      date: params.date || params.selectedDate || new Date().toISOString().split('T')[0],
      startTime: params.startTime || params.selectedTime || '10:00',
      address: params.address || 'Alamat Pelanggan',
      notes: params.notes || '',
      bookingType: params.bookingType as 'home' | 'onsite',
    });

    if (res.success && res.data) {
      setBookingId(res.data.bookingId);
      setPaymentUrl(res.data.paymentUrl);
    } else {
      setError(res.error?.message || 'Gagal menyiapkan tagihan pembayaran.');
    }
    setLoading(false);
  }, [bookingId, paymentUrl, params, getRequestId]);

  useEffect(() => {
    let isMounted = true;
    if (!params.bookingId && !bookingId && !paymentUrl) {
      paymentRepository
        .createBookingPayment({
          requestId: getRequestId(),
          barberId: params.barberId || '',
          serviceId: params.serviceId || '',
          date: params.date || params.selectedDate || new Date().toISOString().split('T')[0],
          startTime: params.startTime || params.selectedTime || '10:00',
          address: params.address || 'Alamat Pelanggan',
          notes: params.notes || '',
          bookingType: params.bookingType as 'home' | 'onsite',
        })
        .then((res) => {
          if (!isMounted) return;
          if (res.success && res.data) {
            setBookingId(res.data.bookingId);
            setPaymentUrl(res.data.paymentUrl);
          } else {
            setError(res.error?.message || 'Gagal menyiapkan tagihan pembayaran.');
          }
          setLoading(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [
    params.bookingId,
    bookingId,
    paymentUrl,
    params.barberId,
    params.serviceId,
    params.date,
    params.startTime,
    params.address,
    params.notes,
    params.bookingType,
    getRequestId,
  ]);

  // Real-time subscription to Firestore payment document
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = paymentRepository.subscribePaymentStatus(
      bookingId,
      (record) => {
        setPaymentRecord(record);
        if (record?.status === 'paid') {
          goToActiveBooking(bookingId);
        }
      }
    );

    return () => unsubscribe();
  }, [bookingId, goToActiveBooking]);

  // Open Snap Redirect browser
  const handleOpenSnapBrowser = async () => {
    if (!paymentUrl && bookingId) {
      void handleInitiatePayment();
      return;
    }

    if (!paymentUrl) {
      setError('URL pembayaran tidak tersedia. Silakan coba lagi.');
      return;
    }

    try {
      setSyncing(true);
      await WebBrowser.openBrowserAsync(paymentUrl);
    } catch (err: any) {
      if (__DEV__) console.warn('[WebBrowser Open Error]', err);
    } finally {
      if (bookingId) {
        const syncRes = await paymentRepository.syncBookingPaymentStatus(bookingId);
        if (syncRes.success && syncRes.data?.paymentStatus === 'paid') {
          goToActiveBooking(bookingId);
        }
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
          <Text className="text-xs text-slate-500 mt-4 font-medium">Menghubungkan ke Vercel Backend & Midtrans Sandbox...</Text>
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
              onPress={() => bookingId && goToActiveBooking(bookingId)}
              variant="primary"
            />
          ) : ['expired', 'cancelled', 'failed'].includes(currentStatus) ? (
            <>
              <AppButton
                label="Buat Pesanan Baru"
                onPress={() => router.replace(routes.customer.home)}
                variant="primary"
              />
              <AppButton
                label="Kembali ke Beranda"
                onPress={() => router.replace(routes.customer.home)}
                variant="secondary"
              />
            </>
          ) : (
            <>
              <AppButton
                label={syncing ? 'Menyinkronkan Status...' : 'Bayar Sekarang (Midtrans Snap)'}
                onPress={handleOpenSnapBrowser}
                variant="primary"
                disabled={syncing || !paymentUrl}
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
