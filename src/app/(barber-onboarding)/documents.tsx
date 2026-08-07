import { AppButton } from '@/components/ui/AppButton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRegistrationService } from '@/features/barbers/services/barber-registration.service';
import { pickImage } from '@/features/services/storage.service';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

export default function BarberOnboardingDocumentsScreen() {
  const { user } = useAuth();
  const uid = user?.uid || '';

  const [documentPaths, setDocumentPaths] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    if (uid) {
      barberRegistrationService.getRegistration(uid).then((reg) => {
        if (!isMounted) return;
        if (reg?.documentPaths) {
          setDocumentPaths(reg.documentPaths);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [uid]);

  const handleUpload = async (docType: 'ktp' | 'business_license' | 'certificate') => {
    setError('');
    try {
      const picked = await pickImage();
      if (!picked) return;

      setUploadingDoc(docType);

      const res = await barberRegistrationService.uploadVerificationDocument(
        uid,
        docType,
        picked.uri,
        picked.mimeType || 'image/jpeg'
      );

      if (!res.success) {
        setError(res.error || 'Gagal mengunggah dokumen.');
        return;
      }

      setDocumentPaths((prev) => ({ ...prev, [docType]: res.documentPath || '' }));
    } catch (err: any) {
      setError('Terjadi kesalahan saat mengunggah berkas.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleNext = () => {
    setError('');
    if (!documentPaths.ktp) {
      setError('Kartu Identitas (KTP) wajib diunggah untuk verifikasi.');
      return;
    }
    router.push('/(barber-onboarding)/review' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-5 pt-6 pb-8">
        <View className="flex-row items-center gap-2 mb-4">
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text className="text-2xl text-slate-700">‹ Kembali</Text>
          </Pressable>
        </View>

        <View className="mb-6">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#D2691E]">
            Langkah 3 dari 4 — Berkas Verifikasi
          </Text>
          <Text className="text-2xl font-bold text-slate-900 mt-1">
            Unggah Dokumen Identitas
          </Text>
          <Text className="text-sm text-slate-500 mt-1">
            Unggah foto/scan dokumen resmi Anda. Dokumen disimpan aman di enkripsi private storage.
          </Text>
        </View>

        <View className="gap-4">
          {/* Card KTP */}
          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-bold text-slate-900">1. KTP / Kartu Identitas *</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Wajib untuk verifikasi identitas mitra</Text>
              </View>
              {documentPaths.ktp ? (
                <Text className="text-xs font-bold text-emerald-600">✓ Terunggah</Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => handleUpload('ktp')}
              disabled={uploadingDoc === 'ktp'}
              className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 items-center"
            >
              {uploadingDoc === 'ktp' ? (
                <ActivityIndicator color="#D2691E" size="small" />
              ) : (
                <Text className="text-xs font-bold text-[#D2691E]">
                  {documentPaths.ktp ? '📷 Ganti Dokumen KTP' : '📷 Unggah Foto KTP'}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Card Sertifikat Keahlian (Opsional) */}
          <View className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-bold text-slate-900">2. Sertifikat / Lisensi Keahlian</Text>
                <Text className="text-xs text-slate-500 mt-0.5">Opsional — meningkatkan kepercayaan pelanggan</Text>
              </View>
              {documentPaths.certificate ? (
                <Text className="text-xs font-bold text-emerald-600">✓ Terunggah</Text>
              ) : null}
            </View>

            <Pressable
              onPress={() => handleUpload('certificate')}
              disabled={uploadingDoc === 'certificate'}
              className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-3 items-center"
            >
              {uploadingDoc === 'certificate' ? (
                <ActivityIndicator color="#D2691E" size="small" />
              ) : (
                <Text className="text-xs font-bold text-[#D2691E]">
                  {documentPaths.certificate ? '📷 Ganti Sertifikat' : '📷 Unggah Sertifikat'}
                </Text>
              )}
            </Pressable>
          </View>

          {error ? (
            <Text className="text-center text-sm text-rose-600 mt-1">{error}</Text>
          ) : null}

          <AppButton
            label="Lanjut ke Peninjauan akhir ›"
            onPress={handleNext}
            disabled={!documentPaths.ktp}
            className="h-[54px] rounded-xl bg-[#D2691E] mt-4"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
