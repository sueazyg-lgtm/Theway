"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFen = formatFen;
exports.createTripWorkspaceView = createTripWorkspaceView;
const timeline_1 = require("../domain/calculations/timeline");
const finance_summary_1 = require("./finance-summary");
const overview_1 = require("./overview");
const activityLabels = {
    attraction: '游玩',
    meal: '用餐',
    shopping: '购物',
    rest: '休息',
    refuel: '补给',
    parking: '停车',
    transfer: '交通',
    checkin: '住宿',
    custom: '地点',
};
const purchaseLabels = {
    not_purchased: '未购买',
    partially_purchased: '部分购买',
    purchased: '已购买',
    cancelled: '已取消',
};
const reservationLabels = {
    not_required: '无需预约',
    pending: '待预约',
    reserved: '已预约',
    failed: '预约失败',
    expired: '预约已过期',
};
function formatFen(amountFen) {
    return (amountFen / 100).toFixed(2);
}
function createTripWorkspaceView(value, revision) {
    var _a;
    var _b;
    const summary = (0, finance_summary_1.financeSummary)(value);
    const overview = (0, overview_1.overviewSummary)(value);
    const participantName = (id) => { var _a; var _b; return (_b = (_a = value.participants.find(participant => participant.id === id)) === null || _a === void 0 ? void 0 : _a.displayName) !== null && _b !== void 0 ? _b : '未知同行人'; };
    const days = value.days.map(day => {
        var _a;
        var _b;
        const activities = value.activities
            .filter(activity => activity.dayId === day.id)
            .sort((left, right) => left.sequence - right.sequence);
        const planned = activities.filter(activity => activity.status === 'planned');
        const timeline = (0, timeline_1.calculateTimeline)(day, planned, value.transportLegs.filter(leg => leg.planId === day.planId));
        return {
            ...day,
            departureTime: (_b = (_a = day.departureAt) === null || _a === void 0 ? void 0 : _a.slice(11, 16)) !== null && _b !== void 0 ? _b : '',
            activities: activities.map(activity => {
                var _a, _b;
                var _c, _d;
                const item = timeline.items.find(candidate => candidate.activityId === activity.id);
                const earliest = (_c = (_a = item === null || item === void 0 ? void 0 : item.earliestStartAt) === null || _a === void 0 ? void 0 : _a.slice(11, 16)) !== null && _c !== void 0 ? _c : null;
                const latest = (_d = (_b = item === null || item === void 0 ? void 0 : item.latestStartAt) === null || _b === void 0 ? void 0 : _b.slice(11, 16)) !== null && _d !== void 0 ? _d : null;
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
                };
            }),
        };
    });
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
            reported: value.transfers.some(transfer => transfer.status === 'reported'
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
                .reduce((sum, refund) => sum + refund.amountFen, 0);
            const remainingFen = expense.totalFen - reservedRefundFen;
            return {
                id: expense.id,
                payerName: participantName(expense.payerId),
                amount: formatFen(expense.totalFen),
                remainingFen,
                remainingRefundable: formatFen(remainingFen),
                label: `${participantName(expense.payerId)}支付 ¥${formatFen(expense.totalFen)}`,
            };
        })
            .filter(expense => expense.remainingFen > 0),
        conflicts: value.conflicts,
        alternativeNote: (_b = (_a = value.plans.find(plan => plan.state === 'alternative')) === null || _a === void 0 ? void 0 : _a.changeSummary) !== null && _b !== void 0 ? _b : '',
    };
}
