'use client';

import { useAdminAuth } from '@/features/auth/AdminAuthProvider';
import {
  ALL_DOCUMENT_TYPES,
  AdminApiClient,
  DOCUMENT_TYPE_LABELS,
  type AdminBarberRegistration,
  type AllowedDocType,
} from '@/lib/api-client';
import { ApiError, getAdminErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
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

/** Supabase signed URLs keep the original object path (with its extension) before
 * the token query string, so the file type can be inferred from the URL itself
 * without the backend needing to return a separate content-type field. */
function isPdfUrl(url: string): boolean {
  return (url.split('?')[0] || '').toLowerCase().endsWith('.pdf');
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadgeClass(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-amber-100 text-amber-800';
  }
}

export default function BarberVerificationDetailPage() {
  const router = useRouter();
  const { admin } = useAdminAuth();
  const params = useParams();
  const barberId = params.barberId as string;
  const { showToast, toastElement } = useToast();

  const [registration, setRegistration] = useState<AdminBarberRegistration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [documents, setDocuments] = useState<DocumentPreview[]>([]);
  const [previewingDoc, setPreviewingDoc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewImgError, setPreviewImgError] = useState(false);

  useEffect(() => {
    async function load() {
      if (!admin) return;
      try {
        setError(null);
        const data = await AdminApiClient.getBarberRegistrationDetail(barberId);
        setRegistration(data);
        setDocuments(
          ALL_DOCUMENT_TYPES.map((type) => ({
            type,
            label: DOCUMENT_TYPE_LABELS[type],
            available: !!data.documentsAvailable?.[type],
          }))
        );
      } catch (err) {
        setError(getAdminErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [barberId, admin]);

  const handleApprove = async () => {
    if (!registration) return;
    setApproving(true);
    try {
      await AdminApiClient.approveBarber(barberId);
      showToast('Barber berhasil disetujui.');
      router.push('/barber-verification');
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!registration || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await AdminApiClient.rejectBarber(barberId, rejectReason.trim());
      showToast('Pendaftaran barber ditolak.');
      router.push('/barber-verification');
    } catch (err) {
      showToast(getAdminErrorMessage(err), 'error');
    } finally {
      setRejecting(false);
      setRejectModal(false);
    }
  };

  const loadDocumentPreview = async (docType: AllowedDocType) => {
    setPreviewingDoc(docType);
    setPreviewImgError(false);
    setDocuments((prev) => prev.map((d) => (d.type === docType ? { ...d, loading: true, error: undefined } : d)));
    try {
      const { url, expiresAt } = await AdminApiClient.getDocumentUrl(barberId, docType);
      setPreviewUrl(url);
      setDocuments((prev) =>
        prev.map((d) => (d.type === docType ? { ...d, url, expiresAt, loading: false, error: undefined } : d))
      );
    } catch (err) {
      const message = documentErrorMessage(err instanceof ApiError ? err.code : undefined);
      setDocuments((prev) => prev.map((d) => (d.type === docType ? { ...d, error: message, loading: false } : d)));
    }
  };

  const closeDocumentPreview = () => {
    setPreviewingDoc(null);
    setPreviewUrl(null);
    setPreviewImgError(false);
  };

  // Signed URLs are short-lived (see expiresAt) -- always request a fresh one on
  // retry rather than reusing/persisting the one that just expired or failed.
  const retryDocumentPreview = () => {
    if (previewingDoc) void loadDocumentPreview(previewingDoc as AllowedDocType);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6 h-8 w-64 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl bg-white shadow-sm" />
      </div>
    );
  }

  if (error || !registration) {
    return (
      <div className="p-8">
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">{error || 'Registrasi tidak ditemukan.'}</div>
        <Link href="/barber-verification" className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Kembali ke Verifikasi Barber
        </Link>
      </div>
    );
  }

  const isPending = registration.verificationStatus === 'pending';

  return (
    <div className="max-w-4xl p-8 pb-28">
      <Link href="/barber-verification" className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
        ← Verifikasi Barber
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
            {registration.businessName?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{registration.businessName}</h1>
            <p className="text-sm text-slate-500">Pemilik: {registration.ownerName}</p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(registration.verificationStatus)}`}>
          {registration.verificationStatus === 'pending' ? 'Menunggu' : registration.verificationStatus === 'approved' ? 'Disetujui' : 'Ditolak'}
        </span>
      </div>

      {/* A. Informasi Barber */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Informasi Barber</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Nama Pemilik</p>
            <p className="mt-0.5 text-slate-800">{registration.ownerName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Nama Bisnis</p>
            <p className="mt-0.5 text-slate-800">{registration.businessName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Email</p>
            <p className="mt-0.5 text-slate-800">{registration.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Nomor Telepon</p>
            <p className="mt-0.5 text-slate-800">{registration.phoneNumber || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Diajukan</p>
            <p className="mt-0.5 text-slate-800">{formatDateTime(registration.submittedAt)}</p>
          </div>
        </div>
      </div>

      {/* B. Lokasi */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Lokasi</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Alamat Bisnis</p>
            <p className="mt-0.5 text-slate-800">{registration.businessAddress || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Area Layanan</p>
            <p className="mt-0.5 text-slate-800">{registration.serviceArea || '-'}</p>
          </div>
        </div>
        <p className="mt-3 text-xs italic text-slate-400">
          Koordinat lokasi toko diatur oleh barber setelah akun disetujui, belum tersedia pada tahap pendaftaran ini.
        </p>
      </div>

      {/* C. Dokumen Verifikasi */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Dokumen Verifikasi</h2>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.type} className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{doc.label}</p>
                {doc.available ? (
                  <p className="text-xs text-green-600">✓ Tersedia</p>
                ) : (
                  <p className="text-xs text-slate-400">Tidak ada dokumen</p>
                )}
                {doc.error && <p className="text-xs text-red-600">{doc.error}</p>}
                {doc.expiresAt && (
                  <p className="text-xs text-slate-400">
                    Tautan berlaku hingga {new Date(doc.expiresAt).toLocaleTimeString('id-ID')}
                  </p>
                )}
              </div>
              {doc.available && (
                <button
                  onClick={() => loadDocumentPreview(doc.type)}
                  disabled={doc.loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {doc.loading ? 'Memuat...' : 'Lihat'}
                </button>
              )}
            </div>
          ))}
        </div>

        {previewingDoc && previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {documents.find((d) => d.type === previewingDoc)?.label}
                </h3>
                <button onClick={closeDocumentPreview} className="text-slate-400 hover:text-slate-700">
                  ✕
                </button>
              </div>

              {isPdfUrl(previewUrl) ? (
                <div className="flex flex-col items-center gap-3 rounded-lg bg-slate-50 p-8 text-center">
                  <p className="text-sm text-slate-600">Dokumen ini berformat PDF dan tidak dapat ditampilkan langsung di sini.</p>
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Buka PDF di tab baru
                  </a>
                </div>
              ) : previewImgError ? (
                <div className="flex flex-col items-center gap-3 rounded-lg bg-red-50 p-8 text-center">
                  <p className="text-sm text-red-800">
                    Tautan pratinjau tidak dapat dimuat (kemungkinan sudah kedaluwarsa).
                  </p>
                  <button
                    onClick={retryDocumentPreview}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    Muat Ulang
                  </button>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Pratinjau dokumen"
                  className="h-auto max-w-full rounded-lg"
                  onError={() => setPreviewImgError(true)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* D. Layanan */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Layanan</h2>
        {registration.services && registration.services.length > 0 ? (
          <div className="space-y-2">
            {registration.services.map((svc) => (
              <div key={svc.serviceId} className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{svc.name}</span>
                  {!svc.isActive && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">Nonaktif</span>
                  )}
                </div>
                <span className="font-semibold text-slate-700">Rp {svc.price.toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-slate-400">Belum ada layanan ditambahkan.</p>
        )}
      </div>

      {/* E. Gallery */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">
          Galeri {registration.galleryCount ? `(${registration.galleryCount})` : ''}
        </h2>
        {registration.galleryImageUrls && registration.galleryImageUrls.length > 0 ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {registration.galleryImageUrls.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`Galeri ${i + 1}`} className="h-20 w-full rounded-lg object-cover" />
            ))}
          </div>
        ) : (
          <p className="text-sm italic text-slate-400">Barber ini belum menambahkan foto galeri.</p>
        )}
      </div>

      {/* F. Verification History / Status */}
      <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-slate-900">Status Verifikasi</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-slate-500">Status</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(registration.verificationStatus)}`}>
              {registration.verificationStatus}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Ditinjau Pada</p>
            <p className="mt-0.5 text-slate-800">{formatDateTime(registration.reviewedAt)}</p>
          </div>
        </div>
        {registration.rejectionReason && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-900">Alasan Penolakan</p>
            <p className="mt-1 text-sm text-red-800">{registration.rejectionReason}</p>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      {isPending && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
          <div className="mx-auto flex max-w-4xl gap-3">
            <button
              onClick={handleApprove}
              disabled={approving}
              className="flex-1 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
            >
              {approving ? 'Memproses...' : 'Setujui Barber'}
            </button>
            <button
              onClick={() => setRejectModal(true)}
              disabled={approving}
              className="flex-1 rounded-lg border border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
            >
              Tolak Pendaftaran
            </button>
          </div>
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Tolak Pendaftaran</h3>
            <p className="mt-2 text-sm text-slate-600">
              Barber akan diberi tahu alasan penolakan ini. Tindakan tidak dapat dibatalkan.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              disabled={rejecting}
              placeholder="Masukkan alasan penolakan (wajib diisi)..."
              className="mt-4 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
            />
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setRejectModal(false);
                  setRejectReason('');
                }}
                disabled={rejecting}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rejecting ? 'Memproses...' : 'Tolak Pendaftaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastElement}
    </div>
  );
}
