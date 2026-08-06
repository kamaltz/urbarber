import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../src/config/index.js';
import { handleCors } from '../../src/lib/cors.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;

  const result = (req.query.result as string) || 'finish';
  const orderId = (req.query.order_id as string) || '';

  const deepLink = `${config.appDeepLinkScheme}://booking/history?orderId=${encodeURIComponent(orderId)}`;

  let title = 'Memverifikasi Pembayaran...';
  let message = 'Proses verifikasi pembayaran sedang berlangsung secara otomatis oleh sistem URBarber.';
  let icon = '⏳';
  let iconBg = '#FEF3C7';

  if (result === 'unfinish') {
    title = 'Pembayaran Belum Selesai';
    message = 'Anda belum menyelesaikan pembayaran. Silakan lanjutkan transaksi di aplikasi.';
    icon = '⚠️';
    iconBg = '#FFEDD5';
  } else if (result === 'error') {
    title = 'Pembayaran Gagal';
    message = 'Terjadi kendala saat memproses transaksi pembayaran.';
    icon = '❌';
    iconBg = '#FEE2E2';
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - URBarber</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #F8FAFC;
      color: #0F172A;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #FFFFFF;
      border-radius: 20px;
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      text-align: center;
    }
    .icon-box {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background-color: ${iconBg};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin: 0 auto 20px auto;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }
    p {
      font-size: 14px;
      color: #64748B;
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .btn {
      display: inline-block;
      width: 100%;
      padding: 14px 0;
      background-color: #D2691E;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 14px;
      text-decoration: none;
      border-radius: 12px;
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${deepLink}" class="btn">Kembali ke Aplikasi URBarber</a>
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
}
