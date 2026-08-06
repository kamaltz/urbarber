"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapMidtransStatus = mapMidtransStatus;
exports.shouldReleaseSlot = shouldReleaseSlot;
function mapMidtransStatus(transactionStatus, fraudStatus) {
    if (!transactionStatus)
        return 'pending';
    const status = transactionStatus.toLowerCase().trim();
    const fraud = (fraudStatus || '').toLowerCase().trim();
    switch (status) {
        case 'pending':
            return 'pending';
        case 'settlement':
            return 'paid';
        case 'capture':
            return fraud === 'accept' ? 'paid' : 'failed';
        case 'deny':
            return 'failed';
        case 'cancel':
            return 'cancelled';
        case 'expire':
            return 'expired';
        case 'refund':
            return 'refunded';
        case 'partial_refund':
            return 'partially_refunded';
        default:
            return 'pending';
    }
}
function shouldReleaseSlot(paymentStatus) {
    return paymentStatus === 'failed' || paymentStatus === 'expired' || paymentStatus === 'cancelled';
}
//# sourceMappingURL=status-mapper.js.map