import { calculateBudget, BudgetInput } from '../domain/calculations/budget'
import { calculateBalances, suggestTransfers } from '../domain/calculations/settlement'
import type { Allocation } from '../domain/models/types'
interface Input {
  participants: {id:string}[]
  budgetItems: BudgetInput[]
  expenses: {status:string;payerId:string;totalFen:number;allocations:Allocation[]}[]
  refunds: {status:string;receiverId:string;amountFen:number;allocations:Allocation[]}[]
  transfers: {status:string;fromParticipantId:string;toParticipantId:string;amountFen:number}[]
}
export function financeSummary(input: Input) {
  const expenses = input.expenses.filter(e=>e.status==='confirmed')
  const refunds = input.refunds.filter(e=>e.status==='confirmed')
  const balances = calculateBalances(input.participants.map(p=>p.id),expenses.map(e=>({...e,amountFen:e.totalFen})),refunds,input.transfers.filter(t=>t.status==='confirmed'))
  return { budget:calculateBudget(input.budgetItems), actualFen:expenses.reduce((s,e)=>s+e.totalFen,0)-refunds.reduce((s,e)=>s+e.amountFen,0), pendingFen:input.expenses.filter(e=>e.status==='pending').reduce((s,e)=>s+e.totalFen,0), balances, suggestions:suggestTransfers(balances) }
}
