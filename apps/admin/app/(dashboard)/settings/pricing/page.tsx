'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminPricingSettings } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { useEffect, useState } from 'react';

const DEFAULT_SETTINGS: AdminPricingSettings = {
  applicationFee: { enabled: false, mode: 'fixed', fixedAmount: 0 },
  homeServiceFee: { enabled: true, mode: 'fixed', fixedAmount: 10000 },
};

export default function PricingSettingsPage() {
  const { admin } = useAdminAuth();

  const [settings, setSettings] = useState<AdminPricingSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!admin) return;
      try {
        const data = await AdminApiClient.getPricingSettings();
        setSettings(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Gagal load pengaturan biaya.'));
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    load();
  }, [admin]);

  const validate = (): string | null => {
    const { applicationFee: appFee, homeServiceFee: homeFee } = settings;

    if (appFee.mode === 'fixed') {
      if (appFee.fixedAmount === undefined || Number.isNaN(appFee.fixedAmount) || appFee.fixedAmount < 0) {
        return 'Nominal biaya aplikasi tetap harus angka >= 0.';
      }
    } else if (appFee.percentage === undefined || Number.isNaN(appFee.percentage) || appFee.percentage < 0 || appFee.percentage > 100) {
      return 'Persentase biaya aplikasi harus antara 0 dan 100.';
    }
    if (appFee.minimumAmount !== undefined && appFee.maximumAmount !== undefined && appFee.minimumAmount > appFee.maximumAmount) {
      return 'Nominal minimum biaya aplikasi tidak boleh lebih besar dari maksimum.';
    }

    if (homeFee.mode === 'fixed') {
      if (homeFee.fixedAmount === undefined || Number.isNaN(homeFee.fixedAmount) || homeFee.fixedAmount < 0) {
        return 'Nominal biaya layanan ke rumah tetap harus angka >= 0.';
      }
    } else {
      if (homeFee.baseAmount === undefined || Number.isNaN(homeFee.baseAmount) || homeFee.baseAmount < 0) {
        return 'Nominal dasar biaya jarak harus angka >= 0.';
      }
      if (homeFee.includedDistanceKm === undefined || Number.isNaN(homeFee.includedDistanceKm) || homeFee.includedDistanceKm < 0) {
        return 'Jarak termasuk harus angka >= 0.';
      }
      if (homeFee.perKmAmount === undefined || Number.isNaN(homeFee.perKmAmount) || homeFee.perKmAmount < 0) {
        return 'Nominal per km harus angka >= 0.';
      }
    }
    if (homeFee.maxServiceDistanceKm !== undefined && (homeFee.maxServiceDistanceKm < 1 || homeFee.maxServiceDistanceKm > 50)) {
      return 'Radius maksimum layanan harus antara 1 dan 50 km.';
    }

    return null;
  };

  const handleSave = async () => {
    setValidationError(null);
    setSuccessMessage(null);
    const validationMessage = validate();
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }

    setSaving(true);
    try {
      const result = await AdminApiClient.updatePricingSettings(settings);
      setSettings(result.settings);
      setSuccessMessage('Pengaturan biaya berhasil disimpan.');
    } catch (err) {
      setValidationError(getErrorMessage(err, 'Gagal menyimpan pengaturan biaya.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Memuat...</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-4xl font-bold mb-2">Pengaturan Biaya</h1>
      <p className="text-gray-600 mb-8">
        Konfigurasi biaya aplikasi dan biaya layanan ke rumah. Perubahan hanya berlaku untuk transaksi baru --
        transaksi yang sudah ada tidak akan berubah.
      </p>

      {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>}
      {validationError && <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{validationError}</div>}
      {successMessage && <div className="bg-green-100 text-green-800 p-4 rounded mb-4">{successMessage}</div>}

      {/* Application Fee */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Biaya Aplikasi</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.applicationFee.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  applicationFee: { ...settings.applicationFee, enabled: e.target.checked },
                })
              }
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Aktif</span>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mode</label>
            <div className="flex gap-2">
              {(['fixed', 'percentage'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, applicationFee: { ...settings.applicationFee, mode } })
                  }
                  className={`px-4 py-2 rounded font-medium ${
                    settings.applicationFee.mode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {mode === 'fixed' ? 'Nominal Tetap' : 'Persentase'}
                </button>
              ))}
            </div>
          </div>

          {settings.applicationFee.mode === 'fixed' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Nominal Tetap (Rp)</label>
              <input
                type="number"
                min={0}
                value={settings.applicationFee.fixedAmount ?? 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    applicationFee: { ...settings.applicationFee, fixedAmount: Number(e.target.value) },
                  })
                }
                className="w-full p-2 border rounded"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-1">Persentase (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.applicationFee.percentage ?? 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    applicationFee: { ...settings.applicationFee, percentage: Number(e.target.value) },
                  })
                }
                className="w-full p-2 border rounded"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Minimum (Rp, opsional)</label>
              <input
                type="number"
                min={0}
                value={settings.applicationFee.minimumAmount ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    applicationFee: {
                      ...settings.applicationFee,
                      minimumAmount: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Maksimum (Rp, opsional)</label>
              <input
                type="number"
                min={0}
                value={settings.applicationFee.maximumAmount ?? ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    applicationFee: {
                      ...settings.applicationFee,
                      maximumAmount: e.target.value === '' ? undefined : Number(e.target.value),
                    },
                  })
                }
                className="w-full p-2 border rounded"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Home Service Fee */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Biaya Layanan ke Rumah</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.homeServiceFee.enabled}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  homeServiceFee: { ...settings.homeServiceFee, enabled: e.target.checked },
                })
              }
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Aktif</span>
          </label>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Mode</label>
            <div className="flex gap-2">
              {(['fixed', 'distance'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, homeServiceFee: { ...settings.homeServiceFee, mode } })
                  }
                  className={`px-4 py-2 rounded font-medium ${
                    settings.homeServiceFee.mode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {mode === 'fixed' ? 'Nominal Tetap' : 'Berdasarkan Jarak'}
                </button>
              ))}
            </div>
          </div>

          {settings.homeServiceFee.mode === 'fixed' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Nominal Tetap (Rp)</label>
              <input
                type="number"
                min={0}
                value={settings.homeServiceFee.fixedAmount ?? 0}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    homeServiceFee: { ...settings.homeServiceFee, fixedAmount: Number(e.target.value) },
                  })
                }
                className="w-full p-2 border rounded"
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nominal Dasar (Rp)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.homeServiceFee.baseAmount ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      homeServiceFee: { ...settings.homeServiceFee, baseAmount: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Jarak Termasuk (km)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.homeServiceFee.includedDistanceKm ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      homeServiceFee: { ...settings.homeServiceFee, includedDistanceKm: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Per km (Rp)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.homeServiceFee.perKmAmount ?? 0}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      homeServiceFee: { ...settings.homeServiceFee, perKmAmount: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Radius Maksimum Layanan (km, opsional, 1-50)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.homeServiceFee.maxServiceDistanceKm ?? ''}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  homeServiceFee: {
                    ...settings.homeServiceFee,
                    maxServiceDistanceKm: e.target.value === '' ? undefined : Number(e.target.value),
                  },
                })
              }
              className="w-full p-2 border rounded"
            />
            <p className="text-xs text-gray-500 mt-1">
              Berlaku untuk semua booking layanan ke rumah, terlepas dari mode biaya di atas.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50"
      >
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </div>
  );
}
