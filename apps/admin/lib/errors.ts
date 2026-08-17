export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function getErrorMessage(err: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

export function getErrorCode(err: unknown): string | undefined {
  return err instanceof ApiError ? err.code : undefined;
}

/**
 * Operator-facing message for an admin mutation's failure. Prefers the
 * backend's own message (every admin route already returns a specific
 * Indonesian message per error branch) and only falls back to a generic,
 * status-code-appropriate message if the backend didn't supply one -- never
 * a raw stack trace, never a silent failure.
 */
export function getAdminErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.message && err.message.trim()) return err.message;
    switch (err.status) {
      case 401:
        return 'Sesi Admin telah berakhir. Silakan login kembali.';
      case 403:
        return 'Sesi Admin tidak memiliki izin untuk tindakan ini.';
      case 404:
        return 'Data tidak ditemukan.';
      case 409:
        return 'Terjadi konflik data. Silakan muat ulang halaman.';
      case 500:
        return 'Gagal memproses permintaan.';
      default:
        return 'Terjadi kesalahan.';
    }
  }
  return getErrorMessage(err, 'Gagal memproses permintaan.');
}
