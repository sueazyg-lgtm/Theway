import { describe, expect, it } from 'vitest'
import { createTripWorkspaceView } from '../services/view-models'
import { xinjiangSeed } from '../fixtures/xinjiang/seed'

function cloneSeed() {
  return structuredClone(xinjiangSeed)
}

describe('trip workspace view model', () => {
  it('separates known budget, unknown budget, confirmed actual and pending expenses', () => {
    const aggregate = cloneSeed()
    const payerId = aggregate.participants[0]!.id
    const beneficiaryIds = aggregate.participants.map(participant => participant.id)
    const base = {
      tripId: aggregate.trip.id,
      payerId,
      paidAt: '2026-09-26T12:00:00',
      allocations: beneficiaryIds.map((participantId, index) => ({
        participantId,
        amountFen: index === 0 ? 834 : 833,
      })),
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z',
      revision: 1,
    }
    aggregate.expenses.push(
      { ...base, id: 'confirmed', requestId: 'confirmed', totalFen: 2500, status: 'confirmed' },
      { ...base, id: 'pending', requestId: 'pending', totalFen: 1250, status: 'pending' },
    )

    const view = createTripWorkspaceView(aggregate, 7)

    expect(view.revision).toBe(7)
    expect(view.overview.budgetLow).toBe('19561.68')
    expect(view.overview.budgetHigh).toBe('20972.68')
    expect(view.overview.unknownBudgetCount).toBe(2)
    expect(view.actual).toBe('25.00')
    expect(view.pending).toBe('12.50')
  })

  it('keeps purchase and reservation labels independent', () => {
    const aggregate = cloneSeed()
    const booking = aggregate.bookings.find(item =>
      item.purchaseStatus === 'not_purchased' && item.reservationStatus === 'reserved')
    expect(booking).toBeDefined()

    const view = createTripWorkspaceView(aggregate, 1)
    const bookingView = view.bookings.find(item => item.id === booking!.id)

    expect(bookingView?.purchaseLabel).toBe('未购买')
    expect(bookingView?.reservationLabel).toBe('已预约')
  })

  it('renders cancelled activities outside the active timeline without deleting them', () => {
    const aggregate = cloneSeed()
    const activity = aggregate.activities[0]!
    activity.status = 'cancelled'

    const view = createTripWorkspaceView(aggregate, 1)
    const activityView = view.days
      .flatMap(day => day.activities)
      .find(item => item.id === activity.id)

    expect(activityView?.statusLabel).toBe('已放弃')
    expect(activityView?.timeLabel).toBe('不参与时间线')
  })

  it('shows pending refunds separately and reduces actual only after confirmation', () => {
    const aggregate = cloneSeed()
    const participantIds = aggregate.participants.map(participant => participant.id)
    aggregate.expenses.push({
      id: 'expense-for-view',
      tripId: aggregate.trip.id,
      payerId: participantIds[0]!,
      paidAt: '2026-09-26T12:00:00',
      totalFen: 10_000,
      status: 'confirmed',
      requestId: 'expense-for-view',
      allocations: [
        { participantId: participantIds[0]!, amountFen: 3334 },
        { participantId: participantIds[1]!, amountFen: 3333 },
        { participantId: participantIds[2]!, amountFen: 3333 },
      ],
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z',
      revision: 1,
    })
    aggregate.refunds.push({
      id: 'refund-for-view',
      tripId: aggregate.trip.id,
      expenseId: 'expense-for-view',
      receiverId: participantIds[0]!,
      amountFen: 2500,
      status: 'pending',
      allocations: [
        { participantId: participantIds[0]!, amountFen: 834 },
        { participantId: participantIds[1]!, amountFen: 833 },
        { participantId: participantIds[2]!, amountFen: 833 },
      ],
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z',
      revision: 1,
    })

    const pendingView = createTripWorkspaceView(aggregate, 1)
    expect(pendingView.actual).toBe('100.00')
    expect(pendingView.refunds[0]?.label).toBe('待确认退款')
    expect(pendingView.refundableExpenses[0]?.remainingRefundable).toBe('75.00')

    aggregate.refunds[0]!.status = 'confirmed'
    const confirmedView = createTripWorkspaceView(aggregate, 2)
    expect(confirmedView.actual).toBe('75.00')
    expect(confirmedView.refunds[0]?.label).toBe('已确认退款')
  })

  it('shows reported transfers separately and applies only confirmed transfers to suggestions', () => {
    const aggregate = cloneSeed()
    const participantIds = aggregate.participants.map(participant => participant.id)
    aggregate.expenses.push({
      id: 'expense-for-settlement',
      tripId: aggregate.trip.id,
      payerId: participantIds[0]!,
      paidAt: '2026-09-26T12:00:00',
      totalFen: 9000,
      status: 'confirmed',
      requestId: 'expense-for-settlement',
      allocations: participantIds.map(participantId => ({ participantId, amountFen: 3000 })),
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z',
      revision: 1,
    })
    aggregate.transfers.push({
      id: 'reported-transfer',
      tripId: aggregate.trip.id,
      fromParticipantId: participantIds[1]!,
      toParticipantId: participantIds[0]!,
      amountFen: 3000,
      status: 'reported',
      confirmedAt: null,
      createdAt: '2026-09-09T00:00:00Z',
      updatedAt: '2026-09-09T00:00:00Z',
      revision: 1,
    })

    const reportedView = createTripWorkspaceView(aggregate, 1)
    expect(reportedView.transfers[0]?.label).toBe('待确认转账')
    expect(reportedView.suggestions).toHaveLength(2)

    aggregate.transfers[0]!.status = 'confirmed'
    aggregate.transfers[0]!.confirmedAt = '2026-09-26T13:00:00+08:00'
    const confirmedView = createTripWorkspaceView(aggregate, 2)
    expect(confirmedView.transfers[0]?.label).toBe('已确认转账')
    expect(confirmedView.suggestions).toHaveLength(1)
  })
})
