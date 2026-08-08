import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=1, stale-while-revalidate');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>URBarber — Server & Gateway Layanan Pembayaran</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #D2691E;
      --primary-dark: #A0522D;
      --bg: #0F172A;
      --card-bg: #1E293B;
      --text: #F8FAFC;
      --text-muted: #94A3B8;
      --emerald: #10B981;
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
    .container {
      max-width: 480px;
      width: 100%;
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 24px;
      padding: 40px 28px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 72px;
      height: 72px;
      border-radius: 20px;
      background: linear-gradient(135deg, #D2691E, #8B4513);
      box-shadow: 0 10px 20px rgba(210, 105, 30, 0.3);
      margin-bottom: 24px;
      font-size: 36px;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
      background: linear-gradient(to right, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .status-card {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
    }
    .status-info {
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background-color: var(--emerald);
      box-shadow: 0 0 10px var(--emerald);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
      100% { opacity: 1; transform: scale(1); }
    }
    .status-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
    }
    .status-sub {
      font-size: 11px;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .btn-primary {
      display: block;
      width: 100%;
      padding: 16px 0;
      background: linear-gradient(135deg, #D2691E, #A0522D);
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      text-decoration: none;
      border-radius: 14px;
      box-shadow: 0 8px 20px rgba(210, 105, 30, 0.25);
      transition: all 0.2s ease;
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 24px rgba(210, 105, 30, 0.35);
    }
    .footer-note {
      margin-top: 32px;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-badge">✂️</div>
    <h1>URBarber Server</h1>
    <p class="subtitle">Platform Layanan backend & Gerbang Pembayaran Resmi URBarber dengan Intergrasi Midtrans & Firebase Authentication.</p>

    <div class="status-card">
      <div class="status-info">
        <div class="status-dot"></div>
        <div>
          <div class="status-text">Sistem Beroperasi Normal</div>
          <div class="status-sub">Midtrans Payment Gateway Ready</div>
        </div>
      </div>
    </div>

    <div class="actions">
      <a href="urbarber://booking/history" class="btn-primary">Buka Aplikasi URBarber</a>
    </div>

    <div class="footer-note">
      &copy; 2026 URBarber Platform. Seluruh Hak Cipta Dilindungi.
    </div>
  </div>
</body>
</html>`;

  return res.status(200).send(html);
}
