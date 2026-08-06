/**
 * Firestore Admin Seed Script for Customer Discovery (Batch 03)
 * Seeds exact test dataset required:
 * - 3 active & approved barbers
 * - 1 pending barber
 * - 1 suspended barber
 * - 3 active categories
 * - 2–3 active services per active barber
 * - 1 inactive service
 *
 * Usage:
 *   Emulator:     firebase emulators:exec --only firestore "node ./scripts/seed-discovery-data.js"
 *   Live Project: npm run seed:discovery:live
 */

const isLive = process.env.USE_LIVE_PROJECT === 'true' || process.argv.includes('--live');

let db;
let serverTimestamp;

if (isLive) {
  console.log('[SEED] Mode: Live Firebase Project');
  const { initializeApp } = require('firebase/app');
  const { getFirestore, doc, setDoc, Timestamp } = require('firebase/firestore');

  const firebaseConfig = {
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'urbarber-f97ae',
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'fake-api-key',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'urbarber-f97ae.firebaseapp.com',
  };

  const app = initializeApp(firebaseConfig);
  const clientDb = getFirestore(app);

  db = {
    setDoc: (coll, id, data) => setDoc(doc(clientDb, coll, id), data, { merge: true }),
  };
  serverTimestamp = () => Timestamp.now();
} else {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
  console.log(`[SEED] Mode: Firestore Emulator (${emulatorHost})`);

  const { initializeApp, getApps } = require('firebase-admin/app');
  const { getFirestore, FieldValue } = require('firebase-admin/firestore');
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'urbarber-f97ae';

  if (getApps().length === 0) {
    initializeApp({ projectId });
  }

  const adminDb = getFirestore();

  db = {
    setDoc: (coll, id, data) => adminDb.collection(coll).doc(id).set(data, { merge: true }),
  };
  serverTimestamp = () => FieldValue.serverTimestamp();
}

