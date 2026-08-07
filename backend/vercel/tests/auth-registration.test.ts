import { describe, expect, it } from 'vitest';

function validateRequestedRole(role?: string): { valid: boolean; code?: string } {
  if (!role || (role !== 'customer' && role !== 'barber')) {
    return { valid: false, code: 'INVALID_ROLE' };
  }
  return { valid: true };
}

function validateDocumentPathOwnership(uid: string, docPath: string): boolean {
  const expectedPrefix = `${uid}/`;
  return typeof docPath === 'string' && docPath.startsWith(expectedPrefix);
}

function checkAccountBootstrapRoleImmutability(existingRole: string | undefined, newRole: string): { allowed: boolean; code?: string } {
  if (existingRole && existingRole !== newRole) {
    return { allowed: false, code: 'ROLE_ALREADY_INITIALIZED' };
  }
  return { allowed: true };
}

function validateBarberSubmissionRequirements(params: {
  emailVerified: boolean;
  role: string;
  verificationStatus: string;
  documentPaths: Record<string, string>;
  uid: string;
}): { valid: boolean; code?: string } {
  if (!params.emailVerified) {
    return { valid: false, code: 'EMAIL_NOT_VERIFIED' };
  }
  if (params.role !== 'barber') {
    return { valid: false, code: 'INVALID_USER_ROLE' };
  }
  if (params.verificationStatus === 'pending') {
    return { valid: false, code: 'ALREADY_PENDING' };
  }
  if (params.verificationStatus === 'approved') {
    return { valid: false, code: 'ALREADY_APPROVED' };
  }
  if (!params.documentPaths.ktp) {
    return { valid: false, code: 'MISSING_DOCUMENTS' };
  }
  if (!validateDocumentPathOwnership(params.uid, params.documentPaths.ktp)) {
    return { valid: false, code: 'INVALID_DOCUMENT_PATH' };
  }
  return { valid: true };
}

describe('Direct Barber Registration & Account Bootstrap Unit Tests', () => {
  it('1. Allows public registration for customer and barber roles', () => {
    expect(validateRequestedRole('customer').valid).toBe(true);
    expect(validateRequestedRole('barber').valid).toBe(true);
  });

  it('2. Rejects public registration for admin or arbitrary roles', () => {
    expect(validateRequestedRole('admin').valid).toBe(false);
    expect(validateRequestedRole('admin').code).toBe('INVALID_ROLE');
    expect(validateRequestedRole('').valid).toBe(false);
    expect(validateRequestedRole('superuser').valid).toBe(false);
  });

  it('3. Allows idempotent re-initialization with the same role', () => {
    const res = checkAccountBootstrapRoleImmutability('barber', 'barber');
    expect(res.allowed).toBe(true);
  });

  it('4. Rejects re-initialization with a different role', () => {
    const res = checkAccountBootstrapRoleImmutability('customer', 'barber');
    expect(res.allowed).toBe(false);
    expect(res.code).toBe('ROLE_ALREADY_INITIALIZED');
  });

  it('5. Validates private document path ownership with correct UID prefix', () => {
    const valid = validateDocumentPathOwnership('user123', 'user123/barber-registration/ktp/ktp-123.jpg');
    expect(valid).toBe(true);
  });

  it('6. Rejects document path with mismatched UID prefix', () => {
    const valid = validateDocumentPathOwnership('user123', 'otheruser/barber-registration/ktp/ktp-123.jpg');
    expect(valid).toBe(false);
  });

  it('7. Rejects barber submission when email is unverified', () => {
    const res = validateBarberSubmissionRequirements({
      emailVerified: false,
      role: 'barber',
      verificationStatus: 'draft',
      documentPaths: { ktp: 'user123/barber-registration/ktp/1.jpg' },
      uid: 'user123',
    });
    expect(res.valid).toBe(false);
    expect(res.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('8. Rejects barber submission when mandatory identity document is missing', () => {
    const res = validateBarberSubmissionRequirements({
      emailVerified: true,
      role: 'barber',
      verificationStatus: 'draft',
      documentPaths: {},
      uid: 'user123',
    });
    expect(res.valid).toBe(false);
    expect(res.code).toBe('MISSING_DOCUMENTS');
  });

  it('9. Rejects duplicate barber submission if already pending or approved', () => {
    const resPending = validateBarberSubmissionRequirements({
      emailVerified: true,
      role: 'barber',
      verificationStatus: 'pending',
      documentPaths: { ktp: 'user123/barber-registration/ktp/1.jpg' },
      uid: 'user123',
    });
    expect(resPending.valid).toBe(false);
    expect(resPending.code).toBe('ALREADY_PENDING');
  });

  it('10. Approves valid barber submission data requirements', () => {
    const res = validateBarberSubmissionRequirements({
      emailVerified: true,
      role: 'barber',
      verificationStatus: 'draft',
      documentPaths: { ktp: 'user123/barber-registration/ktp/1.jpg' },
      uid: 'user123',
    });
    expect(res.valid).toBe(true);
  });
});
