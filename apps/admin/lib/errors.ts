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
