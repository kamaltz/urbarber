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
exports.generateMidtransSignature = generateMidtransSignature;
exports.verifyMidtransSignature = verifyMidtransSignature;
const crypto = __importStar(require("crypto"));
function generateMidtransSignature(orderId, statusCode, grossAmount, serverKey) {
    // Format grossAmount: if number or string, ensure standard string representation
    const amountStr = typeof grossAmount === 'number' ? grossAmount.toFixed(2) : String(grossAmount);
    // Midtrans signature formula: SHA512(order_id + status_code + gross_amount + ServerKey)
    // Note: Midtrans gross_amount in signature formula can be formatted without decimals or with decimals depending on notification format,
    // so we normalize both raw and decimal formats if needed.
    const payload = `${orderId}${statusCode}${amountStr}${serverKey}`;
    return crypto.createHash('sha512').update(payload).digest('hex');
}
function verifyMidtransSignature(signatureKey, orderId, statusCode, grossAmount, serverKey) {
    if (!signatureKey || !orderId || !statusCode || grossAmount === undefined || !serverKey) {
        return false;
    }
    // Try raw string format
    const amountRawStr = String(grossAmount);
    const sig1 = crypto
        .createHash('sha512')
        .update(`${orderId}${statusCode}${amountRawStr}${serverKey}`)
        .digest('hex');
    if (sig1.toLowerCase() === signatureKey.toLowerCase()) {
        return true;
    }
    // Try formatted decimal (e.g. 50000.00)
    const numAmount = typeof grossAmount === 'number' ? grossAmount : parseFloat(String(grossAmount));
    if (!isNaN(numAmount)) {
        const sig2 = crypto
            .createHash('sha512')
            .update(`${orderId}${statusCode}${numAmount.toFixed(2)}${serverKey}`)
            .digest('hex');
        if (sig2.toLowerCase() === signatureKey.toLowerCase()) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=signature.js.map