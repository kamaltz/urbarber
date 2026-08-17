'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminCategory } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/errors';
import { useEffect, useState } from 'react';

export default function CategoriesPage() {
  const { admin } = useAdminAuth();

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    active: true,
    order: 0,
  });

  // Load categories
  useEffect(() => {
    async function load() {
      if (!admin) return;
      try {
        const data = await AdminApiClient.getCategories();
        setCategories(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Gagal load kategori.'));
      } finally {
        setLoading(false);
      }
    }
    setLoading(true);
    load();
  }, [admin]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: '',
      active: true,
      order: 0,
    });
    setEditingId(null);
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      alert('Nama kategori diperlukan.');
      return;
    }
    try {
      const newCat = await AdminApiClient.createCategory(
        formData.name,
        formData.description,
        formData.icon,
        formData.active,
        formData.order
      );
      setCategories([...categories, newCat]);
      resetForm();
      setCreateModal(false);
      alert('Kategori berhasil dibuat.');
    } catch (err) {
      if (getErrorMessage(err).includes('CATEGORY_ALREADY_EXISTS')) {
        alert('Kategori dengan nama ini sudah ada.');
      } else {
        alert(`Gagal buat kategori: ${getErrorMessage(err)}`);
      }
    }
  };

  // Handle update
  const handleUpdate = async (catId: string) => {
    if (!formData.name.trim()) {
      alert('Nama kategori diperlukan.');
      return;
    }
    try {
      const updated = await AdminApiClient.updateCategory(catId, {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        active: formData.active,
        order: formData.order,
      });
      setCategories(categories.map((c) => (c.id === catId ? updated : c)));
      resetForm();
      setCreateModal(false);
      alert('Kategori berhasil diperbarui.');
    } catch (err) {
      alert(`Gagal update kategori: ${getErrorMessage(err)}`);
    }
  };

  // Handle delete
  const handleDelete = async (catId: string) => {
    if (!confirm('Yakin ingin deactivate kategori ini?')) return;
    try {
      await AdminApiClient.deactivateCategory(catId);
      setCategories(categories.filter((c) => c.id !== catId));
      alert('Kategori berhasil dideactivate.');
    } catch (err) {
      alert(`Gagal deactivate kategori: ${getErrorMessage(err)}`);
    }
  };

  // Handle edit
  const handleEdit = (cat: AdminCategory) => {
    setFormData({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || '',
      active: cat.active,
      order: cat.order,
    });
    setEditingId(cat.id);
    setCreateModal(true);
  };

  if (loading) {
    return <div className="p-8">Memuat...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manajemen Kategori</h1>
        <button
          onClick={() => {
            resetForm();
            setCreateModal(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          + Buat Kategori
        </button>
      </div>

      {/* Error State */}
      {error && <div className="bg-red-100 text-red-800 p-4 rounded mb-4">{error}</div>}

      {/* Categories Table */}
      {categories.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Nama</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Deskripsi</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Urutan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-600">{cat.description || '-'}</td>
                  <td className="px-6 py-4">{cat.order}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        cat.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {cat.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(cat)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {categories.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Tidak ada kategori. Buat yang pertama!
        </div>
      )}

      {/* Create/Edit Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full">
            <h3 className="text-2xl font-semibold mb-6">
              {editingId ? 'Edit Kategori' : 'Buat Kategori Baru'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="Nama kategori"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-2 border rounded h-20"
                  placeholder="Deskripsi kategori"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Icon</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className="w-full p-2 border rounded"
                  placeholder="Icon (emoji atau nama)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Urutan</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })
                  }
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="w-4 h-4"
                />
                <label className="text-sm font-medium">Aktif</label>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={() => setCreateModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={() => (editingId ? handleUpdate(editingId) : handleCreate())}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {editingId ? 'Update' : 'Buat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
