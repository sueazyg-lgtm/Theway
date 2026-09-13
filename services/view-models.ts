import type { Activity, Booking, TripAggregate } from '../domain/models/types'
import { calculateTimeline } from '../domain/calculations/timeline'
import { financeSummary } from './finance-summary'
import { overviewSummary } from './overview'

const activityLabels: Record<Activity['type'], string> = {
  attraction: '游玩',
  meal: '用餐',
  shopping: '购物',
  rest: '休息',
  refuel: '补给',
  parking: '停车',
  transfer: '交通',
  checkin: '住宿',
  custom: '地点',
}

const purchaseLabels: Record<Booking['purchaseStatus'], string> = {
  not_purchased: '未购买',
  partially_purchased: '部分购买',
  purchased: '已购买',
  cancelled: '已取消',
}

const reservationLabels: Record<Booking['reservationStatus'], string> = {
  not_required: '无需预约',
  pending: '待预约',
  reserved: '已预约',
  failed: '预约失败',
  expired: '预约已过期',
}

export function formatFen(amountFen: number): string {
  return (amountFen / 100).toFixed(2)
}

export function createTripWorkspaceView(value: TripAggregate, revision: number) {
  const summary = financeSummary(value)
  const overview = overviewSummary(value)
  const participantName = (id: string) =>
    value.participants.find(participant => participant.id === id)?.displayName ?? '未知同行人'

  const days = value.days.map(day => {
    const activities = value.activities
      .filter(activity => activity.dayId === day.id)
      .sort((left, right) => left.sequence - right.sequence)
    const planned = activities.filter(activity => activity.status === 'planned')
    const timeline = calculateTimeline(
      day,
      planned,
      value.transportLegs.filter(leg => leg.planId === day.planId),
    )

    return {
      ...day,
      departureTime: day.departureAt?.slice(11, 16) ?? '',
      activities: activities.map(activity => {
        const item = timeline.items.find(candidate => candidate.activityId === activity.id)
        const earliest = item?.earliestStartAt?.slice(11, 16) ?? null
        const latest = item?.latestStartAt?.slice(11, 16) ?? null
        return {
          ...activity,
          typeLabel: activityLabels[activity.type],
          durationLabel: activity.durationMin === null
            ? '时长待补'
            : activity.durationMax !== null && activity.durationMax !== activity.durationMin
              ? `${activity.durationMin}—${activity.durationMax} 分钟`
              : `${activity.durationMin} 分钟`,
          timeLabel: activity.status === 'cancelled'
            ? '不参与时间线'
            : earliest
              ? earliest === latest ? earliest : `${earliest}—${latest}`
              : '时间待补',
          statusLabel: activity.status === 'cancelled' ? '已放弃' : '已启用',
        }
      }),
    }
  })

  return {
    id: value.trip.id,
    revision,
    title: value.trip.title,
    startDate: value.trip.startDate,
    endDate: value.trip.endDate,
    participantCount: value.participants.length,
    participants: value.participants,
    participantNames: value.participants.map(participant => participant.displayName),
    days,
    overview: {
      ...overview,
      budgetLow: formatFen(overview.budget.lowFen),
      budgetHigh: formatFen(overview.budget.highFen),
      unknownBudgetCount: overview.budget.unknownCount,
    },
    actual: formatFen(summary.actualFen),
    pending: formatFen(summary.pendingFen),
    suggestions: summary.suggestions.map((suggestion, index) => ({
      id: String(index),
      fromParticipantId: suggestion.fromParticipantId,
      toParticipantId: suggestion.toParticipantId,
      amountFen: suggestion.amountFen,
      from: participantName(suggestion.fromParticipantId),
      to: participantName(suggestion.toParticipantId),
      amount: formatFen(suggestion.amountFen),
      reported: value.transfers.some(transfer =>
        transfer.status === 'reported'
        && transfer.fromParticipantId === suggestion.fromParticipantId
        && transfer.toParticipantId === suggestion.toParticipantId
        && transfer.amountFen === suggestion.amountFen),
    })),
    budgetItems: value.budgetItems.map(item => ({
      ...item,
      amount: item.lowFen === null || item.highFen === null
        ? '金额待补'
        : item.lowFen === item.highFen
          ? formatFen(item.lowFen)
          : `${formatFen(item.lowFen)}—${formatFen(item.highFen)}`,
      modeLabel: item.splitRule.type === 'equal'
        ? '公共均分'
        : item.splitRule.type === 'room'
          ? '按房间人员'
          : item.splitRule.type === 'fixed'
            ? '指定人员承担'
            : '按权重分摊',
    })),
    bookings: value.bookings.map(booking => ({
      ...booking,
      amount: booking.totalPriceFen === null ? '金额待补' : formatFen(booking.totalPriceFen),
      purchaseLabel: purchaseLabels[booking.purchaseStatus],
      reservationLabel: reservationLabels[booking.reservationStatus],
    })),
    expenses: value.expenses.map(expense => ({
      ...expense,
      amount: formatFen(expense.totalFen),
      label: expense.status === 'confirmed'
        ? '已确认实付'
        : expense.status === 'pending'
          ? '待确认'
          : '已拒绝',
    })),
    refunds: value.refunds.map(refund => ({
      ...refund,
      amount: formatFen(refund.amountFen),
      receiverName: participantName(refund.receiverId),
      label: refund.status === 'confirmed' ? '已确认退款' : '待确认退款',
    })),
    transfers: value.transfers.map(transfer => ({
      ...transfer,
      amount: formatFen(transfer.amountFen),
      fromName: participantName(transfer.fromParticipantId),
      toName: participantName(transfer.toParticipantId),
      label: transfer.status === 'confirmed'
        ? '已确认转账'
        : transfer.status === 'reported'
          ? '待确认转账'
          : '结算建议',
    })),
    refundableExpenses: value.expenses
      .filter(expense => expense.status === 'confirmed')
      .map(expense => {
        const reservedRefundFen = value.refunds
          .filter(refund => refund.expenseId === expense.id)
          .reduce((sum, refund) => sum + refund.amountFen, 0)
        const remainingFen = expense.totalFen - reservedRefundFen
        return {
          id: expense.id,
          payerName: participantName(expense.payerId),
          amount: formatFen(expense.totalFen),
          remainingFen,
          remainingRefundable: formatFen(remainingFen),
          label: `${participantName(expense.payerId)}支付 ¥${formatFen(expense.totalFen)}`,
        }
      })
      .filter(expense => expense.remainingFen > 0),
    conflicts: value.conflicts,
    alternativeNote: value.plans.find(plan => plan.state === 'alternative')?.changeSummary ?? '',
  }
}
