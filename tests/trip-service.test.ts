import { expect, it } from 'vitest'
import { TripService } from '../services/trip-service'
import { LocalStore } from '../services/local-store'
import type { TripAggregate } from '../domain/models/types'
import { xinjiangSeed } from '../fixtures/xinjiang/seed'
function setup() {
  const values = new Map<string, unknown>()
  return new TripService(new LocalStore<TripAggregate>({ get: k => values.get(k), set: (k,v) => { values.set(k,v) } }))
}
const input = { id: 'trip', title: '海边旅行', startDate: '2026-10-01', endDate: '2026-10-02', participantNames: ['甲','乙'] }
it('imports a fixture once without creating actual expenses',()=>{const service=setup();const saved=service.importTrip(xinjiangSeed);expect(saved.value.days).toHaveLength(10);expect(saved.value.expenses).toHaveLength(0);expect(()=>service.importTrip(xinjiangSeed)).toThrow('version_conflict')})
it('persists daily activities, exact ordering and optional cancellation', () => {
  const service=setup()
  const created=service.createTrip(input)
  const dayId=created.value.days[0]!.id
  service.addActivity('trip',{id:'a',dayId,name:'游玩',type:'attraction',durationMin:60},1)
  service.addActivity('trip',{id:'b',dayId,name:'入住',type:'checkin',durationMin:null},2)
  expect(()=>service.reorderActivities('trip',dayId,['a','a'],3)).toThrow()
  service.reorderActivities('trip',dayId,['b','a'],3)
  service.setActivityEnabled('trip','a',false,4)
  const saved=service.get('trip').value.activities
  expect(saved.find(a=>a.id==='b')!.sequence).toBe(0)
  expect(saved.find(a=>a.id==='a')!.status).toBe('cancelled')
  expect(saved.find(a=>a.id==='b')!.durationMin).toBeNull()
})
it('persists equal, room and designated budget splits without losing fen', () => {
  const service=setup(); const trip=service.createTrip(input); const ids=trip.value.participants.map(p=>p.id)
  service.addBudgetItem('trip',{id:'e',category:'交通',name:'租车',totalFen:10001,mode:'equal',participantIds:ids},1)
  service.addBudgetItem('trip',{id:'r',category:'住宿',name:'双人房',totalFen:9999,mode:'room',participantIds:[ids[0]!] },2)
  service.addBudgetItem('trip',{id:'f',category:'门票',name:'指定承担',totalFen:101,mode:'fixed',participantIds:ids},3)
  const items=service.get('trip').value.budgetItems
  expect(items.map(i=>i.splitRule.type)).toEqual(['equal','room','fixed'])
  const fixed=items[2]!.splitRule; if(fixed.type!=='fixed') throw new Error('wrong rule')
  expect(Object.values(fixed.allocations).reduce((a,b)=>a+b,0)).toBe(101)
})
it('keeps booking purchase and reservation statuses independent', () => {
  const service=setup(); const trip=service.createTrip(input); const ids=trip.value.participants.map(p=>p.id)
  service.addBooking('trip',{id:'hotel',name:'酒店',useDate:'2026-10-01',participantIds:ids,totalPriceFen:30000},1)
  service.updateBookingStatus('trip','hotel',{purchaseStatus:'purchased'},2)
  let booking=service.get('trip').value.bookings[0]!
  expect([booking.purchaseStatus,booking.reservationStatus]).toEqual(['purchased','pending'])
  service.updateBookingStatus('trip','hotel',{reservationStatus:'reserved'},3)
  booking=service.get('trip').value.bookings[0]!
  expect([booking.purchaseStatus,booking.reservationStatus]).toEqual(['purchased','reserved'])
})
it('persists daily departure time and alternative-plan notes',()=>{
 const service=setup();const trip=service.createTrip(input);const day=trip.value.days[0]!
 service.setDayDeparture('trip',day.id,'08:30',1)
 expect(service.get('trip').value.days[0]!.departureAt).toBe('2026-10-01T08:30:00')
 expect(()=>service.setDayDeparture('trip',day.id,'24:00',2)).toThrow()
 service.updateAlternativeNote('trip','下雨时改逛博物馆',2)
 expect(service.get('trip').value.plans.find(p=>p.state==='alternative')!.changeSummary).toBe('下雨时改逛博物馆')
})
it('creates variable participants and persists edits', () => {
  const service = setup()
  const created = service.createTrip(input)
  expect(created.value.participants).toHaveLength(2)
  expect(created.value.days).toHaveLength(2)
  service.renameTrip('trip', '改名', created.revision)
  expect(service.get('trip').value.trip.title).toBe('改名')
  expect(() => service.renameTrip('trip', '过时修改', created.revision)).toThrow('version_conflict')
})
it('persists pending expenses, replays request IDs, and explicitly confirms', () => {
  const service = setup()
  const trip = service.createTrip(input)
  const ids = trip.value.participants.map(p => p.id)
  const expense = { requestId: 'req-1', payerId: ids[0]!, totalFen: 10001, beneficiaryIds: ids, paidAt: '2026-10-01T12:00:00+08:00' }
  const saved = service.submitExpense('trip', expense, 1)
  expect(saved.value.expenses[0]?.status).toBe('pending')
  expect(service.submitExpense('trip', expense, 1).revision).toBe(saved.revision)
  expect(() => service.submitExpense('trip', { ...expense, totalFen: 5 }, saved.revision)).toThrow('request_id_reused')
  const confirmed = service.confirmExpense('trip', saved.value.expenses[0]!.id, saved.revision)
  expect(confirmed.value.expenses[0]?.status).toBe('confirmed')
  expect(confirmed.value.expenses[0]?.allocations.reduce((s,a) => s+a.amountFen,0)).toBe(10001)
})
it('rejects invalid dates, empty participants, and non-member payers', () => {
  const service = setup()
  expect(() => service.createTrip({ ...input, startDate: '2026-02-30' })).toThrow()
  expect(() => service.createTrip({ ...input, participantNames: [] })).toThrow()
  service.createTrip(input)
  expect(() => service.submitExpense('trip', { requestId:'r', payerId:'outsider', totalFen: 1, beneficiaryIds:['outsider'], paidAt:'2026-10-01T12:00:00Z' },1)).toThrow('invalid_participant')
})

