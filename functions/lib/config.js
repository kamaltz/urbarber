"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIDTRANS_IS_PRODUCTION = exports.midtransServerKey = void 0;
exports.getMidtransServerKey = getMidtransServerKey;
const params_1 = require("firebase-functions/params");
exports.midtransServerKey = (0, params_1.defineSecret)('MIDTRANS_SERVER_KEY');
exports.MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === 'true';
function getMidtransServerKey() {
    const secretVal = exports.midtransServerKey.value();
    if (secretVal && secretVal.trim().length > 0) {
        return secretVal.trim();
    }
    const envVal = process.env.MIDTRANS_SERVER_KEY;
    if (envVal && envVal.trim().length > 0) {
        return envVal.trim();
    }
    // Safe default for testing / emulator if secret is unpopulated
    return 'SB-Mid-server-TEST_KEY';
}
//# sourceMappingURL=config.js.map