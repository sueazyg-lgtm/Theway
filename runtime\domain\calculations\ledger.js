"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNetExpenses = calculateNetExpenses;
exports.validateRefund = validateRefund;
function calculateNetExpenses(expenses, refunds) {
    return expenses.reduce((sum, item) => sum + item.amountFen, 0)
        - refunds.reduce((sum, item) => sum + item.amountFen, 0);
}
function validateRefund(originalExpenseFen, priorConfirmedRefundFen, nextRefundFen) {
    if (nextRefundFen < 0 || priorConfirmedRefundFen + nextRefundFen > originalExpenseFen) {
        throw new Error('累计退款不能超过原支付金额');
    }
}
