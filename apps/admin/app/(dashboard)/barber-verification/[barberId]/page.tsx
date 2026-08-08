'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import { AdminApiClient, type AdminBarberRegistration } from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DocumentPreview {
  type: string;
  label: string;
  available: boolean;
  loading?: boolean;
  url?: string;
  expiresAt?: string;
  error?: string;
}

export default function BarberVerificationDetailPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const params = useParams();
  const barberId = params.barberId as string;

  const [registration, setRegistration] = useState<AdminBarberRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [previewingDoc, setPreviewingDoc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Load barber registration detail
  useEffect(() => {
    async function load() {
      if (!admin) return;
      try {
        const data = await AdminApiClient.getBarberRegistrationDetail(barberId);
        setRegistration(data);

        // Initialize documents array
        const docTypes: DocumentPreview[] = [
          { type: 'ktp', label: 'KTP', available: !!data.documents?.ktp },
          { type: 'selfie_with_ktp', label: 'Selfie dengan KTP', available: !!data.documents?.selfie_with_ktp },
          { type: 'business_permit', label: 'Surat Ijin Usaha', available: !!data.documents?.business_permit },
        ];
        setDocuments(docTypes);
      } catch (err: any) {
        setError(err.message || 'Gagal load detail.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [barberId, admin]);

  // Handle approve
  const handleApprove = async () => {
    if (!registration) return;
    setApproving(true);
    try {
      await AdminApiClient.approveBarber(barberId);
      alert('Barber berhasil disetujui.');
      router.push('/barber-verification');
    } catch (err: any) {
      alert(`Gagal approve: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!registration || !rejectReason.trim()) {
      alert('Alasan penolakan diperlukan.');
      return;
    }
    setApproving(true);
    try {
      await AdminApiClient.rejectBarber(barberId, rejectReason);
      alert('Barber berhasil ditolak.');
      router.push('/barber-verification');
    } catch (err: any) {
      alert(`Gagal reject: ${err.message}`);
    } finally {
      setApproving(false);
      setRejectModal(false);
    }
  };

  // Load document preview
  const loadDocumentPreview = async (docType: string) => {
    setPreviewingDoc(docType);
    setPreviewLoading(true);
    try {
      const { url, expiresAt } = await AdminApiClient.getDocumentUrl(barberId, docType);
      setPreviewUrl(url);
      
      // Update documents array
      setDocuments((prev) =>
        prev.map((d) =>
          d.type === docType ? { ...d, url, expiresAt, loading: false } : d
        )
      );
    } catch (err: any) {
      alert(`Gagal load dokumen: ${err.message}`);
      setDocuments((prev) =>
        prev.map((d) =>
          d.type === docType ? { ...d, error: err.message, loading: false } : d
        )
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8">Memuat...</div>;
  }

  if (error || !registration) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  const isPending = registration.verificationStatus === 'pending';
  const statusColor = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }[registration.verificationStatus];

  return (
    <div className="p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{registration.businessName}</h1>
        <div className="flex gap-4 items-center">
          <span className={`px-4 py-2 rounded font-semibold ${statusColor}`}>
            {registration.verificationStatus.charAt(0).toUpperCase() + registration.verificationStatus.slice(1)}
          </span>
          <span className="text-gray-600">
            Diajukan: {registration.submittedAt ? new Date(registration.submittedAt).toLocaleDateString('id-ID') : '-'}
          </span>
        </div>
      </div>

      {/* Business Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Informasi Bisnis</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Pemilik</label>
            <p className="text-lg">{registration.ownerName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nama Bisnis</label>
            <p className="text-lg">{registration.businessName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
            <p className="text-lg">{registration.phoneNumber || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Alamat</label>
            <p className="text-lg">{registration.businessAddress || '-'}</p>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700">Area Layanan</label>
            <p className="text-lg">{registration.serviceArea || '-'}</p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Dokumen Verifikasi</h2>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.type} className="flex items-center justify-between p-4 border rounded">
              <div>
                <p className="font-medium">{doc.label}</p>
                {doc.available ? (
                  <p className="text-sm text-green-600">✓ Tersedia</p>
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada dokumen</p>
                )}
                {doc.error && <p className="text-sm text-red-600">Error: {doc.error}</p>}
                {doc.expiresAt && (
                  <p className="text-xs text-gray-500">
                    Kadaluarsa: {new Date(doc.expiresAt).toLocaleTimeString('id-ID')}
                  </p>
                )}
              </div>
              {doc.available && (
                <button
                  onClick={() => loadDocumentPreview(doc.type)}
                  disabled={doc.loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {doc.loading ? 'Memuat...' : 'Lihat'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Preview Modal */}
        {previewingDoc && previewUrl && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg max-w-3xl max-h-96 overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  {documents.find((d) => d.type === previewingDoc)?.label}
                </h3>
                <button
                  onClick={() => {
                    setPreviewingDoc(null);
                    setPreviewUrl(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <img
                src={previewUrl}
                alt="Document preview"
                className="max-w-full h-auto rounded"
              />
            </div>
          </div>
        )}
      </div>

      {/* Review Notes */}
      {registration.rejectionReason && (
        <div className="bg-red-50 rounded-lg p-6 mb-8 border border-red-200">
          <h3 className="font-semibold text-red-900 mb-2">Alasan Penolakan</h3>
          <p className="text-red-800">{registration.rejectionReason}</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="flex gap-4">
          <button
            onClick={handleApprove}
            disabled={approving}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
          >
            {approving ? 'Memproses...' : 'Setujui'}
          </button>
          <button
            onClick={() => setRejectModal(true)}
            disabled={approving}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-semibold"
          >
            Tolak
          </button>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md">
            <h3 className="text-2xl font-semibold mb-4">Tolak Pendaftaran</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              className="w-full p-3 border rounded mb-4 h-24"
            />
            <div className="flex gap-4">
              <button
                onClick={() => setRejectModal(false)}
                className="flex-1 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={approving}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {approving ? 'Memproses...' : 'Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
