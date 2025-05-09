"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WITHDRAWAL_FEE_PERCENTAGE = void 0;
exports.calculateWithdrawalFee = calculateWithdrawalFee;
exports.WITHDRAWAL_FEE_PERCENTAGE = 3;
function calculateWithdrawalFee(amount) {
    return parseFloat((amount * (exports.WITHDRAWAL_FEE_PERCENTAGE / 100)).toFixed(2));
}
