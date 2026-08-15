/**
 * P0-4 remediation tests (FINAL_THESIS_READINESS_AUDIT.md HIGH finding):
 * submitRegistration() previously fell back to a direct client-side Firestore write
 * on ANY server error or network failure, and that fallback returned success:true
 * even when its own write threw (firestore.rules denies a client write to
 * verificationStatus) -- silently telling the barber "submitted" when nothing was
 * queued. This must never happen again: every non-OK response and every
 * network/timeout failure must surface success:false with a real message, and no
 * path may attempt a direct Firestore write of verificationStatus/onboardingStatus.
 * Mirrors the mocking convention in account-bootstrap.service.test.ts.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// barber-registration.service.ts imports firebase/firestore directly (unlike
// account-bootstrap.service.ts), so its mock factory genuinely executes as part of
// hoisted import resolution -- vi.hoisted() is required here so setDocSpy is
// initialized before that factory runs (a bare top-level const would TDZ-crash).
const { setDocSpy } = vi.hoisted(() => ({ setDocSpy: vi.fn() }));

vi.mock('firebase/firestore', () => ({
  setDoc: setDocSpy,
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

const mockCurrentUser = {
  uid: 'test-barber-uid',
  email: 'barber@example.com',
  getIdToken: vi.fn().mockResolvedValue('fake-id-token'),
};

vi.mock('@/lib/firebase', () => ({
  firebaseAuth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
  firestore: {},
}));

vi.mock('@/features/services/storage.service', () => ({
  storageService: { uploadPrivateFile: vi.fn() },
}));

import { barberRegistrationService } from '../barber-registration.service';

describe('BarberRegistrationService.submitRegistration (P0-4)', () => {
  beforeEach(() => {
    setDocSpy.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('backend success -> success:true, no direct Firestore write', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Pendaftaran barber berhasil disubmit',
        registration: { uid: 'test-barber-uid', verificationStatus: 'pending', submittedAt: '2026-08-13T00:00:00.000Z' },
      }),
    });

    const result = await barberRegistrationService.submitRegistration();

    expect(result.success).toBe(true);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('network failure -> success:false with a real message, no direct Firestore write', async () => {
    (fetch as any).mockRejectedValue(new Error('Network request failed'));

    const result = await barberRegistrationService.submitRegistration();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('server 4xx (e.g. DOCUMENTS_INCOMPLETE) -> success:false with the server message, no direct Firestore write', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { code: 'DOCUMENTS_INCOMPLETE', message: 'Dokumen KTP verifikasi wajib diunggah sebelum submit.' } }),
    });

    const result = await barberRegistrationService.submitRegistration();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Dokumen KTP verifikasi wajib diunggah sebelum submit.');
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('server 5xx -> success:false, no direct Firestore write', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Terjadi kesalahan internal.' } }),
    });

    const result = await barberRegistrationService.submitRegistration();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('timeout/AbortError -> success:false with a timeout-specific message, no direct Firestore write', async () => {
    (fetch as any).mockRejectedValue(new DOMException('The operation was aborted', 'AbortError'));

    const result = await barberRegistrationService.submitRegistration();

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/waktu habis/i);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('duplicate retry (ALREADY_REGISTERED 409) is deterministic and never falls back to a Firestore write', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'ALREADY_REGISTERED', message: 'Pendaftaran barber sudah dalam proses atau sudah disetujui.' } }),
    });

    const first = await barberRegistrationService.submitRegistration();
    const second = await barberRegistrationService.submitRegistration();

    expect(first).toEqual(second);
    expect(first.success).toBe(false);
    expect(setDocSpy).not.toHaveBeenCalled();
  });

  it('a retry after a network failure calls the same trusted endpoint again and can succeed, with no Firestore write at any point', async () => {
    (fetch as any)
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          registration: { uid: 'test-barber-uid', verificationStatus: 'pending', submittedAt: '2026-08-13T00:00:00.000Z' },
        }),
      });

    const first = await barberRegistrationService.submitRegistration();
    expect(first.success).toBe(false);

    const second = await barberRegistrationService.submitRegistration();
    expect(second.success).toBe(true);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(setDocSpy).not.toHaveBeenCalled();
  });
});
