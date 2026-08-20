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

/**
 * Firebase Auth REST/SDK error codes -> operator-facing Indonesian message.
 * A raw `FirebaseError.message` looks like
 * "Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)."
 * -- never fit for an end-user login screen. Every code below is mapped
 * explicitly; anything not listed (including any future/unknown code) falls
 * through to a single generic message so the raw SDK string can never leak,
 * regardless of which specific error Firebase returns.
 */
const FIREBASE_AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'Akun tidak ditemukan.',
  'auth/wrong-password': 'Email atau password salah.',
  // Newer Firebase/Identity Platform projects return this single generic
  // code for both "email not found" and "wrong password" (to avoid leaking
  // which one it was) instead of the two codes above.
  'auth/invalid-credential': 'Email atau password salah.',
  'auth/invalid-login-credentials': 'Email atau password salah.',
  'auth/user-disabled': 'Akun telah dinonaktifkan.',
  'auth/invalid-email': 'Format email tidak valid.',
  'auth/too-many-requests': 'Terlalu banyak percobaan login. Silakan coba lagi beberapa saat lagi.',
  'auth/network-request-failed': 'Gagal terhubung ke server. Periksa koneksi internet Anda.',
  // Project/API-key/provider configuration problems -- not a user credential
  // mistake, so word it accordingly rather than "email atau password salah".
  'auth/invalid-api-key': 'Konfigurasi login admin bermasalah. Hubungi administrator sistem.',
  'auth/api-key-not-valid': 'Konfigurasi login admin bermasalah. Hubungi administrator sistem.',
  'auth/operation-not-allowed': 'Metode login ini belum diaktifkan untuk akun admin. Hubungi administrator sistem.',
  'auth/project-not-found': 'Konfigurasi proyek admin bermasalah. Hubungi administrator sistem.',
};

export function getFirebaseAuthErrorMessage(err: unknown, fallback = 'Login gagal. Coba lagi.'): string {
  const code = (err as { code?: string } | null)?.code;
  if (typeof code === 'string') {
    // auth/api-key-not-valid.-please-pass-a-valid-api-key. carries extra
    // punctuation after the core code -- match by prefix.
    const normalized = code.replace(/\.+$/, '');
    for (const [knownCode, message] of Object.entries(FIREBASE_AUTH_ERROR_MESSAGES)) {
      if (normalized === knownCode || normalized.startsWith(`${knownCode}.`) || normalized.startsWith(`${knownCode}-`)) {
        return message;
      }
    }
  }
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
