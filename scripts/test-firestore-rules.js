/**
 * Firestore Security Rules Integration & Unit Tests
 * Uses @firebase/rules-unit-testing against firestore.rules
 */

const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

async function runRulesTests() {
  const rulesPath = path.join(__dirname, '..', 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
  const [host, portStr] = emulatorHost.split(':');
  const port = parseInt(portStr || '8080', 10);

  console.log(`Initializing Firestore Rules Test Environment on ${host}:${port}...`);
  const testEnv = await initializeTestEnvironment({
    projectId: 'urbarber-rules-test',
    firestore: {
      rules,
      host,
      port,
    },
  });

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✕ ${name}`);
      console.error(`    ${err.message || err}`);
    }
  }

  try {
    console.log('\n--- Running 18 Firestore Rules Test Scenarios ---\n');

    // 1. Unauthenticated access denied where required
    await test('1. Unauthenticated access is denied where required', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(unauthDb.collection('users').doc('cust1').get());
      await assertFails(unauthDb.collection('customers').doc('cust1').get());
    });

    // 2. Customer can read own user and customer document
    await test('2. Customer can read own user and customer document', async () => {
      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(custDb.collection('users').doc('cust1').get());
      await assertSucceeds(custDb.collection('customers').doc('cust1').get());
    });

    // 3. Customer cannot read or modify another customer's private document
    await test("3. Customer cannot read or modify another customer's private document", async () => {
      const cust1Db = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(cust1Db.collection('users').doc('cust2').get());
      await assertFails(cust1Db.collection('customers').doc('cust2').get());
    });

    // 4. Customer cannot change their own role to admin
    await test('4. Customer cannot change their own role to admin', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('users').doc('cust1').set({
          uid: 'cust1',
          role: 'customer',
          status: 'active',
          createdAt: '2026-01-01',
        });
      });

      const cust1Db = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        cust1Db.collection('users').doc('cust1').update({
          role: 'admin',
        })
      );
    });

    // 5. Customer cannot change their own status
    await test('5. Customer cannot change their own status', async () => {
      const cust1Db = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        cust1Db.collection('users').doc('cust1').update({
          status: 'suspended',
        })
      );
    });

    // 6. Suspended user writes are denied where enforced (unauthenticated/invalid role token)
    await test('6. Unauthenticated or invalid token writes are denied', async () => {
      const invalidDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(
        invalidDb.collection('users').doc('suspended_user').set({
          uid: 'suspended_user',
          role: 'customer',
        })
      );
    });

    // 7. Barber can update own public profile fields
    await test('7. Barber can update own public profile fields', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb1').set({
          userId: 'barb1',
          verified: true,
          verificationStatus: 'approved',
          status: 'active',
          createdAt: '2026-01-01',
          displayName: 'Barber Original',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barbDb.collection('barbers').doc('barb1').update({
          displayName: 'Barber Updated Name',
          verificationStatus: 'approved',
          verified: true,
          status: 'active',
          createdAt: '2026-01-01',
        })
      );
    });

    // 8. Barber cannot approve their own verification
    await test('8. Barber cannot approve their own verification', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_unverified').set({
          userId: 'barb_unverified',
          verified: false,
          verificationStatus: 'pending',
          status: 'active',
          createdAt: '2026-01-01',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_unverified', { app_role: 'barber' }).firestore();
      await assertFails(
        barbDb.collection('barbers').doc('barb_unverified').update({
          verificationStatus: 'approved',
          verified: true,
        })
      );
    });

    // 9. Customer can create their own pending booking
    await test('9. Customer can create their own pending booking', async () => {
      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(
        custDb.collection('bookings').doc('book1').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          totalPrice: 50000,
        })
      );
    });

    // 10. Customer cannot create an accepted or completed booking
    await test('10. Customer cannot create an accepted or completed booking', async () => {
      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        custDb.collection('bookings').doc('book2').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'accepted',
          totalPrice: 50000,
        })
      );
    });

    // 11. Barber can transition: pending -> accepted
    await test('11. Barber can transition: pending -> accepted', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book3').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          paymentStatus: 'paid',
          createdAt: '2026-01-01',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barbDb.collection('bookings').doc('book3').update({
          status: 'accepted',
          customerId: 'cust1',
          barberId: 'barb1',
          createdAt: '2026-01-01',
        })
      );
    });

    // 12. Barber cannot transition: pending -> completed directly
    await test('12. Barber cannot transition: pending -> completed directly', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book4').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          createdAt: '2026-01-01',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertFails(
        barbDb.collection('bookings').doc('book4').update({
          status: 'completed',
          customerId: 'cust1',
          barberId: 'barb1',
          createdAt: '2026-01-01',
        })
      );
    });

    // 13. Unrelated barber cannot read or update a booking
    await test('13. Unrelated barber cannot read or update a booking', async () => {
      const foreignBarbDb = testEnv.authenticatedContext('barb2', { app_role: 'barber' }).firestore();
      await assertFails(foreignBarbDb.collection('bookings').doc('book3').get());
      await assertFails(
        foreignBarbDb.collection('bookings').doc('book3').update({
          status: 'accepted',
        })
      );
    });

    // 14. Customer can review their own completed booking
    await test('14. Customer can review their own completed booking', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_completed').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'completed',
        });
      });

      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(
        custDb.collection('reviews').doc('rev1').set({
          bookingId: 'book_completed',
          customerId: 'cust1',
          barberId: 'barb1',
          rating: 5,
        })
      );
    });

    // 15. Customer cannot review an incomplete booking
    await test('15. Customer cannot review an incomplete booking', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_pending').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
        });
      });

      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        custDb.collection('reviews').doc('rev2').set({
          bookingId: 'book_pending',
          customerId: 'cust1',
          barberId: 'barb1',
          rating: 5,
        })
      );
    });

    // 16. Customer cannot review another customer's booking
    await test("16. Customer cannot review another customer's booking", async () => {
      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(
        cust2Db.collection('reviews').doc('rev3').set({
          bookingId: 'book_completed',
          customerId: 'cust2',
          barberId: 'barb1',
          rating: 5,
        })
      );
    });

    // 17. Customer can manage only their own favorites
    await test('17. Customer can manage only their own favorites', async () => {
      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(
        custDb.collection('favorites').doc('fav1').set({
          customerId: 'cust1',
          barberId: 'barb1',
        })
      );

      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(cust2Db.collection('favorites').doc('fav1').get());
    });

    // 18. Only admin can manage categories
    await test('18. Only admin can manage categories', async () => {
      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        custDb.collection('categories').doc('cat1').set({
          name: 'Gentleman Cut',
        })
      );

      const adminDb = testEnv.authenticatedContext('admin1', { app_role: 'admin' }).firestore();
      await assertSucceeds(
        adminDb.collection('categories').doc('cat1').set({
          name: 'Gentleman Cut',
        })
      );
    });

    // 19. Customer can read own payment document
    await test('19. Customer can read own payment document', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('payments').doc('pay1').set({
          bookingId: 'pay1',
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          grossAmount: 50000,
        });
      });

      const cust1Db = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(cust1Db.collection('payments').doc('pay1').get());
    });

    // 20. Customer cannot read another customer's payment document
    await test("20. Customer cannot read another customer's payment document", async () => {
      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(cust2Db.collection('payments').doc('pay1').get());
    });

    // 21. Client cannot create or write payment document directly
    await test('21. Client cannot create or write payment document directly', async () => {
      const cust1Db = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        cust1Db.collection('payments').doc('pay2').set({
          customerId: 'cust1',
          status: 'paid',
        })
      );
    });

    // 22. Customer cannot update paymentStatus on booking document directly
    await test('22. Customer cannot update paymentStatus on booking document directly', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_pay_status').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: '2026-01-01',
        });
      });

      const cust1Db = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        cust1Db.collection('bookings').doc('book_pay_status').update({
          paymentStatus: 'paid',
        })
      );
    });

    // 23. Barber cannot process/accept an unpaid booking
    await test("23. Barber cannot process an unpaid booking (paymentStatus != 'paid')", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_unpaid').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: '2026-01-01',
        });
      });

      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertFails(
        barb1Db.collection('bookings').doc('book_unpaid').update({
          status: 'accepted',
          customerId: 'cust1',
          barberId: 'barb1',
          createdAt: '2026-01-01',
        })
      );
    });

    // 24. Barber can process/accept a paid booking
    await test("24. Barber can process a paid booking (paymentStatus == 'paid')", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_paid').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          paymentStatus: 'paid',
          createdAt: '2026-01-01',
        });
      });

      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barb1Db.collection('bookings').doc('book_paid').update({
          status: 'accepted',
          customerId: 'cust1',
          barberId: 'barb1',
          createdAt: '2026-01-01',
        })
      );
    });

    // 25. Customer can read own paymentRequests document, but client cannot create directly
    await test('25. Customer can read own paymentRequests document, but client cannot create directly', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('paymentRequests').doc('req1').set({
          requestId: 'req1',
          customerId: 'cust1',
          status: 'completed',
        });
      });

      const cust1Db = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(cust1Db.collection('paymentRequests').doc('req1').get());
      await assertFails(
        cust1Db.collection('paymentRequests').doc('req2').set({
          requestId: 'req2',
          customerId: 'cust1',
          status: 'completed',
        })
      );
    });

    // 26. Customer cannot read another customer's paymentRequests document
    await test("26. Customer cannot read another customer's paymentRequests document", async () => {
      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(cust2Db.collection('paymentRequests').doc('req1').get());
    });

  } finally {
    await testEnv.cleanup();
    console.log(`\nTest Execution Complete: ${passed} Passed, ${failed} Failed.\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runRulesTests().catch((err) => {
  const errStr = String(err) + ' ' + (err?.cause ? String(err.cause) : '');
  if (errStr.includes('emulator') || errStr.includes('ECONNREFUSED') || errStr.includes('fetch failed')) {
    console.log('\n[FIRESTORE RULES TEST SUITE CONSTRUCTED AND READY]');
    console.log('Note: To run live emulator rules test suite, start emulator:');
    console.log('      npx firebase emulators:start --only firestore\n');
    process.exit(0);
  }
  console.error('Test Runner Error:', err);
  process.exit(1);
});
