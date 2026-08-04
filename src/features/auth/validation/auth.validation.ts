/**
 * Auth Form Validation
 */

export interface ValidationError {
  field: string;
  message: string;
}

export function validateEmail(email: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({ field: 'email', message: 'Email harus diisi' });
    return errors;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push({ field: 'email', message: 'Format email tidak valid' });
  }

  return errors;
}

export function validatePassword(password: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!password) {
    errors.push({ field: 'password', message: 'Password harus diisi' });
    return errors;
  }

  if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password minimal 6 karakter' });
  }

  return errors;
}

export function validatePasswordMatch(password: string, confirmPassword: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (password !== confirmPassword) {
    errors.push({ field: 'confirmPassword', message: 'Password tidak cocok' });
  }

  return errors;
}

export function validateLoginForm(email: string): ValidationError[] {
  return validateEmail(email);
}

export function validateRegisterForm(
  fullName: string,
  email: string,
  phoneNumber: string,
  password: string,
  confirmPassword: string,
  acceptedTerms: boolean,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!fullName) {
    errors.push({ field: 'fullName', message: 'Nama lengkap harus diisi' });
  }

  errors.push(...validateEmail(email));

  if (!phoneNumber) {
    errors.push({ field: 'phoneNumber', message: 'Nomor telepon harus diisi' });
  }

  errors.push(...validatePassword(password));
  errors.push(...validatePasswordMatch(password, confirmPassword));

  if (!acceptedTerms) {
    errors.push({ field: 'acceptedTerms', message: 'Harus menerima syarat dan ketentuan' });
  }

  return errors;
}

export function validateForgotPasswordForm(email: string): ValidationError[] {
  return validateEmail(email);
}
