import { z } from 'zod';

const envSchema = z.object({
  MIDTRANS_SERVER_KEY: z.string({
    required_error: 'MIDTRANS_SERVER_KEY wajib diisi.',
  }).min(1, 'MIDTRANS_SERVER_KEY tidak boleh kosong.'),
  MIDTRANS_IS_PRODUCTION: z.string().optional().transform((val) => val === 'true'),
  FIREBASE_PROJECT_ID: z.string({
    required_error: 'FIREBASE_PROJECT_ID wajib diisi.',
  }).min(1, 'FIREBASE_PROJECT_ID tidak boleh kosong.'),
  FIREBASE_CLIENT_EMAIL: z.string({
    required_error: 'FIREBASE_CLIENT_EMAIL wajib diisi.',
  }).min(1, 'FIREBASE_CLIENT_EMAIL tidak boleh kosong.'),
  FIREBASE_PRIVATE_KEY: z.string({
    required_error: 'FIREBASE_PRIVATE_KEY wajib diisi.',
  }).min(1, 'FIREBASE_PRIVATE_KEY tidak boleh kosong.'),
  ALLOWED_ORIGINS: z.string().optional().default('http://localhost:8081,http://localhost:19006'),
  APP_DEEP_LINK_SCHEME: z.string().optional().default('urbarber'),
  PAYMENT_RETURN_BASE_URL: z.string().optional().default('https://urbarber.vercel.app'),
  // Supabase service-role key (server-only, NEVER exposed to clients)
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_PRIVATE_BUCKET: z.string().optional().default('private-documents'),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const missingKeys = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Konfigurasi server tidak valid. Variabel hilang: ${missingKeys}`);
  }

  const rawKey = result.data.FIREBASE_PRIVATE_KEY;
  // Safely normalize escaped newline characters
  const normalizedPrivateKey = rawKey.replace(/\\n/g, '\n');

  return {
    midtransServerKey: result.data.MIDTRANS_SERVER_KEY,
    midtransIsProduction: result.data.MIDTRANS_IS_PRODUCTION,
    firebaseProjectId: result.data.FIREBASE_PROJECT_ID,
    firebaseClientEmail: result.data.FIREBASE_CLIENT_EMAIL,
    firebasePrivateKey: normalizedPrivateKey,
    allowedOrigins: result.data.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean),
    appDeepLinkScheme: result.data.APP_DEEP_LINK_SCHEME,
    paymentReturnBaseUrl: result.data.PAYMENT_RETURN_BASE_URL,
    supabaseUrl: result.data.SUPABASE_URL,
    supabaseServiceRoleKey: result.data.SUPABASE_SERVICE_ROLE_KEY,
    supabasePrivateBucket: result.data.SUPABASE_PRIVATE_BUCKET,
  };
}

export const config = loadConfig();
