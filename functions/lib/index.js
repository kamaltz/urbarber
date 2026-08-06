"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncBookingPaymentStatus = exports.midtransWebhook = exports.createBookingPayment = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK once if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
var create_booking_payment_1 = require("./create-booking-payment");
Object.defineProperty(exports, "createBookingPayment", { enumerable: true, get: function () { return create_booking_payment_1.createBookingPayment; } });
var midtrans_webhook_1 = require("./midtrans-webhook");
Object.defineProperty(exports, "midtransWebhook", { enumerable: true, get: function () { return midtrans_webhook_1.midtransWebhook; } });
var sync_booking_payment_status_1 = require("./sync-booking-payment-status");
Object.defineProperty(exports, "syncBookingPaymentStatus", { enumerable: true, get: function () { return sync_booking_payment_status_1.syncBookingPaymentStatus; } });
//# sourceMappingURL=index.js.map