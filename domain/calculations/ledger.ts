export function calculateNetExpenses(
  expenses: Array<{ amountFen: number }>,
  refunds: Array<{ amountFen: number }>,
): number {
  return expenses.reduce((sum, item) => sum + item.amountFen, 0)
    - refunds.reduce((sum, item) => sum + item.amountFen, 0)
}

export function validateRefund(originalExpenseFen: number, priorConfirmedRefundFen: number, nextRefundFen: number): void {
  if (nextRefundFen < 0 || priorConfirmedRefundFen + nextRefundFen > originalExpenseFen) {
    throw new Error('累计退款不能超过原支付金额')
  }
}
