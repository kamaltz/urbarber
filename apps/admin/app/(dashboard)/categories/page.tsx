'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminCategory, type CategoryRecommendationRule } from '@/lib/api-client';
import { getAdminErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import { useEffect, useState } from 'react';

const RECOMMENDATION_RULES: { value: CategoryRecommendationRule; label: string; helper: string }[] = [
  { value: 'default', label: 'Default', helper: 'Urutan relevansi bawaan aplikasi.' },
  { value: 'history', label: 'Berdasarkan Riwayat', helper: 'Barber yang pernah dipesan Pelanggan diprioritaskan. Tanpa riwayat, kembali ke Default.' },
  { value: 'nearest', label: 'Terdekat dari Pelanggan', helper: 'Diurutkan berdasarkan jarak. Tanpa lokasi Pelanggan, kembali ke Default.' },
  { value: 'cheapest', label: 'Harga Termurah', helper: 'Layanan dengan harga terendah lebih dulu. Tanpa harga valid, kembali ke Default.' },
  { value: 'highest_rating', label: 'Rating Tertinggi', helper: 'Rating tertinggi lebih dulu; Barber tanpa rating ditampilkan setelah Barber berating.' },
  { value: 'most_popular', label: 'Paling Populer', helper: 'Diurutkan berdasarkan jumlah ulasan. Tanpa ulasan, kembali ke Default.' },
  { value: 'soonest_available', label: 'Tersedia Paling Cepat', helper: 'Jadwal kosong tercepat lebih dulu. Tanpa data jadwal, kembali ke Default.' },
  { value: 'newest', label: 'Barber Terbaru', helper: 'Barber yang baru terdaftar/disetujui lebih dulu.' },
];

const RULE_LABEL: Record<CategoryRecommendationRule, string> = Object.fromEntries(
  RECOMMENDATION_RULES.map((r) => [r.value, r.label])
) as Record<CategoryRecommendationRule, string>;

const EMPTY_FORM = { name: '', description: '', icon: '', active: true, order: 0, recommendationRule: 'default' as CategoryRecommendationRule };

export default function CategoriesPage() {
  const { admin } = useAdminAuth();
  const { showToast, toastElement } = useToast();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadCategories = async () => {
    if (!admin) return;
    try {
      setError(null);
      const data = await AdminApiClient.getCategories();
      setCategories(data);
    } catch (err) {
      setError(getAdminErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingId(null);
    setNameError(null);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setNameError('Nama kategori wajib diisi.');
      return;
    }
    setNameError(null);
    setSaving(true);

    try {
      if (editingId) {
        const updated = await AdminApiClient.updateCategory(editingId, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          icon: formData.icon.trim(),
          active: formData.active,
          order: formData.order,
          recommendationRule: formData.recommendationRule,
        });
        setCategories((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
        showToast('Kategori berhasil diperbarui.');
      } else {
        const created = await AdminApiClient.createCategory(
          formData.name.trim(),
          formData.description.trim(),
          formData.icon.trim(),
          formData.active,
          formData.order,
          formData.recommendationRule
        );
        setCategories((prev) => [...prev, created]);
        showToast('Kategori berhasil dibuat.');
      }
      setModalOpen(false);
      resetForm();
    } catch (err) {
      const message = getAdminErrorMessage(err);
      if (message.includes('CATEGORY_ALREADY_EXISTS')) {
        setNameError('Kategori dengan nama ini sudah ada.');
      } else {
        showToast(message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (cat: AdminCategory) => {
    setTogglingId(cat.id);
    try {
      if (cat.active) {
        await AdminApiClient.deactivateCategory(cat.id);
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? { ...c, active: false } : c)));
        showToast(`"${cat.name}" dinonaktifkan.`);
      } else {
        const updated = await AdminApiClient.updateCategory(cat.id, { active: true });
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? updated : c)));
        showToast(`"${cat.name}" diaktifkan.`);
      }
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleEdit = (cat: AdminCategory) => {
    setFormData({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || '',
      active: cat.active,
      order: cat.order,
      recommendationRule: cat.recommendationRule || 'default',
    });
    setEditingId(cat.id);
    setNameError(null);
    setModalOpen(true);
  };

  const activeCount = categories.filter((c) => c.active).length;

  return (
    <div className="p-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Kategori Layanan</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola kategori layanan yang tersedia di aplikasi.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Tambah Kategori
        </button>
      </div>

      {!loading && !error && (
        <p className="mb-4 text-sm text-slate-500">
          {categories.length} kategori total &middot; {activeCount} aktif
        </p>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <span>{error}</span>
          <button onClick={loadCategories} className="font-semibold underline">
            Coba lagi
          </button>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white shadow-sm" />
          ))}
        </div>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((cat) => (
              <div
                key={cat.id}
                className={`rounded-xl border bg-white p-5 shadow-sm transition ${
                  cat.active ? 'border-slate-200' : 'border-slate-200 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-xl">
                      {cat.icon || '📂'}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{cat.name}</h3>
                      <span className="text-xs text-slate-400">Urutan: {cat.order}</span>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      cat.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {cat.active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                <p className="mt-3 min-h-[2.5rem] text-sm text-slate-600">
                  {cat.description || <span className="italic text-slate-400">Tidak ada deskripsi.</span>}
                </p>

                <div className="mt-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                    Rekomendasi: {RULE_LABEL[cat.recommendationRule] || RULE_LABEL.default}
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-sm font-medium">
                  <button onClick={() => handleEdit(cat)} className="text-blue-600 hover:text-blue-800">
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(cat)}
                    disabled={togglingId === cat.id}
                    className={`disabled:opacity-50 ${
                      cat.active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'
                    }`}
                  >
                    {togglingId === cat.id ? 'Memproses...' : cat.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {!loading && !error && categories.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
          <p className="text-3xl">📂</p>
          <p className="mt-2 font-medium">Belum ada kategori.</p>
          <p className="text-sm">Buat kategori pertama untuk mulai mengelompokkan layanan.</p>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Kategori' : 'Buat Kategori Baru'}
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Nama *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    if (nameError) setNameError(null);
                  }}
                  disabled={saving}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    nameError
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                  }`}
                  placeholder="Contoh: Potong Rambut"
                />
                {nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={saving}
                  className="h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Deskripsi singkat kategori (opsional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Icon</label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholder="✂️ (opsional)"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Urutan</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })}
                    disabled={saving}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  disabled={saving}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Aktif (tampil di aplikasi)
              </label>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Aturan Rekomendasi</label>
                <select
                  value={formData.recommendationRule}
                  onChange={(e) =>
                    setFormData({ ...formData, recommendationRule: e.target.value as CategoryRecommendationRule })
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {RECOMMENDATION_RULES.map((rule) => (
                    <option key={rule.value} value={rule.value}>
                      {rule.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {RECOMMENDATION_RULES.find((r) => r.value === formData.recommendationRule)?.helper}
                </p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Buat Kategori'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastElement}
    </div>
  );
}
