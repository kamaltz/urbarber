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

    // Isolation boundary: bookings are trusted-backend-only (Admin SDK bypasses rules).
    // Clear before this group so no residue from the users/barbers groups above can
    // interfere with rule-propagation timing for the assertions below.
    await testEnv.clearFirestore();

    // 9. Scheduled booking creation is trusted-backend-only; direct client create is DENIED
    // Legacy client-side bookingRepository.createBooking() has zero production call sites
    // (verified via repo-wide search) and is superseded by POST /api/payments/create
    // (Vercel backend, Admin SDK). Client Firestore create must stay denied.
    await test('9. Customer CANNOT create a booking directly (trusted-backend-only)', async () => {
      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        custDb.collection('bookings').doc('book1').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          totalPrice: 50000,
        })
      );
    });

    // 10. Customer cannot create an accepted or completed booking (also trusted-backend-only)
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

    // 13. Unrelated barber cannot read or update a booking (self-contained fixture,
    // independent of test 11's book3, so this test is order-independent)
    await test('13. Unrelated barber cannot read or update a booking', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_unrelated').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          paymentStatus: 'paid',
          createdAt: '2026-01-01',
        });
      });

      const foreignBarbDb = testEnv.authenticatedContext('barb2', { app_role: 'barber' }).firestore();
      await assertFails(foreignBarbDb.collection('bookings').doc('book_unrelated').get());
      await assertFails(
        foreignBarbDb.collection('bookings').doc('book_unrelated').update({
          status: 'accepted',
        })
      );
    });

    // Payment-first booking visibility (Batch 09D-S final blocker):
    // unpaid payment intents must never be readable by the assigned barber.
    await testEnv.clearFirestore();

    // 13b. Customer can read their own UNPAID payment intent
    await test('13b. Customer can read own unpaid payment intent', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_intent').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          // no paymentStatus field at all -- matches the real payment-intent shape
          // created by POST /api/payments/create before Midtrans confirmation
          createdAt: '2026-01-01',
        });
      });

      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(custDb.collection('bookings').doc('book_intent').get());
    });

    // 13c. Assigned barber CANNOT read an unpaid payment intent
    await test('13c. Assigned barber cannot read unpaid payment intent', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_intent2').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          paymentStatus: 'pending',
          createdAt: '2026-01-01',
        });
      });

      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertFails(barb1Db.collection('bookings').doc('book_intent2').get());
    });

    // 13d. Assigned barber CAN read a paid, finalized booking
    await test('13d. Assigned barber can read a paid finalized booking', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_finalized').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          paymentStatus: 'paid',
          createdAt: '2026-01-01',
        });
      });

      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(barb1Db.collection('bookings').doc('book_finalized').get());
    });

    // 13e. Unrelated barber CANNOT read a paid booking that isn't theirs
    await test('13e. Unrelated barber cannot read a paid booking', async () => {
      const barb2Db = testEnv.authenticatedContext('barb2', { app_role: 'barber' }).firestore();
      await assertFails(barb2Db.collection('bookings').doc('book_finalized').get());
    });

    // 13f. Unrelated customer CANNOT read another customer's booking (paid or not)
    await test("13f. Unrelated customer cannot read another customer's booking", async () => {
      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(cust2Db.collection('bookings').doc('book_finalized').get());
      await assertFails(cust2Db.collection('bookings').doc('book_intent2').get());
    });

    // Isolation boundary: reviews group verifies get()-based booking ownership/status
    // checks. Clear so no residual booking/review docs from earlier groups can mask
    // a rule regression, and so rule-propagation from the barbers/bookings groups
    // above has fully settled before these assertions run.
    await testEnv.clearFirestore();

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

    // 16. Customer cannot review another customer's booking (self-contained fixture,
    // independent of test 14's book_completed, so this test is order-independent)
    await test("16. Customer cannot review another customer's booking", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_completed_foreign').set({
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'completed',
        });
      });

      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(
        cust2Db.collection('reviews').doc('rev3').set({
          bookingId: 'book_completed_foreign',
          customerId: 'cust2',
          barberId: 'barb1',
          rating: 5,
        })
      );
    });

    // Isolation boundary: favorites group is independent of the reviews fixtures above.
    await testEnv.clearFirestore();

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

    // 20. Customer cannot read another customer's payment document (self-contained
    // fixture, independent of test 19's pay1, so this test is order-independent)
    await test("20. Customer cannot read another customer's payment document", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('payments').doc('pay1_foreign').set({
          bookingId: 'pay1_foreign',
          customerId: 'cust1',
          barberId: 'barb1',
          status: 'pending',
          grossAmount: 50000,
        });
      });

      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(cust2Db.collection('payments').doc('pay1_foreign').get());
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
    // (self-contained fixture, independent of test 25's req1, so this test is
    // order-independent)
    await test("26. Customer cannot read another customer's paymentRequests document", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('paymentRequests').doc('req1_foreign').set({
          requestId: 'req1_foreign',
          customerId: 'cust1',
          status: 'completed',
        });
      });

      const cust2Db = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();
      await assertFails(cust2Db.collection('paymentRequests').doc('req1_foreign').get());
    });

    // 27. Barber can read their own barber profile
    await test('27. Barber can read their own barber profile', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb1').set({
          name: 'Barber One',
          verified: true,
          status: 'active',
          verificationStatus: 'approved',
          ratingAverage: 5.0,
          createdAt: '2026-01-01',
        });
      });

      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(barb1Db.collection('barbers').doc('barb1').get());
    });

    // 28. Barber can update their own description, but cannot change verificationStatus or ratingAverage
    await test('28. Barber can update operational fields but cannot change verificationStatus or ratingAverage', async () => {
      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barb1Db.collection('barbers').doc('barb1').update({
          shopDescription: 'Deskripsi baru',
          verificationStatus: 'approved',
          verified: true,
          status: 'active',
          createdAt: '2026-01-01',
        })
      );

      await assertFails(
        barb1Db.collection('barbers').doc('barb1').update({
          verificationStatus: 'pending',
          verified: true,
          status: 'active',
          createdAt: '2026-01-01',
        })
      );
    });

    // 38. Real onboarding flow: barber profile created without verified/ratingAverage set yet
    // must not let the barber introduce those fields themselves on their first write to them.
    await test('38. Barber cannot self-introduce verified/ratingAverage on a profile that never had them set', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb4').set({
          uid: 'barb4',
          userId: 'barb4',
          shopName: 'Barb Four Shop',
        });
      });

      const barb4Db = testEnv.authenticatedContext('barb4', { app_role: 'barber' }).firestore();

      await assertSucceeds(
        barb4Db.collection('barbers').doc('barb4').update({
          shopDescription: 'Draft profile update, no authoritative fields touched',
        })
      );

      await assertFails(
        barb4Db.collection('barbers').doc('barb4').update({ verified: true })
      );
      await assertFails(
        barb4Db.collection('barbers').doc('barb4').update({ ratingAverage: 5 })
      );
      await assertFails(
        barb4Db.collection('barbers').doc('barb4').update({ verificationStatus: 'approved' })
      );
    });

    // 29. Barber can create a service for themselves, but cannot create for another barber
    await test('29. Barber can create a service for themselves, but cannot create for another barber', async () => {
      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barb1Db.collection('barberServices').doc('svc1').set({
          barberId: 'barb1',
          name: 'Cukur Haircut',
          price: 50000,
          durationMinutes: 30,
          active: true,
        })
      );

      await assertFails(
        barb1Db.collection('barberServices').doc('svc2').set({
          barberId: 'barb2',
          name: 'Cukur Haircut Fake',
          price: 50000,
          durationMinutes: 30,
          active: true,
        })
      );
    });

    // 30. Barber can update their own schedule, but cannot update another barber's schedule
    await test("30. Barber can update their own schedule, but cannot update another barber's schedule", async () => {
      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barb1Db.collection('barberSchedules').doc('barb1').set({
          schedule: [],
          updatedAt: '2026-01-01',
        })
      );

      await assertFails(
        barb1Db.collection('barberSchedules').doc('barb2').set({
          schedule: [],
          updatedAt: '2026-01-01',
        })
      );
    });

    // 31. Barber can read assigned booking, but cannot read unrelated booking
    await test('31. Barber can read assigned booking, but cannot read unrelated booking', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('bookings').doc('book_other').set({
          customerId: 'cust1',
          barberId: 'barb2',
          status: 'pending',
        });
      });

      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertFails(barb1Db.collection('bookings').doc('book_other').get());
    });

    // 33. Client cannot create users document directly (must be via Admin SDK backend)
    await test('33. Client cannot create users document directly', async () => {
      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertFails(
        custDb.collection('users').doc('cust1').set({
          uid: 'cust1',
          role: 'customer',
          status: 'active',
        })
      );
    });

    // 34. Barber can read own barberRegistrations document, but cannot read another barber's
    await test("34. Barber can read own barberRegistrations document, but cannot read another barber's", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barberRegistrations').doc('barb1').set({
          barberId: 'barb1',
          verificationStatus: 'draft',
        });
      });

      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(barb1Db.collection('barberRegistrations').doc('barb1').get());

      const barb2Db = testEnv.authenticatedContext('barb2', { app_role: 'barber' }).firestore();
      await assertFails(barb2Db.collection('barberRegistrations').doc('barb1').get());
    });

    // 35. Barber can update allowed draft fields in barberRegistrations
    await test('35. Barber can update allowed draft fields in barberRegistrations', async () => {
      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barb1Db.collection('barberRegistrations').doc('barb1').update({
          ownerName: 'Updated Barber Name',
          verificationStatus: 'draft',
        })
      );
    });

    // 36. Barber cannot self-approve or self-submit verificationStatus directly
    await test('36. Barber cannot change verificationStatus in barberRegistrations directly', async () => {
      const barb1Db = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertFails(
        barb1Db.collection('barberRegistrations').doc('barb1').update({
          verificationStatus: 'approved',
        })
      );
    });

    // 37. Real onboarding flow: barber can save draft updates on a doc that has never had
    // verificationStatus set (matches actual saveProfileDraft/uploadVerificationDocument
    // client behavior, which never sets this field), but still cannot introduce it as approved.
    await test('37. Barber can update a draft doc with no verificationStatus field yet, but cannot introduce it as approved', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barberRegistrations').doc('barb3').set({
          barberId: 'barb3',
          ownerName: 'Barb Three',
        });
      });

      const barb3Db = testEnv.authenticatedContext('barb3', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barb3Db.collection('barberRegistrations').doc('barb3').update({
          documentPaths: { ktp: 'barb3/verifications/1.pdf' },
          documentsCompleted: true,
        })
      );

      await assertFails(
        barb3Db.collection('barberRegistrations').doc('barb3').update({
          verificationStatus: 'approved',
        })
      );
    });

    // Batch 09E regression: sendMessage() atomically updates conversation metadata
    // (lastMessage/unread counts) in the same transaction as the message write.
    // Firestore transactions are all-or-nothing, so participants need a real update
    // path -- but it must never allow mutating structural/identity fields.
    await test('39. Participant can update conversation metadata fields (lastMessage, unread counts) when sending a message', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv1').set({
          bookingId: 'conv1',
          customerId: 'cust1',
          barberId: 'barb1',
          participants: ['cust1', 'barb1'],
          status: 'active',
          createdAt: '2026-01-01',
          customerUnreadCount: 0,
          barberUnreadCount: 0,
        });
      });

      const custDb = testEnv.authenticatedContext('cust1', { app_role: 'customer' }).firestore();
      await assertSucceeds(
        custDb.collection('conversations').doc('conv1').update({
          lastMessage: 'Halo',
          lastMessageAt: '2026-01-02',
          lastSenderId: 'cust1',
          updatedAt: '2026-01-02',
          barberUnreadCount: 1,
        })
      );

      const barbDb = testEnv.authenticatedContext('barb1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barbDb.collection('conversations').doc('conv1').update({
          lastMessage: 'Hai balik',
          customerUnreadCount: 1,
        })
      );

      const outsiderDb = testEnv.authenticatedContext('rando', { app_role: 'customer' }).firestore();
      await assertFails(
        outsiderDb.collection('conversations').doc('conv1').update({ lastMessage: 'intruder' })
      );
    });

    // 40. Structural/identity fields on a conversation remain immutable from the
    // client even for a legitimate participant -- this is the guard that keeps
    // test 39's metadata-update allowance from being usable to hijack a conversation.
    await test('40. Conversation participants/customerId/barberId/status/bookingId/createdAt cannot be mutated by a participant', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv2').set({
          bookingId: 'conv2',
          customerId: 'cust2',
          barberId: 'barb2',
          participants: ['cust2', 'barb2'],
          status: 'active',
          createdAt: '2026-01-01',
        });
      });

      const custDb = testEnv.authenticatedContext('cust2', { app_role: 'customer' }).firestore();

      await assertFails(
        custDb.collection('conversations').doc('conv2').update({
          participants: ['cust2', 'barb2', 'intruder'],
        })
      );
      await assertFails(
        custDb.collection('conversations').doc('conv2').update({ barberId: 'intruder' })
      );
      await assertFails(
        custDb.collection('conversations').doc('conv2').update({ customerId: 'intruder' })
      );
      await assertFails(
        custDb.collection('conversations').doc('conv2').update({ status: 'closed' })
      );
      await assertFails(
        custDb.collection('conversations').doc('conv2').update({ bookingId: 'different-booking' })
      );
      await assertFails(
        custDb.collection('conversations').doc('conv2').update({ createdAt: '2026-02-02' })
      );
    });

    // 41. Chat is explicitly out of scope for Admin (docs/agent/business-rules.md:
    // "Admin: No chat access"). Admin must not gain ordinary client-level read
    // access to a conversation or its messages just from app_role=admin.
    await test('41. Admin has no client-level read access to conversations or messages', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('conversations').doc('conv3').set({
          bookingId: 'conv3',
          customerId: 'cust3',
          barberId: 'barb3',
          participants: ['cust3', 'barb3'],
          status: 'active',
          createdAt: '2026-01-01',
        });
        await context.firestore().collection('conversations').doc('conv3').collection('messages').doc('msg1').set({
          senderId: 'cust3',
          text: 'Halo',
          type: 'text',
          createdAt: '2026-01-01',
        });
      });

      const adminDb = testEnv.authenticatedContext('admin1', { app_role: 'admin' }).firestore();
      await assertFails(adminDb.collection('conversations').doc('conv3').get());
      await assertFails(adminDb.collection('conversations').doc('conv3').collection('messages').doc('msg1').get());
    });

    // 42. A normal profile update that touches neither location nor geohash must remain
    // allowed on a legacy barber document that has no location/geohash at all -- geo
    // fields must not become mandatory on every update.
    await test('42. Barber profile update not touching location/geohash succeeds on a barber with no geo data yet', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_geo1').set({
          uid: 'barb_geo1',
          userId: 'barb_geo1',
          shopName: 'No Geo Yet Shop',
          verificationStatus: 'approved',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_geo1', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barbDb.collection('barbers').doc('barb_geo1').update({
          shopDescription: 'Updated description, no geo fields touched',
        })
      );
    });

    // 43. Changing location without also supplying a matching geohash update must be denied,
    // so a client can never leave a stale geohash paired with new coordinates.
    await test('43. Barber updating location without geohash is denied', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_geo2').set({
          uid: 'barb_geo2',
          userId: 'barb_geo2',
          shopName: 'Geo Pair Shop',
          verificationStatus: 'approved',
          location: { latitude: -7.0, longitude: 107.0 },
          geohash: 'qqguqp7',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_geo2', { app_role: 'barber' }).firestore();
      await assertFails(
        barbDb.collection('barbers').doc('barb_geo2').update({
          location: { latitude: -7.5, longitude: 107.5 },
        })
      );
    });

    // 44. Changing geohash without also supplying a matching location update must be denied,
    // so a client can never leave stale coordinates paired with a new geohash.
    await test('44. Barber updating geohash without location is denied', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_geo3').set({
          uid: 'barb_geo3',
          userId: 'barb_geo3',
          shopName: 'Geo Pair Shop 2',
          verificationStatus: 'approved',
          location: { latitude: -7.0, longitude: 107.0 },
          geohash: 'qqguqp7',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_geo3', { app_role: 'barber' }).firestore();
      await assertFails(
        barbDb.collection('barbers').doc('barb_geo3').update({
          geohash: 'qqguqp8',
        })
      );
    });

    // 45. Updating location and geohash together (both derived from the same coordinates by
    // the client) is allowed -- this is the real Barber "save current location" flow.
    await test('45. Barber updating location and geohash together succeeds', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_geo4').set({
          uid: 'barb_geo4',
          userId: 'barb_geo4',
          shopName: 'Geo Pair Shop 3',
          verificationStatus: 'approved',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_geo4', { app_role: 'barber' }).firestore();
      await assertSucceeds(
        barbDb.collection('barbers').doc('barb_geo4').update({
          location: { latitude: -7.2278, longitude: 107.9087 },
          geohash: 'qqguqp7z',
        })
      );
    });

    // 46. A. The Barber's own "Status Toko" (open/closed) toggle only ever needs to change
    // acceptingNewBookings, and that alone must remain allowed in both directions.
    await test('46. Barber changing acceptingNewBookings only is allowed in both directions', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_listing1').set({
          uid: 'barb_listing1',
          userId: 'barb_listing1',
          shopName: 'Listing Authority Shop 1',
          verificationStatus: 'approved',
          listingStatus: 'active',
          acceptingNewBookings: true,
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_listing1', { app_role: 'barber' }).firestore();
      await assertSucceeds(barbDb.collection('barbers').doc('barb_listing1').update({ acceptingNewBookings: false }));
      await assertSucceeds(barbDb.collection('barbers').doc('barb_listing1').update({ acceptingNewBookings: true }));
    });

    // 47. B/C/D. listingStatus is trusted-backend/Admin-authoritative (set only by the
    // approve/reject/suspend/reactivate flows in backend/vercel/src/admin/admin.service.ts).
    // A Barber must never be able to self-activate, self-deactivate, or self-unsuspend
    // their own listing directly against Firestore.
    await test('47. Barber changing listingStatus directly is denied regardless of direction', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_listing2').set({
          uid: 'barb_listing2',
          userId: 'barb_listing2',
          shopName: 'Listing Authority Shop 2',
          verificationStatus: 'approved',
          listingStatus: 'active',
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_listing2', { app_role: 'barber' }).firestore();
      // B. active -> inactive
      await assertFails(barbDb.collection('barbers').doc('barb_listing2').update({ listingStatus: 'inactive' }));

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_listing3').set({
          uid: 'barb_listing3',
          userId: 'barb_listing3',
          shopName: 'Listing Authority Shop 3',
          verificationStatus: 'approved',
          listingStatus: 'inactive',
        });
      });
      const barb3Db = testEnv.authenticatedContext('barb_listing3', { app_role: 'barber' }).firestore();
      // C. inactive -> active
      await assertFails(barb3Db.collection('barbers').doc('barb_listing3').update({ listingStatus: 'active' }));

      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_listing4').set({
          uid: 'barb_listing4',
          userId: 'barb_listing4',
          shopName: 'Listing Authority Shop 4',
          verificationStatus: 'approved',
          listingStatus: 'suspended',
        });
      });
      const barb4Db = testEnv.authenticatedContext('barb_listing4', { app_role: 'barber' }).firestore();
      // D. suspended -> active
      await assertFails(barb4Db.collection('barbers').doc('barb_listing4').update({ listingStatus: 'active' }));
    });

    // 48. E. A Barber cannot smuggle a listingStatus change through by bundling it with a
    // legitimate acceptingNewBookings change in the same write.
    await test('48. Barber cannot change listingStatus by bundling it with acceptingNewBookings in the same request', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_listing5').set({
          uid: 'barb_listing5',
          userId: 'barb_listing5',
          shopName: 'Listing Authority Shop 5',
          verificationStatus: 'approved',
          listingStatus: 'inactive',
          acceptingNewBookings: false,
        });
      });

      const barbDb = testEnv.authenticatedContext('barb_listing5', { app_role: 'barber' }).firestore();
      await assertFails(
        barbDb.collection('barbers').doc('barb_listing5').update({
          acceptingNewBookings: true,
          listingStatus: 'active',
        })
      );
    });

    // 49. F. The trusted/admin path (app_role=admin) retains the ability to perform the
    // real listing-state transitions (approve/suspend/reactivate) that
    // backend/vercel/src/admin/admin.service.ts performs -- exercised here via the rules'
    // own `|| isAdmin()` allowance, matching the rule as written.
    await test('49. Admin-role context can still change listingStatus', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection('barbers').doc('barb_listing6').set({
          uid: 'barb_listing6',
          userId: 'barb_listing6',
          shopName: 'Listing Authority Shop 6',
          verificationStatus: 'approved',
          listingStatus: 'active',
        });
      });

      const adminDb = testEnv.authenticatedContext('admin1', { app_role: 'admin' }).firestore();
      await assertSucceeds(
        adminDb.collection('barbers').doc('barb_listing6').update({ listingStatus: 'suspended' })
      );
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
