import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleCors } from '../src/lib/cors.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;

  res.status(200).json({
    status: 'ok',
    ok: true,
    service: 'urbarber-api',
    timestamp: new Date().toISOString(),
  });
}
