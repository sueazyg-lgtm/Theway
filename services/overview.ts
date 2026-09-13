import type { TripAggregate } from '../domain/models/types'
import { calculateBudget } from '../domain/calculations/budget'
export function overviewSummary(value:TripAggregate){
 const budget=calculateBudget(value.budgetItems)
 const bookings={purchased:value.bookings.filter(b=>b.purchaseStatus==='purchased').length,reserved:value.bookings.filter(b=>b.reservationStatus==='reserved').length,total:value.bookings.length}
 const conflictCount=value.conflicts.filter(c=>c.status!=='resolved').length
 const todos:{code:string;label:string}[]=[]
 if(budget.unknownCount)todos.push({code:'UNKNOWN_BUDGET',label:`${budget.unknownCount}项预算金额待补`})
 const pending=value.bookings.filter(b=>b.purchaseStatus!=='purchased'||(b.reservationStatus!=='reserved'&&b.reservationStatus!=='not_required')).length
 if(pending)todos.push({code:'BOOKING_PENDING',label:`${pending}项购买或预约待处理`})
 if(conflictCount)todos.push({code:'SOURCE_CONFLICT',label:`${conflictCount}项来源冲突或信息缺口`})
 return {budget,bookings,conflictCount,todos}
}
