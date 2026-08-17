import { CustomerScreen } from '@/components/navigation/CustomerScreen';
import { AppButton } from '@/components/ui/AppButton';
import { AppCard } from '@/components/ui/AppCard';
import { Loading } from '@/components/ui/Loading';
import { TIP_OPTIONS } from '@/constants/payment';
import { routes } from '@/constants/routes';
import { PaymentSummary } from '@/features/bookings/components/PaymentSummary';
import { paymentRepository } from '@/features/payments/repository/payment.repository';
import { createPaidCheckoutGuard } from '@/features/payments/utils/paid-checkout-guard';
import { isPayButtonDisabled } from '@/features/payments/utils/pay-button-state';
import type { PaymentRecord, PaymentStatus } from '@/types/domain';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, InteractionManager, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

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
    latitude?: string;
    longitude?: string;
  }>();

  const customerLocation = useMemo(
    () =>
      params.latitude && params.longitude
        ? { latitude: Number(params.latitude), longitude: Number(params.longitude) }
        : undefined,
    [params.latitude, params.longitude]
  );

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
  const [selectedTip, setSelectedTip] = useState<number>(0);
  // Booking/payment creation is now an explicit user action (see
  // handleInitiatePayment) instead of firing automatically on mount, so the
  // tip/voucher selection UI below is actually visible and usable before the
  // charge is created -- previously the mount-effect fired immediately (with
  // tip always 0 and no voucher), and the full-screen loading state below hid
  // that selection UI for its entire (near-instant) window.
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdPricing, setCreatedPricing] = useState<{
    baseAmount?: number;
    voucherDiscount?: number;
    homeServiceFee?: number;
    applicationFee?: number;
    tipAmount?: number;
    totalAmount?: number;
  } | null>(null);
  const [paymentRecord, setPaymentRecord] = useState<PaymentRecord | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);

  const [voucherInput, setVoucherInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discountAmount: number } | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMessage, setVoucherMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const handleApplyVoucher = async () => {
    if (!voucherInput.trim() || !params.serviceId) return;
    setVoucherLoading(true);
    setVoucherMessage(null);
    const res = await paymentRepository.validateVoucher(voucherInput.trim(), params.serviceId);
    setVoucherLoading(false);

    if (res.success && res.data?.valid && res.data.voucherCode) {
      setAppliedVoucher({ code: res.data.voucherCode, discountAmount: res.data.discountAmount || 0 });
      setVoucherMessage({ text: 'Voucher berhasil digunakan.', ok: true });
    } else {
      setAppliedVoucher(null);
      setVoucherMessage({ text: res.data?.message || res.error?.message || 'Voucher tidak valid.', ok: false });
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput('');
    setVoucherMessage(null);
  };

  // One-shot guard: authoritative "paid" can arrive via the Firestore subscription
  // and/or the sync-status response. Only the first signal may navigate.
  const paidGuardRef = useRef(createPaidCheckoutGuard());
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goToActiveBooking = useCallback((id: string, source: 'subscription' | 'sync' | 'button', status: PaymentStatus = 'paid') => {
    const consumed = paidGuardRef.current.consumeIfPaid(status);
    if (__DEV__) {
      console.log('[PAID_NAV]', { source, consumed });
    }
    if (!consumed) return;
    navigateTimeoutRef.current = setTimeout(() => {
      // Dismiss the entire booking-creation stack (options/schedule/location/invoice)
      // before landing on Active Booking, so Back cannot reopen a paid checkout.
      router.dismissTo(routes.customer.home);
      // dismissTo's screen removal and push's screen insertion are each their
      // own native-stack/Fabric commit. Firing them in the same tick raced
      // Fabric's async view-tree commit for the dismiss against the push's
      // insert, crashing with "addViewAt: failed to insert view / child
      // already has a parent". InteractionManager defers the push until the
      // dismiss transition's interactions have actually finished -- the
      // supported way to sequence two navigation actions, not a magic-number
      // setTimeout.
      InteractionManager.runAfterInteractions(() => {
        router.push(routes.customer.activeBooking(id));
      });
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
      tipAmount: selectedTip,
      voucherCode: appliedVoucher?.code,
      location: customerLocation,
    });

    if (res.success && res.data) {
      setBookingId(res.data.bookingId);
      setPaymentUrl(res.data.paymentUrl);
      setCreatedPricing({
        baseAmount: res.data.baseAmount,
        voucherDiscount: res.data.voucherDiscount,
        homeServiceFee: res.data.homeServiceFee,
        applicationFee: res.data.applicationFee,
        tipAmount: res.data.tipAmount,
        totalAmount: res.data.totalAmount,
      });
    } else {
      setError(res.error?.message || 'Gagal menyiapkan tagihan pembayaran.');
    }
    setLoading(false);
  }, [bookingId, paymentUrl, params, selectedTip, appliedVoucher, customerLocation, getRequestId]);

  // Real-time subscription to Firestore payment document
  useEffect(() => {
    if (!bookingId) return;

    const unsubscribe = paymentRepository.subscribePaymentStatus(
      bookingId,
      (record) => {
        setPaymentRecord(record);
        // Keeps the Pay button's paymentUrl in sync with the authoritative
        // Firestore record. Without this, reopening Invoice for an existing
        // bookingId (paymentUrl state starts null; only the creation path
        // ever set it) left a genuinely still-payable pending transaction
        // permanently disabled -- `!paymentUrl` never became false again.
        if (record?.paymentUrl) {
          setPaymentUrl(record.paymentUrl);
        }
        if (record?.status === 'paid') {
          goToActiveBooking(bookingId, 'subscription');
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

    let browserResult: WebBrowser.WebBrowserResult | undefined;
    try {
      setSyncing(true);
      browserResult = await WebBrowser.openBrowserAsync(paymentUrl);
    } catch (err: any) {
      if (__DEV__) console.warn('[WebBrowser Open Error]', err);
    } finally {
      // The browser's own result (cancel/dismiss/opened) is never treated as
      // payment success -- only the authoritative sync response below is.
      if (bookingId) {
        const syncRes = await paymentRepository.syncBookingPaymentStatus(bookingId);
        const authoritativeStatus = syncRes.success ? syncRes.data?.paymentStatus : undefined;
        if (__DEV__) {
          console.log('[PAYMENT_RETURN]', {
            browserResult: browserResult?.type,
            authoritativePaymentStatus: authoritativeStatus,
          });
        }
        if (authoritativeStatus === 'paid') {
          goToActiveBooking(bookingId, 'sync');
        }
      }
      setSyncing(false);
    }
  };

  // Server-authoritative breakdown once available (Firestore realtime record
  // takes precedence, then the create-response, in that order); before the
  // booking exists, only the service price and the voucher preview discount
  // are actually known -- home service fee and application fee depend on
  // admin settings the client never guesses, so they're simply not shown
  // (not estimated) until the server returns them.
  const baseServicePrice =
    paymentRecord?.baseAmount ?? createdPricing?.baseAmount ?? Number(params.servicePrice || 0);
  const voucherDiscount =
    paymentRecord?.voucherDiscount ?? createdPricing?.voucherDiscount ?? (appliedVoucher ? appliedVoucher.discountAmount : 0);
  const homeServiceFee = paymentRecord?.homeServiceFee ?? createdPricing?.homeServiceFee ?? 0;
  const applicationFee = paymentRecord?.applicationFee ?? createdPricing?.applicationFee ?? 0;
  const tipAmount = paymentRecord?.tipAmount ?? createdPricing?.tipAmount ?? selectedTip;
  const computedTotal =
    paymentRecord?.grossAmount ??
    createdPricing?.totalAmount ??
    Math.max(0, baseServicePrice - voucherDiscount + tipAmount);
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

  if (loading && !bookingId) {
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
      scroll={false}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} removeClippedSubviews={false}>
        {renderStatusBadge()}

        {/* Tip Barber Selection (before payment is created) */}
        {!bookingId ? (
          <AppCard className="p-4 mb-4 border-amber-200 bg-amber-50/50">
            <Text className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">
              💡 Tip Barber (Opsional)
            </Text>
            <Text className="text-xs text-amber-800 mb-3">
              Berikan apresiasi terbaik untuk hasil potongan rambut Master Barber Anda.
            </Text>

            <View className="flex-row flex-wrap gap-2">
              {TIP_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setSelectedTip(option.value)}
                  className={`px-3 py-2 rounded-xl border ${
                    selectedTip === option.value
                      ? 'bg-slate-900 border-slate-900'
                      : 'bg-white border-slate-200'
                  }`}>
                  <Text
                    className={`text-xs font-semibold ${
                      selectedTip === option.value ? 'text-white' : 'text-slate-700'
                    }`}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </AppCard>
        ) : null}

        {/* Voucher (before payment is created) */}
        {!bookingId ? (
          <AppCard className="p-4 mb-4 border-slate-200">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Kode Voucher
            </Text>

            {appliedVoucher ? (
              <View className="flex-row items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5">
                <Text className="text-sm font-bold text-emerald-800">{appliedVoucher.code}</Text>
                <Pressable onPress={handleRemoveVoucher}>
                  <Text className="text-xs font-semibold text-red-600">Hapus Voucher</Text>
                </Pressable>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <TextInput
                  value={voucherInput}
                  onChangeText={(text) => setVoucherInput(text.toUpperCase())}
                  placeholder="Masukkan kode voucher"
                  autoCapitalize="characters"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900"
                />
                <Pressable
                  onPress={handleApplyVoucher}
                  disabled={voucherLoading || !voucherInput.trim()}
                  className={`rounded-xl px-4 py-2.5 ${voucherLoading || !voucherInput.trim() ? 'bg-slate-200' : 'bg-slate-900'}`}>
                  <Text className={`text-xs font-bold ${voucherLoading || !voucherInput.trim() ? 'text-slate-400' : 'text-white'}`}>
                    {voucherLoading ? '...' : 'Gunakan'}
                  </Text>
                </Pressable>
              </View>
            )}

            {voucherMessage ? (
              <Text className={`mt-2 text-xs font-medium ${voucherMessage.ok ? 'text-emerald-700' : 'text-red-600'}`}>
                {voucherMessage.text}
              </Text>
            ) : null}
          </AppCard>
        ) : null}

        {/* Invoice Summary Card */}
        <AppCard className="p-5 mb-5 border-slate-200">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Rincian Pemesanan & Layanan
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

          <View className="mb-4">
            <Text className="text-xs text-slate-500">Alamat Panggilan</Text>
            <Text className="text-xs font-medium text-slate-700 mt-0.5">{params.address || '-'}</Text>
          </View>

          {/* Detailed Price Breakdown -- values are the authoritative server
              breakdown once the booking/payment exists; only the base price
              and voucher preview discount are shown as an estimate before that. */}
          <PaymentSummary
            subtotal={baseServicePrice}
            homeServiceFee={homeServiceFee}
            handlingFee={applicationFee}
            discount={voucherDiscount}
            couponCode={appliedVoucher?.code || paymentRecord?.voucherCode || undefined}
            tipAmount={tipAmount}
            totalPrice={computedTotal}
          />
        </AppCard>

        {/* Errors & Feedback */}
        {error ? (
          <View className="rounded-xl bg-red-50 p-4 border border-red-200 mb-5">
            <Text className="text-xs font-medium text-red-700 text-center">{error}</Text>
          </View>
        ) : null}

        {/* Action Buttons */}
        <View className="gap-3 mb-8">
          {!bookingId ? (
            <AppButton
              label={loading ? 'Menyiapkan Tagihan...' : 'Lanjutkan ke Pembayaran'}
              onPress={handleInitiatePayment}
              variant="primary"
              disabled={loading}
            />
          ) : currentStatus === 'paid' ? (
            <AppButton
              label="Lihat Detail Pesanan"
              onPress={() => bookingId && goToActiveBooking(bookingId, 'button')}
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
                disabled={isPayButtonDisabled({ status: currentStatus, paymentUrl, syncing })}
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
