import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../config/index.js';

export function handleCors(
  req: VercelRequest,
  res: VercelResponse,
  allowedMethods: string[] = ['POST', 'OPTIONS']
): boolean {
  const origin = req.headers.origin;

  if (origin) {
    if (config.allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.status(403).json({ error: { code: 'CORS_FORBIDDEN', message: 'Origin tidak diizinkan.' } });
      return false;
    }
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type, X-Requested-With, Accept, Origin'
  );
  res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }

  if (req.method && !allowedMethods.includes(req.method)) {
    res.status(405).json({
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Metode ${req.method} tidak didukung pada endpoint ini.`,
      },
    });
    return false;
  }

  return true;
}
