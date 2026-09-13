import type { Allocation } from '../models/types'

export interface Balance { participantId: string; amountFen: number }
export interface SettlementExpense { payerId: string; amountFen: number; allocations: Allocation[] }
export interface SettlementRefund { receiverId: string; amountFen: number; allocations: Allocation[] }
export interface ConfirmedTransfer { fromParticipantId: string; toParticipantId: string; amountFen: number }
export interface TransferSuggestion extends ConfirmedTransfer {}

export function calculateBalances(
  participantIds: string[],
  expenses: SettlementExpense[],
  refunds: SettlementRefund[],
  transfers: ConfirmedTransfer[],
): Balance[] {
  const values = new Map(participantIds.map(id => [id, 0]))
  const add = (id: string, amount: number) => values.set(id, (values.get(id) ?? 0) + amount)
  for (const expense of expenses) {
    add(expense.payerId, expense.amountFen)
    for (const allocation of expense.allocations) add(allocation.participantId, -allocation.amountFen)
  }
  for (const refund of refunds) {
    add(refund.receiverId, -refund.amountFen)
    for (const allocation of refund.allocations) add(allocation.participantId, allocation.amountFen)
  }
  for (const transfer of transfers) {
    add(transfer.fromParticipantId, transfer.amountFen)
    add(transfer.toParticipantId, -transfer.amountFen)
  }
  const result = [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([participantId, amountFen]) => ({ participantId, amountFen }))
  if (result.reduce((sum, item) => sum + item.amountFen, 0) !== 0) throw new Error('结算余额不守恒')
  return result
}

export function suggestTransfers(balances: Balance[]): TransferSuggestion[] {
  const creditors = balances.filter(item => item.amountFen > 0).sort((a, b) => a.participantId.localeCompare(b.participantId)).map(item => ({ ...item }))
  const debtors = balances.filter(item => item.amountFen < 0).sort((a, b) => a.participantId.localeCompare(b.participantId)).map(item => ({ ...item, amountFen: -item.amountFen }))
  const result: TransferSuggestion[] = []
  let ci = 0
  let di = 0
  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]!
    const debtor = debtors[di]!
    const amountFen = Math.min(creditor.amountFen, debtor.amountFen)
    result.push({ fromParticipantId: debtor.participantId, toParticipantId: creditor.participantId, amountFen })
    creditor.amountFen -= amountFen
    debtor.amountFen -= amountFen
    if (creditor.amountFen === 0) ci += 1
    if (debtor.amountFen === 0) di += 1
  }
  return result
}
