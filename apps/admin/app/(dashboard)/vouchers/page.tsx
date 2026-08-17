'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminVoucher, type VoucherCreateInput, type VoucherUpdateInput } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { useEffect, useState } from 'react';

const EMPTY_FORM: VoucherCreateInput = {
  code: '',
  name: '',
  description: '',
  discountType: 'fixed',
  discountValue: 0,
  validFrom: new Date().toISOString().slice(0, 10),
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  status: 'active',
};

function formatCurrency(amount?: number): string {
  if (amount === undefined) return '-';
  return new Intl.NumberFormat('id-ID').format(amount);
}

export default function VouchersPage() {
  const { admin } = useAdminAuth();

  const [vouchers, setVouchers] = useState<AdminVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<VoucherCreateInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadVouchers = async (status = statusFilter, searchTerm = search) => {
    if (!admin) return;
    setLoading(true);
    try {
      const data = await AdminApiClient.getVouchers(status, searchTerm || undefined);
      setVouchers(data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Gagal load daftar voucher.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, statusFilter]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingCode(null);
    setFormError(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (voucher: AdminVoucher) => {
    setFormData({
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || '',
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      maxDiscountAmount: voucher.maxDiscountAmount,
      minimumBaseAmount: voucher.minimumBaseAmount,
      validFrom: voucher.validFrom.slice(0, 10),
      validUntil: voucher.validUntil.slice(0, 10),
      usageLimit: voucher.usageLimit,
      perUserLimit: voucher.perUserLimit,
    });
    setEditingCode(voucher.code);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!editingCode && !formData.code.trim()) {
      setFormError('Kode voucher wajib diisi.');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Nama voucher wajib diisi.');
      return;
    }
    if (formData.discountType === 'percentage' && (formData.discountValue <= 0 || formData.discountValue > 100)) {
      setFormError('Persentase diskon harus antara 0 dan 100.');
      return;
    }
    if (formData.discountType === 'fixed' && formData.discountValue <= 0) {
      setFormError('Nominal diskon harus lebih besar dari 0.');
      return;
    }
    if (new Date(formData.validFrom).getTime() >= new Date(formData.validUntil).getTime()) {
      setFormError('Tanggal berakhir harus setelah tanggal mulai.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingCode) {
        const update: VoucherUpdateInput = {
          name: formData.name,
          description: formData.description,
          discountType: formData.discountType,
          discountValue: formData.discountValue,
          maxDiscountAmount: formData.maxDiscountAmount ?? null,
          minimumBaseAmount: formData.minimumBaseAmount ?? null,
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil).toISOString(),
          usageLimit: formData.usageLimit ?? null,
          perUserLimit: formData.perUserLimit ?? null,
        };
        await AdminApiClient.updateVoucher(editingCode, update);
      } else {
        await AdminApiClient.createVoucher({
          ...formData,
          validFrom: new Date(formData.validFrom).toISOString(),
          validUntil: new Date(formData.validUntil).toISOString(),
        });
      }
      setModalOpen(false);
      resetForm();
      await loadVouchers();
    } catch (err) {
      if (getErrorMessage(err).includes('VOUCHER_ALREADY_EXISTS')) {
        setFormError('Kode voucher sudah digunakan.');
      } else {
        setFormError(getErrorMessage(err, 'Gagal menyimpan voucher.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (voucher: AdminVoucher) => {
    const nextStatus = voucher.status === 'active' ? 'inactive' : 'active';
    const confirmMessage =
      nextStatus === 'inactive'
        ? `Nonaktifkan voucher ${voucher.code}?`
        : `Aktifkan kembali voucher ${voucher.code}?`;
    if (!confirm(confirmMessage)) return;

    try {
      await AdminApiClient.setVoucherStatus(voucher.code, nextStatus);
      await loadVouchers();
    } catch (err) {
      alert(`Gagal update status voucher: ${getErrorMessage(err)}`);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manajemen Voucher</h1>
        <button
          onClick={handleOpenCreate}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          + Buat Voucher
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded font-medium ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              {s === 'all' ? 'Semua' : s === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadVouchers()}
            placeholder="Cari kode atau nama..."
            className="p-2 border rounded w-64"
          />
          <button
            onClick={() => loadVouchers()}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 font-medium"
          >
            Cari
          </button>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : vouchers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada voucher untuk filter ini.</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Kode</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Diskon</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Periode</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Penggunaan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.code} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-semibold">{v.code}</td>
                  <td className="px-6 py-4">{v.name}</td>
                  <td className="px-6 py-4">
                    {v.discountType === 'percentage' ? `${v.discountValue}%` : `Rp ${formatCurrency(v.discountValue)}`}
                    {v.maxDiscountAmount ? (
                      <div className="text-xs text-gray-500">maks Rp {formatCurrency(v.maxDiscountAmount)}</div>
                    ) : null}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {new Date(v.validFrom).toLocaleDateString('id-ID')} -{' '}
                    {new Date(v.validUntil).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-xs">
                    {v.usageCount}
                    {v.usageLimit ? ` / ${v.usageLimit}` : ''}
                    {v.perUserLimit ? <div className="text-gray-500">maks {v.perUserLimit}/pengguna</div> : null}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        v.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {v.status === 'active' ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-3">
                    <button onClick={() => handleOpenEdit(v)} className="text-blue-600 hover:text-blue-800 font-medium">
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(v)}
                      className={v.status === 'active' ? 'text-red-600 hover:text-red-800 font-medium' : 'text-green-600 hover:text-green-800 font-medium'}
                    >
                      {v.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-semibold mb-6">{editingCode ? `Edit Voucher ${editingCode}` : 'Buat Voucher Baru'}</h3>

            {formError && <div className="bg-red-100 text-red-800 p-3 rounded mb-4 text-sm">{formError}</div>}

            <div className="space-y-4">
              {!editingCode && (
                <div>
                  <label className="block text-sm font-medium mb-1">Kode Voucher *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full p-2 border rounded font-mono"
                    placeholder="HEMAT50K"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Nama *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Diskon Spesial"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2 border rounded h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tipe Diskon</label>
                  <div className="flex gap-2">
                    {(['fixed', 'percentage'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormData({ ...formData, discountType: t })}
                        className={`px-3 py-2 rounded text-sm font-medium ${
                          formData.discountType === t ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        {t === 'fixed' ? 'Nominal' : 'Persen'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nilai Diskon {formData.discountType === 'percentage' ? '(%)' : '(Rp)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formData.discountType === 'percentage' ? 100 : undefined}
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              {formData.discountType === 'percentage' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Diskon Maksimum (Rp, opsional)</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.maxDiscountAmount ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, maxDiscountAmount: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Minimum Belanja (Rp, opsional)</label>
                <input
                  type="number"
                  min={0}
                  value={formData.minimumBaseAmount ?? ''}
                  onChange={(e) =>
                    setFormData({ ...formData, minimumBaseAmount: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Berlaku Mulai *</label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Berlaku Sampai *</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Batas Penggunaan Total (opsional)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.usageLimit ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, usageLimit: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Batas per Pengguna (opsional)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.perUserLimit ?? ''}
                    onChange={(e) =>
                      setFormData({ ...formData, perUserLimit: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    className="w-full p-2 border rounded"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : editingCode ? 'Update' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