it('persists refunds as pending and subtracts them only after explicit confirmation', () => {
  const service = setup()
  const trip = service.createTrip(input)
  const ids = trip.value.participants.map(participant => participant.id)
  const pendingExpense = service.submitExpense('trip', {
    requestId: 'expense-for-refund',
    payerId: ids[0]!,
    totalFen: 10_001,
    beneficiaryIds: ids,
    paidAt: '2026-10-01T12:00:00+08:00',
  }, 1)
  const confirmedExpense = service.confirmExpense(
    'trip',
    pendingExpense.value.expenses[0]!.id,
    pendingExpense.revision,
  )

  const pendingRefund = service.submitRefund('trip', {
    id: 'refund-1',
    expenseId: confirmedExpense.value.expenses[0]!.id,
    receiverId: ids[0]!,
    amountFen: 3001,
  }, confirmedExpense.revision)

  expect(pendingRefund.value.refunds[0]?.status).toBe('pending')
  expect(pendingRefund.value.refunds[0]?.allocations.reduce((sum, item) => sum + item.amountFen, 0)).toBe(3001)
  expect(() => service.submitRefund('trip', {
    id: 'too-much',
    expenseId: confirmedExpense.value.expenses[0]!.id,
    receiverId: ids[0]!,
    amountFen: 7001,
  }, pendingRefund.revision)).toThrow('累计退款不能超过原支付金额')

  const confirmedRefund = service.confirmRefund('trip', 'refund-1', pendingRefund.revision)
  expect(confirmedRefund.value.refunds[0]?.status).toBe('confirmed')
  expect(confirmedRefund.value.expenses[0]?.status).toBe('confirmed')
})

