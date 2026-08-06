/**
 * Unit Test Runner for Customer Discovery & Profile Sub-System (Batch 03)
 * Tests search normalization, barber visibility criteria, favorite document keying, and profile input validation.
 */

function normalizeSearchKeyword(text) {
  return text ? text.toLowerCase().trim() : '';
}

function formatIDR(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDurationMinutes(minutes) {
  if (!minutes || minutes <= 0) return '30 menit';
  return `${minutes} menit`;
}

function filterPublicBarbers(barbers) {
  return barbers.filter((b) => b.status === 'active' && b.verified === true);
}

function getFavoriteDocumentId(customerId, barberId) {
  if (!customerId || !barberId) throw new Error('customerId and barberId are required');
  return `${customerId}_${barberId}`;
}

function validateProfileInput(data) {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Nama lengkap minimal 2 karakter.');
  }
  if (data.phone && (data.phone.trim().length < 9 || data.phone.trim().length > 15)) {
    errors.push('Nomor telepon harus antara 9-15 digit.');
  }
  return { valid: errors.length === 0, errors };
}

function runTests() {
  console.log('\n--- Running Batch 03 Unit Tests ---\n');
  let passed = 0;
  let failed = 0;

  function assert(name, condition, extraInfo = '') {
    if (condition) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.error(`  ✕ ${name} ${extraInfo}`);
    }
  }

  // Test 1: Search keyword normalization
  assert(
    '1. Normalize search keyword converts to lowercase and trims whitespace',
    normalizeSearchKeyword('  Garut Barber  ') === 'garut barber' &&
      normalizeSearchKeyword('') === ''
  );

  // Test 2: Barber visibility filtering
  const sampleBarbers = [
    { id: '1', displayName: 'Barber Active Approved', status: 'active', verified: true },
    { id: '2', displayName: 'Barber Pending', status: 'active', verified: false },
    { id: '3', displayName: 'Barber Suspended', status: 'suspended', verified: true },
  ];
  const visible = filterPublicBarbers(sampleBarbers);
  assert(
    '2. Barber visibility filter excludes unverified or suspended barbers',
    visible.length === 1 && visible[0].id === '1'
  );

  // Test 3: Favorite document identity
  assert(
    '3. Favorite document ID follows deterministic pattern {customerId}_{barberId}',
    getFavoriteDocumentId('cust_123', 'barb_456') === 'cust_123_barb_456'
  );

  // Test 4: IDR currency formatting
  assert(
    '4. Price formatter converts numbers to Indonesian Rupiah currency format',
    formatIDR(50000).includes('50.000') && formatIDR(0).includes('0')
  );

  // Test 5: Service duration formatting
  assert(
    '5. Duration formatter converts minutes to "X menit" format',
    formatDurationMinutes(45) === '45 menit' && formatDurationMinutes(0) === '30 menit'
  );

  // Test 6: Profile update validation (Valid input)
  const validProfile = validateProfileInput({ name: 'Asep Ridwan', phone: '08123456789' });
  assert('6. Profile validator accepts valid name and phone', validProfile.valid);

  // Test 7: Profile update validation (Short name rejected)
  const invalidName = validateProfileInput({ name: 'A' });
  assert(
    '7. Profile validator rejects names shorter than 2 characters',
    !invalidName.valid && invalidName.errors[0].includes('minimal 2 karakter')
  );

  // Test 8: Profile update validation (Invalid phone length rejected)
  const invalidPhone = validateProfileInput({ name: 'Asep', phone: '123' });
  assert(
    '8. Profile validator rejects invalid phone length',
    !invalidPhone.valid && invalidPhone.errors[0].includes('9-15 digit')
  );

  console.log(`\nBatch 03 Unit Tests Completed: ${passed} Passed, ${failed} Failed.\n`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
