/**
 * Barber manual map location picker (§4 stabilization pass).
 *
 * Writes through the exact same canonical path the existing GPS-detect flow
 * already uses (barberRepository.updateBarberLocation -> barbers/{uid}.location
 * + .geohash + .shopAddress) -- no second/duplicate location field. This
 * screen only produces a candidate {latitude, longitude, address}; nothing
 * is persisted until the barber explicitly confirms.
 */
import { AppButton } from '@/components/ui/AppButton';
import { Header } from '@/components/ui/Header';
import { MAP_CONFIG } from '@/config/map.config';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { barberRepository } from '@/features/barbers/repository/barber.repository';
import {
  hasSavedLocation,
  parseLngLatEvent,
  resolveInitialCandidate,
  type LocationCandidate,
} from '@/features/barbers/utils/location-picker.utils';
import { reverseGeocode } from '@/features/location/services/reverse-geocode.service';
import { validateCoordinates } from '@/features/location/utils/geo.utils';
import { Camera, type CameraRef, Map, ViewAnnotation } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

type Candidate = LocationCandidate;

export default function BarberLocationPickerScreen() {
  const { user } = useAuth();
  const barberId = user?.uid || '';
  const params = useLocalSearchParams<{ lat?: string; lng?: string; shopAddress?: string }>();

  const initialCandidate = useMemo(() => resolveInitialCandidate(params), [params.lat, params.lng]);
  const hadSavedLocation = useMemo(() => hasSavedLocation(params), [params.lat, params.lng]);

  const [candidate, setCandidate] = useState<Candidate>(initialCandidate);
  const [candidateAddress, setCandidateAddress] = useState<string | null>(params.shopAddress || null);
  const [geocoding, setGeocoding] = useState(false);
  const [locatingMe, setLocatingMe] = useState(false);
  const [saving, setSaving] = useState(false);

  const cameraRef = useRef<CameraRef>(null);

  const runReverseGeocode = useCallback(async (point: Candidate) => {
    setGeocoding(true);
    const address = await reverseGeocode(point.latitude, point.longitude);
    setGeocoding(false);
    // null (failed/no result) intentionally leaves candidateAddress as-is
    // rather than overwriting a possibly-still-valid previous address with
    // nothing -- the UI falls back to a generic label for display only
    // (see candidateAddress ?? 'Lokasi dipilih pada peta' below), it never
    // persists a placeholder string as the actual saved address.
    if (address) setCandidateAddress(address);
  }, []);

  const settlePin = useCallback(
    (point: Candidate) => {
      setCandidate(point);
      void runReverseGeocode(point);
    },
    [runReverseGeocode]
  );

  // Silently try current GPS as the initial candidate only when no saved
  // location exists AND permission is already granted -- never prompts (§7).
  // A plain async IIFE inside useEffect (not useMemo, which must stay pure)
  // -- every setState call below happens after an await, so none of them
  // run synchronously within the effect body itself.
  useEffect(() => {
    if (hadSavedLocation) return;
    let cancelled = false;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      try {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setCandidate(point);
        cameraRef.current?.easeTo({ center: [point.longitude, point.latitude], zoom: 15, duration: 400 });
        void runReverseGeocode(point);
      } catch {
        // Silently keep the regional fallback candidate.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadSavedLocation]);

  const handleMapPress = useCallback(
    (event: unknown) => {
      const point = parseLngLatEvent(event);
      if (point) settlePin(point);
    },
    [settlePin]
  );

  const handlePinDragEnd = useCallback(
    (event: unknown) => {
      const point = parseLngLatEvent(event);
      if (point) settlePin(point);
    },
    [settlePin]
  );

  const handleUseMyLocation = useCallback(async () => {
    setLocatingMe(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Izin Ditolak', 'Izin lokasi diperlukan untuk menggunakan lokasi Anda saat ini. Anda tetap dapat memilih lokasi secara manual di peta.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      cameraRef.current?.easeTo({ center: [point.longitude, point.latitude], zoom: 15, duration: 400 });
      settlePin(point);
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Gagal mendapatkan lokasi saat ini.');
    } finally {
      setLocatingMe(false);
    }
  }, [settlePin]);

  const handleConfirm = useCallback(async () => {
    if (saving) return; // prevent double-submit
    if (!barberId) {
      Alert.alert('Gagal', 'Sesi Anda telah berakhir. Silakan login kembali.');
      return;
    }
    if (!validateCoordinates(candidate.latitude, candidate.longitude)) {
      Alert.alert('Gagal', 'Koordinat lokasi tidak valid. Silakan pilih titik lain di peta.');
      return;
    }

    setSaving(true);
    try {
      const res = await barberRepository.updateBarberLocation(barberId, {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        // Only overwrite the canonical address field with a real geocoded
        // result -- never persist the in-picker placeholder label.
        shopAddress: candidateAddress || params.shopAddress || '',
      });

      if (res.success) {
        Alert.alert('Berhasil', 'Lokasi Barber berhasil diperbarui.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        // Never surface res.error?.message directly -- it may carry a raw
        // Firestore error string; always show the friendly fallback.
        Alert.alert('Gagal', 'Lokasi belum berhasil disimpan. Silakan coba lagi.');
      }
    } catch {
      Alert.alert('Gagal', 'Lokasi belum berhasil disimpan. Silakan coba lagi.');
    } finally {
      setSaving(false);
    }
  }, [barberId, candidate, candidateAddress, params.shopAddress, saving]);

  return (
    <View className="flex-1 bg-white">
      <Header title="Pilih Lokasi Barber" showBackButton onBackPress={() => router.back()} className="px-4" />

      <View className="px-4 pb-3">
        <Text className="text-xs text-slate-500">
          Geser pin atau ketuk peta untuk menentukan lokasi Barber.
        </Text>
      </View>

      <View className="flex-1 mx-4 mb-3 overflow-hidden rounded-2xl border border-slate-200">
        <Map mapStyle={MAP_CONFIG.styleUrl} style={{ flex: 1 }} onPress={handleMapPress}>
          <Camera
            ref={cameraRef}
            initialViewState={{
              center: [initialCandidate.longitude, initialCandidate.latitude],
              zoom: hadSavedLocation ? 15 : MAP_CONFIG.defaultViewport.zoom,
            }}
          />
          <ViewAnnotation
            id="barber-location-candidate"
            lngLat={[candidate.longitude, candidate.latitude]}
            draggable
            onDragEnd={handlePinDragEnd}
          >
            <View className="items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-[#D2691E] border-2 border-white shadow-md">
                <Text className="text-sm">📍</Text>
              </View>
            </View>
          </ViewAnnotation>
        </Map>
      </View>

      <View className="px-4 pb-4 gap-3">
        <View className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Lokasi Terpilih</Text>
          {geocoding ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" color="#D2691E" />
              <Text className="text-xs text-slate-500">Mencari alamat...</Text>
            </View>
          ) : (
            <Text className="text-sm font-semibold text-slate-900">
              {candidateAddress || 'Lokasi dipilih pada peta'}
            </Text>
          )}
          <Text className="text-[10px] font-mono text-slate-400 mt-1">
            {candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)}
          </Text>
        </View>

        <View className="flex-row gap-3">
          <AppButton
            label={locatingMe ? 'Mencari...' : '📍 Lokasi Saya'}
            onPress={handleUseMyLocation}
            variant="secondary"
            loading={locatingMe}
            disabled={locatingMe || saving}
            className="flex-1"
          />
          <AppButton
            label={saving ? 'Menyimpan...' : 'Gunakan Lokasi Ini'}
            onPress={handleConfirm}
            variant="primary"
            loading={saving}
            disabled={saving || locatingMe}
            className="flex-1"
          />
        </View>
      </View>
    </View>
  );
}
