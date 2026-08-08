import type { VercelRequest, VercelResponse } from '@vercel/node';
import { config } from '../../src/config/index.js';
import { handleCors } from '../../src/lib/cors.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (!handleCors(req, res, ['GET', 'OPTIONS'])) return;

  const transactionStatus = (req.query.transaction_status as string) || (req.query.result as string) || 'finish';
  const orderId = (req.query.order_id as string) || '';

  const deepLink = `${config.appDeepLinkScheme || 'urbarber'}://booking/history?orderId=${encodeURIComponent(orderId)}`;

  let title = 'Pembayaran Berhasil! 🎉';
  let message = 'Terima kasih, pembayaran Anda telah diterima dan diverifikasi oleh sistem URBarber.';
  let icon = '✅';
  let iconBg = 'rgba(16, 185, 129, 0.15)';
  let iconColor = '#10B981';

  if (transactionStatus === 'unfinish' || transactionStatus === 'pending') {
    title = 'Menunggu Pembayaran ⏳';
    message = 'Transaksi Anda telah dicatat. Silakan selesaikan pembayaran sesuai instruksi.';
    icon = '⏳';
    iconBg = 'rgba(245, 158, 11, 0.15)';
    iconColor = '#F59E0B';
  } else if (transactionStatus === 'error' || transactionStatus === 'deny' || transactionStatus === 'cancel' || transactionStatus === 'expire') {
    title = 'Pembayaran Belum Berhasil ⚠️';
    message = 'Transaksi pembayaran tidak dapat diselesaikan atau telah dibatalkan.';
    icon = '⚠️';
    iconBg = 'rgba(239, 68, 68, 0.15)';
    iconColor = '#EF4444';
  }

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="2;url=${deepLink}">
  <title>${title} — URBarber Payment Gateway</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #D2691E;
      --bg: #0F172A;
      --card-bg: rgba(30, 41, 59, 0.75);
      --text: #F8FAFC;
      --text-muted: #94A3B8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at top right, #1e1b4b, #0f172a, #020617);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: var(--card-bg);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 40px 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .icon-box {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: ${iconBg};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36px;
      margin: 0 auto 24px auto;
      border: 1px solid ${iconColor};
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.3px;
    }
    p {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .order-id {
      display: inline-block;
      background: rgba(15, 23, 42, 0.6);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      padding: 8px 16px;
      border-radius: 10px;
      font-family: monospace;
      font-size: 12px;
      color: #CBD5E1;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 16px 0;
      background: linear-gradient(135deg, #D2691E, #A0522D);
      color: #FFFFFF;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      border-radius: 14px;
      box-shadow: 0 8px 20px rgba(210, 105, 30, 0.3);
      transition: all 0.2s ease;
    }
    .btn:hover {
      transform: translateY(-2px);
    }
    .redirect-note {
      margin-top: 20px;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon-box">${icon}</div>
    <h1>${title}</h1>
    ${orderId ? `<div class="order-id">Order ID: ${orderId}</div>` : ''}
    <p>${message}</p>
    <a href="${deepLink}" class="btn">Kembali ke Aplikasi URBarber</a>
    <div class="redirect-note">Mengalihkan secara otomatis ke aplikasi dalam 2 detik...</div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${deepLink}";
    }, 1500);
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.status(200).send(html);
}
