import {
  approveBarberRegistration,
  fetchBarberRegistrationDetail,
  fetchPrivateDocumentUrl,
  rejectBarberRegistration,
} from '@/features/admin/services/admin.service';
import type { AdminBarberRegistrationDetail } from '@/features/admin/types/admin';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function SectionRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View className="mb-3">
      <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</Text>
      <Text className="text-sm text-slate-800 mt-0.5">{value || '-'}</Text>
    </View>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

const DOC_LABELS: Record<string, string> = {
  ktp: 'KTP',
  selfie_with_ktp: 'Selfie + KTP',
  business_permit: 'Izin Usaha',
};

export default function BarberRegistrationDetailScreen() {
  const { barberId } = useLocalSearchParams<{ barberId: string }>();
  const [detail, setDetail] = useState<AdminBarberRegistrationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!barberId) return;
    setError(null);
    try {
      const data = await fetchBarberRegistrationDetail(barberId);
      setDetail(data);
    } catch (err: any) {
      setError(err?.message ?? 'Gagal memuat detail registrasi.');
    }
  }, [barberId]);

  useEffect(() => {
    let active = true;
    if (!barberId) return;
    setLoading(true);
    setError(null);
    fetchBarberRegistrationDetail(barberId)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err: any) => {
        if (active) setError(err?.message ?? 'Gagal memuat detail registrasi.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [barberId]);

  const handleApprove = () => {
    Alert.alert(
      'Setujui Registrasi',
      `Setujui barber "${detail?.ownerName}"? Tindakan ini akan mengaktifkan akun dan listing mereka.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Setujui',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              await approveBarberRegistration(barberId!);
              Alert.alert('Berhasil', 'Barber berhasil disetujui.', [
                { text: 'OK', onPress: () => { fetchDetail(); router.back(); } },
              ]);
            } catch (err: any) {
              Alert.alert('Gagal', err?.message ?? 'Terjadi kesalahan.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Validasi', 'Alasan penolakan wajib diisi.');
      return;
    }
    if (rejectionReason.trim().length > 1000) {
      Alert.alert('Validasi', 'Alasan penolakan maksimal 1000 karakter.');
      return;
    }
    setSubmitting(true);
    try {
      await rejectBarberRegistration(barberId!, rejectionReason.trim());
      Alert.alert('Berhasil', 'Registrasi barber ditolak.', [
        { text: 'OK', onPress: () => { fetchDetail(); router.back(); } },
      ]);
    } catch (err: any) {
      Alert.alert('Gagal', err?.message ?? 'Terjadi kesalahan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDocument = async (docType: string) => {
    setLoadingDoc(docType);
    try {
      const { url } = await fetchPrivateDocumentUrl(barberId!, docType);
      await Linking.openURL(url);
    } catch (err: any) {
      Alert.alert('Gagal', err?.message ?? 'Dokumen tidak dapat dimuat.');
    } finally {
      setLoadingDoc(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="text-slate-500 mt-3">Memuat detail registrasi…</Text>
      </SafeAreaView>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-6">
        <Text className="text-red-500 text-center">{error ?? 'Data tidak ditemukan.'}</Text>
        <TouchableOpacity
          onPress={fetchDetail}
          className="bg-blue-600 rounded-xl px-6 py-3 mt-4"
          id="admin-reg-detail-retry-btn"
        >
          <Text className="text-white font-semibold">Coba Lagi</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const statusStyle = STATUS_STYLES[detail.verificationStatus] ?? 'bg-slate-100 text-slate-500';
  const [statusBg, statusTxt] = statusStyle.split(' ');
  const isPending = detail.verificationStatus === 'pending';
  const availableDocs = Object.entries(detail.availableDocuments ?? {}).filter(([, available]) => available);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1" id="admin-reg-detail-back-btn">
          <Text className="text-blue-600 text-base">‹</Text>
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-bold text-slate-900" numberOfLines={1}>{detail.ownerName}</Text>
          <Text className="text-xs text-slate-500">{detail.businessName}</Text>
        </View>
        <View className={`rounded-full px-3 py-1 ${statusBg}`}>
          <Text className={`text-xs font-semibold capitalize ${statusTxt}`}>{detail.verificationStatus}</Text>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerClassName="pb-10">
        {/* Business Info */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-slate-100">
          <Text className="text-sm font-bold text-slate-700 mb-3">Informasi Pendaftar</Text>
          <SectionRow label="Nama Pemilik" value={detail.ownerName} />
          <SectionRow label="Nama Usaha" value={detail.businessName} />
          <SectionRow label="Email Akun" value={detail.email} />
          <SectionRow label="No. HP" value={detail.phoneNumber} />
          <SectionRow label="Alamat Usaha" value={detail.businessAddress} />
          <SectionRow label="Area Layanan" value={detail.serviceArea} />
          <SectionRow label="Status Akun" value={detail.userStatus} />
          <SectionRow label="Listing Status" value={detail.listingStatus ?? '-'} />
          {detail.ratingAverage > 0 && (
            <SectionRow label="Rating" value={`${detail.ratingAverage.toFixed(1)} ⭐ (${detail.reviewCount} ulasan)`} />
          )}
        </View>

        {/* Rejection reason (if rejected) */}
        {detail.verificationStatus === 'rejected' && detail.rejectionReason ? (
          <View className="bg-red-50 border border-red-200 mx-4 mt-3 rounded-2xl p-4">
            <Text className="text-sm font-semibold text-red-700 mb-1">Alasan Penolakan</Text>
            <Text className="text-sm text-red-600">{detail.rejectionReason}</Text>
          </View>
        ) : null}

        {/* Verification Documents */}
        {availableDocs.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-slate-100">
            <Text className="text-sm font-bold text-slate-700 mb-3">Dokumen Verifikasi</Text>
            <Text className="text-xs text-slate-400 mb-3">
              Tautan dokumen berlaku 5 menit. Tidak tersimpan atau dicatat.
            </Text>
            {availableDocs.map(([docType]) => (
              <TouchableOpacity
                key={docType}
                className={`flex-row items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-2 ${loadingDoc === docType ? 'opacity-60' : ''}`}
                onPress={() => handleViewDocument(docType)}
                disabled={loadingDoc !== null}
                id={`admin-view-doc-${docType}`}
              >
                <View>
                  <Text className="text-sm font-semibold text-blue-700">{DOC_LABELS[docType] ?? docType}</Text>
                  <Text className="text-xs text-blue-400">Ketuk untuk buka (berlaku 5 menit)</Text>
                </View>
                {loadingDoc === docType ? (
                  <ActivityIndicator size="small" color="#3b82f6" />
                ) : (
                  <Text className="text-blue-500 text-base">↗</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Buttons (only for pending) */}
        {isPending && (
          <View className="mx-4 mt-4">
            <TouchableOpacity
              className={`bg-green-600 rounded-2xl py-4 items-center mb-3 ${submitting ? 'opacity-50' : ''}`}
              onPress={handleApprove}
              disabled={submitting}
              id="admin-approve-barber-btn"
            >
              <Text className="text-white font-bold text-base">✓ Setujui Pendaftaran</Text>
            </TouchableOpacity>

            {!showRejectForm ? (
              <TouchableOpacity
                className="bg-red-50 border border-red-200 rounded-2xl py-4 items-center"
                onPress={() => setShowRejectForm(true)}
                id="admin-show-reject-form-btn"
              >
                <Text className="text-red-600 font-semibold text-base">✕ Tolak Pendaftaran</Text>
              </TouchableOpacity>
            ) : (
              <View className="bg-white border border-red-200 rounded-2xl p-4">
                <Text className="text-sm font-semibold text-red-700 mb-2">Alasan Penolakan *</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 min-h-[100px]"
                  placeholder="Jelaskan alasan penolakan dengan jelas dan konstruktif…"
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  id="admin-reject-reason-input"
                />
                <Text className="text-xs text-slate-400 text-right mt-1">{rejectionReason.length}/1000</Text>
                <View className="flex-row gap-3 mt-3">
                  <TouchableOpacity
                    className="flex-1 bg-slate-100 rounded-xl py-3 items-center"
                    onPress={() => { setShowRejectForm(false); setRejectionReason(''); }}
                    id="admin-reject-cancel-btn"
                  >
                    <Text className="text-slate-600 font-medium">Batal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 bg-red-600 rounded-xl py-3 items-center ${submitting ? 'opacity-50' : ''}`}
                    onPress={handleReject}
                    disabled={submitting}
                    id="admin-reject-submit-btn"
                  >
                    <Text className="text-white font-bold">
                      {submitting ? 'Memproses…' : 'Konfirmasi Tolak'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