it('rejects refunds for pending expenses and non-member receivers', () => {
  const service = setup()
  const trip = service.createTrip(input)
  const ids = trip.value.participants.map(participant => participant.id)
  const expense = service.submitExpense('trip', {
    requestId: 'pending-expense',
    payerId: ids[0]!,
    totalFen: 5000,
    beneficiaryIds: ids,
    paidAt: '2026-10-01T12:00:00+08:00',
  }, 1)

  expect(() => service.submitRefund('trip', {
    id: 'refund-pending',
    expenseId: expense.value.expenses[0]!.id,
    receiverId: ids[0]!,
    amountFen: 1000,
  }, expense.revision)).toThrow('refund_requires_confirmed_expense')
  expect(() => service.submitRefund('trip', {
    id: 'refund-outsider',
    expenseId: expense.value.expenses[0]!.id,
    receiverId: 'outsider',
    amountFen: 1000,
  }, expense.revision)).toThrow('invalid_participant')
})

it('persists each day route locations without hardcoding destination or transport', () => {
  const service = setup()
  const trip = service.createTrip(input)
  const dayId = trip.value.days[0]!.id

  const saved = service.setDayLocations('trip', dayId, '机场', '海边民宿', trip.revision)

  expect(saved.value.days[0]).toMatchObject({ startLocation: '机场', endLocation: '海边民宿' })
  expect(saved.value.activities).toHaveLength(0)
  expect(() => service.setDayLocations('trip', 'missing-day', '甲地', '乙地', saved.revision))
    .toThrow('day_not_found')
})

it('archives and restores a trip without deleting its itinerary or finance data', () => {
  const service = setup()
  const trip = service.createTrip(input)
  const dayId = trip.value.days[0]!.id
  const withActivity = service.addActivity('trip', {
    id: 'keep-after-archive',
    dayId,
    name: '海边散步',
    type: 'attraction',
    durationMin: 60,
  }, trip.revision)
  const archived = service.archiveTrip('trip', withActivity.revision)

  expect(archived.value.trip.status).toBe('archived')
  expect(archived.value.activities.map(item => item.id)).toContain('keep-after-archive')

  const restored = service.restoreTrip('trip', archived.revision)
  expect(restored.value.trip.status).toBe('planning')
  expect(restored.value.activities).toHaveLength(1)
})

it('records settlement transfers as reported and affects balances only after confirmation', () => {
  const service = setup()
  const trip = service.createTrip(input)
  const ids = trip.value.participants.map(participant => participant.id)
  const pendingExpense = service.submitExpense('trip', {
    requestId: 'expense-for-transfer',
    payerId: ids[0]!,
    totalFen: 10_000,
    beneficiaryIds: ids,
    paidAt: '2026-10-01T12:00:00+08:00',
  }, trip.revision)
  const confirmedExpense = service.confirmExpense(
    'trip',
    pendingExpense.value.expenses[0]!.id,
    pendingExpense.revision,
  )

  const reported = service.reportTransfer('trip', {
    id: 'transfer-1',
    fromParticipantId: ids[1]!,
    toParticipantId: ids[0]!,
    amountFen: 5000,
  }, confirmedExpense.revision)

  expect(reported.value.transfers[0]).toMatchObject({
    status: 'reported',
    confirmedAt: null,
    amountFen: 5000,
  })

  const confirmed = service.confirmTransfer('trip', 'transfer-1', reported.revision)
  expect(confirmed.value.transfers[0]?.status).toBe('confirmed')
  expect(confirmed.value.transfers[0]?.confirmedAt).toBeTruthy()
})

it('rejects invalid settlement transfer participants and amounts', () => {
  const service = setup()
  const trip = service.createTrip(input)
  const ids = trip.value.participants.map(participant => participant.id)

  expect(() => service.reportTransfer('trip', {
    id: 'same-person',
    fromParticipantId: ids[0]!,
    toParticipantId: ids[0]!,
    amountFen: 100,
  }, trip.revision)).toThrow('invalid_transfer')
  expect(() => service.reportTransfer('trip', {
    id: 'outsider',
    fromParticipantId: 'outsider',
    toParticipantId: ids[0]!,
    amountFen: 100,
  }, trip.revision)).toThrow('invalid_participant')
})
