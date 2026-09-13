import { expect,it } from 'vitest'
import { overviewSummary } from '../services/overview'
import { xinjiangSeed } from '../fixtures/xinjiang/seed'
it('summarizes budget, bookings and unresolved work without treating source claims as confirmed',()=>{
 const result=overviewSummary(xinjiangSeed)
 expect(result.budget).toEqual({lowFen:1956168,highFen:2097268,unknownCount:2,complete:false})
 expect(result.bookings).toEqual({purchased:3,reserved:7,total:17})
 expect(result.conflictCount).toBe(10)
 expect(result.todos.map(t=>t.code)).toEqual(['UNKNOWN_BUDGET','BOOKING_PENDING','SOURCE_CONFLICT'])
})
