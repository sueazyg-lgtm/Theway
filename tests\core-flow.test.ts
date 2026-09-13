import { expect,it } from 'vitest'
import { LocalStore } from '../services/local-store'
import { TripService } from '../services/trip-service'
import { createVisitorView } from '../services/share-view'
import type { TripAggregate } from '../domain/models/types'

it('completes the persisted core service flow 10 consecutive times',()=>{
 let successes=0
 for(let run=1;run<=10;run+=1){
  const values=new Map<string,unknown>();const port={get:(k:string)=>values.get(k),set:(k:string,v:unknown)=>{values.set(k,v)}}
  const service=new TripService(new LocalStore<TripAggregate>(port));const id='trip-'+run
  let row=service.createTrip({id,title:'测试旅行'+run,startDate:'2026-10-01',endDate:'2026-10-02',participantNames:['甲','乙','丙']})
  const people=row.value.participants.map(p=>p.id),day=row.value.days[0]!.id
  row=service.addActivity(id,{id:id+'-a',dayId:day,name:'景点',type:'attraction',durationMin:60},row.revision)
  row=service.addActivity(id,{id:id+'-b',dayId:day,name:'酒店',type:'checkin',durationMin:30},row.revision)
  row=service.reorderActivities(id,day,[id+'-b',id+'-a'],row.revision)
  row=service.addBudgetItem(id,{id:id+'-budget',category:'住宿',name:'房费',totalFen:10001,mode:'equal',participantIds:people},row.revision)
  row=service.addBooking(id,{id:id+'-booking',name:'酒店',useDate:'2026-10-01',participantIds:people,totalPriceFen:10001},row.revision)
  row=service.updateBookingStatus(id,id+'-booking',{reservationStatus:'reserved'},row.revision)
  const expense={requestId:id+'-request',payerId:people[0]!,totalFen:10001,beneficiaryIds:people,paidAt:'2026-10-01T20:00:00'}
  row=service.submitExpense(id,expense,row.revision)
  const replay=service.submitExpense(id,expense,row.revision)
  expect(replay.revision).toBe(row.revision)
  row=service.confirmExpense(id,row.value.expenses[0]!.id,row.revision)
  const reopened=new TripService(new LocalStore<TripAggregate>(port)).get(id)
  expect(reopened.value.activities.map(a=>a.id)).toHaveLength(2)
  expect(reopened.value.budgetItems[0]!.splitRule.type).toBe('equal')
  expect(reopened.value.expenses).toHaveLength(1)
  expect(reopened.value.expenses[0]!.allocations.reduce((sum,a)=>sum+a.amountFen,0)).toBe(10001)
  expect(reopened.value.bookings[0]!.reservationStatus).toBe('reserved')
  const visitor=createVisitorView(reopened.value)
  expect(JSON.stringify(visitor)).not.toContain('payerId')
  successes+=1
 }
 expect(successes).toBe(10)
})
