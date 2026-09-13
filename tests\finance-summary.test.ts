import { expect, it } from 'vitest'
import { financeSummary } from '../services/finance-summary'
it('excludes pending expenses and transfers from consumption and settlement', () => {
  const summary = financeSummary({participants:[{id:'a'},{id:'b'}], budgetItems:[{lowFen:10000,highFen:12000},{lowFen:null,highFen:null}], expenses:[{status:'pending',payerId:'b',totalFen:999,allocations:[]},{status:'confirmed',payerId:'a',totalFen:1000,allocations:[{participantId:'a',amountFen:500},{participantId:'b',amountFen:500}]}],refunds:[],transfers:[]})
  expect(summary.actualFen).toBe(1000)
  expect(summary.pendingFen).toBe(999)
  expect(summary.budget.unknownCount).toBe(1)
  expect(summary.suggestions).toEqual([{fromParticipantId:'b',toParticipantId:'a',amountFen:500}])
})
