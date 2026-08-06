import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK once if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

export { createBookingPayment } from './create-booking-payment';
export { midtransWebhook } from './midtrans-webhook';
export { syncBookingPaymentStatus } from './sync-booking-payment-status';
