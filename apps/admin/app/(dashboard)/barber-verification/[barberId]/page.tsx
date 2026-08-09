'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import {
  ALL_DOCUMENT_TYPES,
  AdminApiClient,
  DOCUMENT_TYPE_LABELS,
  type AdminBarberRegistration,
  type AllowedDocType,
} from '@/lib/api-client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DocumentPreview {
  type: AllowedDocType;
  label: string;
  available: boolean;
  loading?: boolean;
  url?: string;
  expiresAt?: string;
  error?: string;
}

/**
 * Maps a document-url request failure to a safe, user-facing Indonesian message.
 * Never surfaces raw Supabase errors, storage paths, service-role values, or
 * internal stack traces -- only the backend's already-sanitized error code is used.
 */
function documentErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'INVALID_DOCUMENT_TYPE':
      return 'Jenis dokumen tidak valid.';
    case 'NOT_FOUND':
      return 'Dokumen tidak ditemukan.';
    case 'UNAUTHENTICATED':
      return 'Sesi Anda telah berakhir. Silakan login kembali.';
    case 'FORBIDDEN':
      return 'Anda tidak memiliki akses untuk melihat dokumen ini.';
    case 'SERVER_CONFIGURATION_ERROR':
      return 'Layanan penyimpanan dokumen belum dikonfigurasi di server. Hubungi administrator sistem.';
    case 'STORAGE_ERROR':
      return 'Gagal membuat tautan dokumen. Silakan coba lagi.';
    default:
      return 'Gagal memuat dokumen. Silakan coba lagi.';
  }
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

        // Initialize documents array from the presence-only map -- the browser
        // never receives raw storage paths, only whether each document type exists.
        const docTypes: DocumentPreview[] = ALL_DOCUMENT_TYPES.map((type) => ({
          type,
          label: DOCUMENT_TYPE_LABELS[type],
          available: !!data.documentsAvailable?.[type],
        }));
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

  // Load document preview -- sends only barberId + documentType, never a storage
  // path. The returned signed URL is short-lived and kept only in-memory (React
  // state) for the preview modal; it is never persisted to Firestore or any
  // browser storage.
  const loadDocumentPreview = async (docType: AllowedDocType) => {
    setPreviewingDoc(docType);
    setPreviewLoading(true);
    try {
      const { url, expiresAt } = await AdminApiClient.getDocumentUrl(barberId, docType);
      setPreviewUrl(url);

      // Update documents array
      setDocuments((prev) =>
        prev.map((d) =>
          d.type === docType ? { ...d, url, expiresAt, loading: false, error: undefined } : d
        )
      );
    } catch (err: any) {
      const message = documentErrorMessage(err.code);
      alert(message);
      setDocuments((prev) =>
        prev.map((d) => (d.type === docType ? { ...d, error: message, loading: false } : d))
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
