/**
 * Firestore Admin Seed Script for Barber Operations (Batch 05)
 * Seeds exact test dataset required:
 * - 1 Barber account approved and active (barber_active)
 * - 1 Barber account pending (barber_pending)
 * - 1 Barber account suspended (barber_suspended)
 * - 1 Customer account active (customer_active)
 * - 3 Active services + 1 inactive service
 * - Operating schedule (6 open days + 1 unavailable date)
 * - 6 Bookings: 1 unpaid, 1 paid & pending, 1 accepted, 1 in_progress, 1 completed, 1 cancelled
 * - 2 Customer reviews
 *
 * Usage:
 *   Emulator:     firebase emulators:exec --only firestore "node ./scripts/seed-barber-operations.js"
 *   Live Project: node ./scripts/seed-barber-operations.js --live
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    }
  });
}

loadEnvFile(path.join(__dirname, '..', '.env.local'));
loadEnvFile(path.join(__dirname, '..', '.env'));
loadEnvFile(path.join(__dirname, '..', 'backend', 'vercel', '.env.local'));

const isLive = process.env.USE_LIVE_PROJECT === 'true' || process.argv.includes('--live');

let db;
let serverTimestamp;

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'urbarber-f97ae';
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

const isPlaceholderEmail = Boolean(clientEmail && (clientEmail.includes('xxx') || clientEmail.includes('example')));

if (!isLive) {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
  console.log(`[SEED] Mode: Firestore Emulator (${emulatorHost})`);
} else {
  console.log(`[SEED] Mode: Live Firebase Project (${projectId}) via Admin SDK`);
}

if (getApps().length === 0) {
  if (isLive) {
    if (serviceAccountPath && fs.existsSync(path.resolve(serviceAccountPath))) {
      const serviceAccount = require(path.resolve(serviceAccountPath));
      initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });
    } else if (clientEmail && privateKey && !isPlaceholderEmail) {
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      });
    } else {
      console.error('\n[SEED ERROR] Kredensial Firebase Admin Live Belum Valid!');
      if (isPlaceholderEmail) {
        console.error('⚠️ FIREBASE_CLIENT_EMAIL di .env.local masih berupa placeholder (firebase-adminsdk-xxx@...).');
      }
      console.error('\nUntuk mengisi data (seed) ke proyek LIVE Firebase (urbarber-f97ae):');
      console.error('  1) Unduh Service Account JSON dari Firebase Console:');
      console.error('     https://console.firebase.google.com/project/urbarber-f97ae/settings/serviceaccounts/adminsdk');
      console.error('  2) Simpan file (misal ./service-account.json) dan tambahkan baris berikut di .env.local:');
      console.error('     GOOGLE_APPLICATION_CREDENTIALS=./service-account.json');
      console.error('  3) Atau isi FIREBASE_CLIENT_EMAIL & FIREBASE_PRIVATE_KEY asli dari file JSON tersebut ke .env.local.\n');
      console.error('💡 Untuk pengujian lokal gratis tanpa perlunya kredensial live, gunakan Firestore Emulator:');
      console.error('   firebase emulators:exec --only firestore "npm run seed:barber"\n');
      process.exit(1);
    }
  } else {
    initializeApp({ projectId });
  }
}

const adminDb = getFirestore();

db = {
  setDoc: (coll, id, data) => adminDb.collection(coll).doc(id).set(data, { merge: true }),
};
serverTimestamp = () => FieldValue.serverTimestamp();

async function seedData() {
  console.log('\n--- Starting Barber Operations Data Seeding ---\n');

  // 1. Barber Accounts (1 Approved Active, 1 Pending, 1 Suspended)
  console.log('1. Seeding 3 Barber Accounts (Approved Active, Pending, Suspended)...');
  await db.setDoc('users', 'barber_active', {
    uid: 'barber_active',
    email: 'barber.active@urbarber.test',
    name: 'Master Barber Active',
    role: 'barber',
    status: 'active',
    createdAt: serverTimestamp(),
  });
  await db.setDoc('barbers', 'barber_active', {
    barberId: 'barber_active',
    name: 'Master Barber Active',
    shopName: 'Barbershop Utama',
    shopDescription: 'Barbershop profesional dengan layanan potong rambut & grooming terbaik.',
    shopAddress: 'Jl. Sudirman No. 10, Jakarta Pusat',
    email: 'barber.active@urbarber.test',
    phone: '081234567890',
    verified: true,
    verificationStatus: 'approved',
    status: 'active',
    ratingAverage: 5.0,
    reviewCount: 2,
    createdAt: serverTimestamp(),
  });

  await db.setDoc('users', 'barber_pending', {
    uid: 'barber_pending',
    email: 'barber.pending@urbarber.test',
    name: 'Barber Pemula Pending',
    role: 'barber',
    status: 'pending_verification',
    createdAt: serverTimestamp(),
  });
  await db.setDoc('barbers', 'barber_pending', {
    barberId: 'barber_pending',
    name: 'Barber Pemula Pending',
    shopName: 'Barbershop Baru',
    verified: false,
    verificationStatus: 'pending',
    status: 'active',
    createdAt: serverTimestamp(),
  });

  await db.setDoc('users', 'barber_suspended', {
    uid: 'barber_suspended',
    email: 'barber.suspended@urbarber.test',
    name: 'Barber Nonaktif Suspended',
    role: 'barber',
    status: 'suspended',
    createdAt: serverTimestamp(),
  });
  await db.setDoc('barbers', 'barber_suspended', {
    barberId: 'barber_suspended',
    name: 'Barber Nonaktif Suspended',
    shopName: 'Barbershop Suspended',
    verified: true,
    verificationStatus: 'approved',
    status: 'suspended',
    createdAt: serverTimestamp(),
  });

  // 2. Customer Account (1 Active)
  console.log('2. Seeding 1 Active Customer Account...');
  await db.setDoc('users', 'customer_active', {
    uid: 'customer_active',
    email: 'customer@urbarber.test',
    name: 'Budi Pelanggan',
    role: 'customer',
    status: 'active',
    createdAt: serverTimestamp(),
  });
  await db.setDoc('customers', 'customer_active', {
    customerId: 'customer_active',
    name: 'Budi Pelanggan',
    email: 'customer@urbarber.test',
    createdAt: serverTimestamp(),
  });

  // 3. Barber Services (3 Active + 1 Inactive)
  console.log('3. Seeding 3 Active Services + 1 Inactive Service...');
  await db.setDoc('barberServices', 'svc_active_1', {
    serviceId: 'svc_active_1',
    barberId: 'barber_active',
    name: 'Gentleman Haircut',
    description: 'Potong rambut gaya gentleman, cuci rambut, & hair tonic.',
    price: 60000,
    durationMinutes: 30,
    active: true,
    createdAt: serverTimestamp(),
  });
  await db.setDoc('barberServices', 'svc_active_2', {
    serviceId: 'svc_active_2',
    barberId: 'barber_active',
    name: 'Beard Trim & Style',
    description: 'Cukur kumis & jenggot presisi dengan handuk hangat.',
    price: 40000,
    durationMinutes: 20,
    active: true,
    createdAt: serverTimestamp(),
  });
  await db.setDoc('barberServices', 'svc_active_3', {
    serviceId: 'svc_active_3',
    barberId: 'barber_active',
    name: 'Hair Spa & Massage',
    description: 'Perawatan rambut mendalam dan pijat relaksasi kepala.',
    price: 75000,
    durationMinutes: 45,
    active: true,
    createdAt: serverTimestamp(),
  });
  await db.setDoc('barberServices', 'svc_inactive_1', {
    serviceId: 'svc_inactive_1',
    barberId: 'barber_active',
    name: 'Hair Coloring Promo (Nonaktif)',
    description: 'Layanan pewarnaan rambut paket promo lama.',
    price: 120000,
    durationMinutes: 60,
    active: false,
    createdAt: serverTimestamp(),
  });

  // 4. Operating Schedule (6 Open Days + 1 Unavailable Date)
  console.log('4. Seeding Barber Operating Schedule (6 Open Days, 1 Unavailable Date)...');
  await db.setDoc('barberSchedules', 'barber_active', {
    barberId: 'barber_active',
    schedule: [
      { dayOfWeek: 'Monday', isOpen: true, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 'Tuesday', isOpen: true, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 'Wednesday', isOpen: true, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 'Thursday', isOpen: true, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 'Friday', isOpen: true, startTime: '09:00', endTime: '20:00' },
      { dayOfWeek: 'Saturday', isOpen: true, startTime: '09:00', endTime: '18:00' },
      { dayOfWeek: 'Sunday', isOpen: false },
    ],
    unavailableDates: ['2026-08-17'],
    lastUpdated: serverTimestamp(),
  });

  // 5. Bookings (1 Unpaid, 1 Paid Pending, 1 Accepted, 1 In-Progress, 1 Completed, 1 Cancelled)
  console.log('5. Seeding 6 Bookings (Unpaid, Paid Pending, Accepted, In-Progress, Completed, Cancelled)...');
  await db.setDoc('bookings', 'book_unpaid', {
    bookingId: 'book_unpaid',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    bookingDate: '2026-08-10',
    bookingTime: '10:00',
    status: 'pending',
    paymentStatus: 'pending',
    totalAmount: 60000,
    totalPrice: 60000,
    notes: 'Catatan: Mohon tiba tepat waktu',
    services: [{ name: 'Gentleman Haircut', price: 60000 }],
    createdAt: serverTimestamp(),
  });

  await db.setDoc('bookings', 'book_paid_pending', {
    bookingId: 'book_paid_pending',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    bookingDate: '2026-08-10',
    bookingTime: '11:00',
    status: 'pending',
    paymentStatus: 'paid',
    totalAmount: 60000,
    totalPrice: 60000,
    notes: 'Pembayaran sudah lunas via Midtrans',
    services: [{ name: 'Gentleman Haircut', price: 60000 }],
    createdAt: serverTimestamp(),
  });
  await db.setDoc('payments', 'book_paid_pending', {
    bookingId: 'book_paid_pending',
    customerId: 'customer_active',
    barberId: 'barber_active',
    status: 'paid',
    orderId: 'URB-book_paid_pending',
    grossAmount: 60000,
    createdAt: serverTimestamp(),
  });

  await db.setDoc('bookings', 'book_accepted', {
    bookingId: 'book_accepted',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    bookingDate: '2026-08-10',
    bookingTime: '13:00',
    status: 'accepted',
    paymentStatus: 'paid',
    totalAmount: 40000,
    totalPrice: 40000,
    services: [{ name: 'Beard Trim & Style', price: 40000 }],
    createdAt: serverTimestamp(),
  });
  await db.setDoc('payments', 'book_accepted', {
    bookingId: 'book_accepted',
    customerId: 'customer_active',
    barberId: 'barber_active',
    status: 'paid',
    orderId: 'URB-book_accepted',
    grossAmount: 40000,
    createdAt: serverTimestamp(),
  });

  await db.setDoc('bookings', 'book_in_progress', {
    bookingId: 'book_in_progress',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    bookingDate: '2026-08-10',
    bookingTime: '14:00',
    status: 'in_progress',
    paymentStatus: 'paid',
    totalAmount: 75000,
    totalPrice: 75000,
    services: [{ name: 'Hair Spa & Massage', price: 75000 }],
    createdAt: serverTimestamp(),
  });
  await db.setDoc('payments', 'book_in_progress', {
    bookingId: 'book_in_progress',
    customerId: 'customer_active',
    barberId: 'barber_active',
    status: 'paid',
    orderId: 'URB-book_in_progress',
    grossAmount: 75000,
    createdAt: serverTimestamp(),
  });

  await db.setDoc('bookings', 'book_completed', {
    bookingId: 'book_completed',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    bookingDate: '2026-08-01',
    bookingTime: '15:00',
    status: 'completed',
    paymentStatus: 'paid',
    totalAmount: 60000,
    totalPrice: 60000,
    services: [{ name: 'Gentleman Haircut', price: 60000 }],
    createdAt: serverTimestamp(),
  });
  await db.setDoc('payments', 'book_completed', {
    bookingId: 'book_completed',
    customerId: 'customer_active',
    barberId: 'barber_active',
    status: 'paid',
    orderId: 'URB-book_completed',
    grossAmount: 60000,
    createdAt: serverTimestamp(),
  });

  await db.setDoc('bookings', 'book_cancelled', {
    bookingId: 'book_cancelled',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    bookingDate: '2026-08-05',
    bookingTime: '16:00',
    status: 'cancelled',
    paymentStatus: 'failed',
    totalAmount: 60000,
    totalPrice: 60000,
    services: [{ name: 'Gentleman Haircut', price: 60000 }],
    createdAt: serverTimestamp(),
  });

  // 6. Customer Reviews (2 Reviews)
  console.log('6. Seeding 2 Customer Reviews...');
  await db.setDoc('reviews', 'rev_1', {
    reviewId: 'rev_1',
    bookingId: 'book_completed',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    rating: 5,
    comment: 'Hasil potong rambut sangat rapi dan pelayanan ramah!',
    createdAt: serverTimestamp(),
  });
  await db.setDoc('reviews', 'rev_2', {
    reviewId: 'rev_2',
    bookingId: 'book_completed',
    customerId: 'customer_active',
    customerName: 'Budi Pelanggan',
    barberId: 'barber_active',
    rating: 5,
    comment: 'Tempatnya bersih, wangi, dan pengerjaannya cepat.',
    createdAt: serverTimestamp(),
  });

  console.log('\n--- Barber Operations Data Seeding Complete ---\n');
}

seedData().catch((err) => {
  console.error('[SEED ERROR]', err);
  process.exit(1);
});
