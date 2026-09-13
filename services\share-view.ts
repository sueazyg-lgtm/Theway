import type { TripAggregate } from '../domain/models/types'
import { calculateBudget } from '../domain/calculations/budget'
function freeze<T>(value:T):Readonly<T>{if(value&&typeof value==='object'){Object.values(value as object).forEach(freeze);Object.freeze(value)}return value}
export function createVisitorView(trip:TripAggregate){
 const budget=calculateBudget(trip.budgetItems)
 return freeze({schemaVersion:1 as const,tripId:trip.trip.id,title:trip.trip.title,startDate:trip.trip.startDate,endDate:trip.trip.endDate,participantCount:trip.participants.length,
  days:trip.days.map(day=>({date:day.date,startLocation:day.startLocation,endLocation:day.endLocation,activities:trip.activities.filter(a=>a.dayId===day.id&&a.status==='planned').sort((a,b)=>a.sequence-b.sequence).map(a=>({name:a.name,type:a.type,durationMin:a.durationMin,durationMax:a.durationMax}))})),
  budget:{lowFen:budget.lowFen,highFen:budget.highFen,unknownCount:budget.unknownCount},
  bookingProgress:{purchased:trip.bookings.filter(b=>b.purchaseStatus==='purchased').length,reserved:trip.bookings.filter(b=>b.reservationStatus==='reserved').length,total:trip.bookings.length},
  notice:'只读分享视图不包含个人费用、付款人、分摊明细或订单价格'})
}