async function seedData() {
  console.log(`\n--- Starting Customer Discovery Data Seeding (${isLive ? 'Live Project' : 'Emulator'}) ---\n`);

  // 1. Exactly 3 Active Categories
  const categories = [
    { id: 'haircut', name: 'Potong Rambut', order: 1, active: true },
    { id: 'shaving', name: 'Cukur Jenggot & Kumis', order: 2, active: true },
    { id: 'styling', name: 'Styling & Perawatan', order: 3, active: true },
  ];

  console.log('1. Seeding 3 Active Categories:');
  for (const cat of categories) {
    await db.setDoc('categories', cat.id, {
      ...cat,
      createdAt: serverTimestamp(),
    });
    console.log(`  ✓ Category: ${cat.name} (${cat.id})`);
  }

  // 2. Barbers (3 Active Approved, 1 Pending, 1 Suspended)
  const barbers = [
    {
      id: 'barber_garut_01',
      userId: 'barber_garut_01',
      displayName: 'Garut Gentleman Barbershop',
      description: 'Layanan panggil potong rambut pria profesional & modern di Garut Kota.',
      address: 'Jl. Ahmad Yani No. 45, Garut Kota',
      ratingAverage: 4.9,
      reviewCount: 42,
      verified: true,
      verificationStatus: 'approved',
      status: 'active',
      serviceTypes: ['haircut', 'shaving', 'styling'],
      profileImageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
    },
    {
      id: 'barber_garut_02',
      userId: 'barber_garut_02',
      displayName: 'Tarogong Hair Studio',
      description: 'Spesialis potong rambut modern fade & jenggot pria.',
      address: 'Jl. Raya Tarogong No. 12, Tarogong Kaler, Garut',
      ratingAverage: 4.7,
      reviewCount: 28,
      verified: true,
      verificationStatus: 'approved',
      status: 'active',
      serviceTypes: ['haircut', 'shaving'],
      profileImageUrl: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400',
    },
    {
      id: 'barber_garut_03',
      userId: 'barber_garut_03',
      displayName: 'Barber Kang Asep Garut',
      description: 'Pangkas rambut tradisional khas Garut & pijat kepala rileks.',
      address: 'Jl. Otista No. 88, Leles, Garut',
      ratingAverage: 4.8,
      reviewCount: 35,
      verified: true,
      verificationStatus: 'approved',
      status: 'active',
      serviceTypes: ['haircut', 'shaving'],
      profileImageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400',
    },
    {
      id: 'barber_pending_01',
      userId: 'barber_pending_01',
      displayName: 'Barber Baru Menunggu Verifikasi',
      description: 'Profil sedang dalam tahap peninjauan admin URBarber.',
      address: 'Jl. Cimanuk No. 100, Garut',
      ratingAverage: 0,
      reviewCount: 0,
      verified: false,
      verificationStatus: 'pending',
      status: 'active',
      serviceTypes: ['haircut'],
    },
    {
      id: 'barber_suspended_01',
      userId: 'barber_suspended_01',
      displayName: 'Barber Suspended Non-Aktif',
      description: 'Akun ditangguhkan karena pelanggaran kebijakan.',
      address: 'Garut',
      ratingAverage: 2.1,
      reviewCount: 5,
      verified: true,
      verificationStatus: 'approved',
      status: 'suspended',
      serviceTypes: ['haircut'],
    },
  ];

  console.log('\n2. Seeding Barbers (3 Active Approved, 1 Pending, 1 Suspended):');
  for (const b of barbers) {
    await db.setDoc('barbers', b.id, {
      ...b,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`  ✓ Barber: ${b.displayName} [Status: ${b.status}, Verification: ${b.verificationStatus}]`);
  }

  // 3. Services (2–3 Active per Active Barber + 1 Inactive Service)
  const services = [
    // Barber 1 (3 Active Services)
    {
      id: 'svc_01',
      barberId: 'barber_garut_01',
      categoryId: 'haircut',
      name: 'Gentleman Haircut & Wash',
      description: 'Potong rambut rapi lengkap dengan cuci dan ramuan perawatan.',
      price: 50000,
      durationMinutes: 45,
      active: true,
    },
    {
      id: 'svc_02',
      barberId: 'barber_garut_01',
      categoryId: 'shaving',
      name: 'Premium Hot Towel Shave',
      description: 'Cukur jenggot & kumis bersih dengan handuk hangat relaksasi.',
      price: 35000,
      durationMinutes: 30,
      active: true,
    },
    {
      id: 'svc_03',
      barberId: 'barber_garut_01',
      categoryId: 'styling',
      name: 'Head & Shoulder Massage',
      description: 'Pijat relaksasi area kepala, leher, dan bahu.',
      price: 25000,
      durationMinutes: 20,
      active: true,
    },

    // Barber 2 (2 Active Services)
    {
      id: 'svc_04',
      barberId: 'barber_garut_02',
      categoryId: 'haircut',
      name: 'Modern Fade Haircut',
      description: 'Potong rambut model skin fade atau undercut terkini.',
      price: 60000,
      durationMinutes: 40,
      active: true,
    },
    {
      id: 'svc_05',
      barberId: 'barber_garut_02',
      categoryId: 'shaving',
      name: 'Beard Trim & Lineup',
      description: 'Merapikan dan membentuk garis jenggot simetris.',
      price: 30000,
      durationMinutes: 25,
      active: true,
    },

    // Barber 3 (2 Active Services)
    {
      id: 'svc_06',
      barberId: 'barber_garut_03',
      categoryId: 'haircut',
      name: 'Pangkas Rambut Garutan Klasik',
      description: 'Potong rambut rapi klasik ditambah pijat bahu tradisional.',
      price: 40000,
      durationMinutes: 35,
      active: true,
    },
    {
      id: 'svc_07',
      barberId: 'barber_garut_03',
      categoryId: 'shaving',
      name: 'Cukur Kumis & Jenggot Tradisional',
      description: 'Cukur kumis & jenggot ramuan herbal tradisional Garut.',
      price: 25000,
      durationMinutes: 20,
      active: true,
    },

    // 1 Inactive Service
    {
      id: 'svc_08_inactive',
      barberId: 'barber_garut_01',
      categoryId: 'styling',
      name: 'Paket Promo Musiman (Non-aktif)',
      description: 'Layanan promo spesial musiman yang sedang ditutup sementara.',
      price: 80000,
      durationMinutes: 60,
      active: false,
    },
  ];

  console.log('\n3. Seeding Services (2-3 Active per Active Barber + 1 Inactive):');
  for (const s of services) {
    await db.setDoc('barberServices', s.id, {
      ...s,
      createdAt: serverTimestamp(),
    });
    console.log(`  ✓ Service: ${s.name} [Active: ${s.active}] (Rp ${s.price.toLocaleString('id-ID')})`);
  }

  console.log('\nSeed Customer Discovery Data Completed Successfully!\n');
  process.exit(0);
}

seedData().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
