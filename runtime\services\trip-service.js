"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TripService = void 0;
const split_1 = require("../domain/calculations/split");
const ledger_1 = require("../domain/calculations/ledger");
function validDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
class TripService {
    constructor(store) {
        this.store = store;
    }
    list() { return this.store.list(); }
    get(id) { const row = this.store.get(id); if (!row)
        throw new Error('trip_not_found'); return row; }
    lastSavedAt() { return this.store.lastSavedAt(); }
    importTrip(value) {
        var _a, _b;
        if (!((_a = value === null || value === void 0 ? void 0 : value.trip) === null || _a === void 0 ? void 0 : _a.id) || value.trip.id !== ((_b = value.participants[0]) === null || _b === void 0 ? void 0 : _b.tripId) || !validDate(value.trip.startDate) || !validDate(value.trip.endDate))
            throw new Error('invalid_import');
        return this.store.save(value.trip.id, value, 0);
    }
    createTrip(input) {
        if (!input.title.trim() || !validDate(input.startDate) || !validDate(input.endDate) || input.endDate < input.startDate)
            throw new Error('请填写有效的行程名称及起止日期');
        if (!input.participantNames.length || input.participantNames.some(n => !n.trim()))
            throw new Error('请填写同行人');
        const count = (Date.parse(input.endDate) - Date.parse(input.startDate)) / 86400000 + 1;
        if (count > 366)
            throw new Error('单次行程最多366天');
        const now = new Date().toISOString();
        const base = { createdAt: now, updatedAt: now, revision: 1 };
        const planId = input.id + ':plan';
        const value = {
            trip: { ...base, id: input.id, title: input.title.trim(), startDate: input.startDate, endDate: input.endDate, timezone: 'Asia/Shanghai', currency: 'CNY', ownerId: 'demo-owner', status: 'planning', budgetLimitFen: null, currentPlanId: planId },
            participants: input.participantNames.map((name, i) => ({ ...base, id: input.id + ':p' + i, tripId: input.id, displayName: name.trim(), linkedUserId: null, groupId: null, participationRanges: [{ startDate: input.startDate, endDate: input.endDate }] })),
            plans: [{ ...base, id: planId, tripId: input.id, parentVersionId: null, name: '当前方案', state: 'current', changeSummary: '创建行程' }],
            days: Array.from({ length: count }, (_, i) => ({ ...base, id: input.id + ':day' + i, tripId: input.id, planId, date: new Date(Date.parse(input.startDate) + i * 86400000).toISOString().slice(0, 10), startLocation: '', endLocation: '', departureAt: null })),
            groups: [], vehicles: [], activities: [], transportLegs: [], parkingSessions: [], roomNights: [], budgetItems: [], bookings: [], expenses: [], refunds: [], transfers: [], conflicts: [], sources: [], imports: []
        };
        return this.store.save(input.id, value, 0);
    }
    renameTrip(id, title, revision) {
        if (!title.trim())
            throw new Error('行程名称不能为空');
        const row = this.get(id);
        row.value.trip.title = title.trim();
        row.value.trip.updatedAt = new Date().toISOString();
        row.value.trip.revision = revision + 1;
        return this.store.save(id, row.value, revision);
    }
    submitExpense(id, input, revision) {
        const row = this.get(id);
        const members = row.value.participants.map(p => p.id);
        if (!members.includes(input.payerId) || !input.beneficiaryIds.length || input.beneficiaryIds.some(p => !members.includes(p)) || new Set(input.beneficiaryIds).size !== input.beneficiaryIds.length)
            throw new Error('invalid_participant');
        if (!input.requestId.trim() || !Number.isFinite(Date.parse(input.paidAt)) || input.totalFen <= 0)
            throw new Error('invalid_expense');
        const allocations = (0, split_1.splitEvenly)(input.totalFen, input.beneficiaryIds);
        const existing = row.value.expenses.find(e => e.requestId === input.requestId);
        if (existing) {
            if (existing.payerId !== input.payerId || existing.totalFen !== input.totalFen || existing.paidAt !== input.paidAt || JSON.stringify(existing.allocations) !== JSON.stringify(allocations))
                throw new Error('request_id_reused');
            return row;
        }
        const now = new Date().toISOString();
        row.value.expenses.push({ id: id + ':expense:' + input.requestId, tripId: id, createdAt: now, updatedAt: now, revision: 1, payerId: input.payerId, paidAt: input.paidAt, totalFen: input.totalFen, status: 'pending', requestId: input.requestId, allocations });
        return this.store.save(id, row.value, revision);
    }
    addActivity(id, input, revision) {
        const row = this.get(id);
        const day = row.value.days.find(d => d.id === input.dayId && d.planId === row.value.trip.currentPlanId);
        if (!day || !input.name.trim() || (input.durationMin !== null && (!Number.isSafeInteger(input.durationMin) || input.durationMin < 0)))
            throw new Error('活动日期、名称或时长无效');
        if (!input.id.trim() || row.value.activities.some(a => a.id === input.id))
            throw new Error('duplicate_activity');
        const now = new Date().toISOString();
        row.value.activities.push({ id: input.id, tripId: id, planId: day.planId, dayId: day.id, name: input.name.trim(), type: input.type, sequence: row.value.activities.filter(a => a.dayId === day.id).length, placeId: null, durationMin: input.durationMin, durationMax: input.durationMin, fixedStartAt: null, participantIds: row.value.participants.map(p => p.id), priority: 'prefer', status: 'planned', createdAt: now, updatedAt: now, revision: 1 });
        return this.store.save(id, row.value, revision);
    }
    reorderActivities(id, dayId, activityIds, revision) {
        const row = this.get(id);
        const current = row.value.activities.filter(a => a.dayId === dayId);
        if (!row.value.days.some(d => d.id === dayId) || current.length !== activityIds.length || new Set(activityIds).size !== activityIds.length || current.some(a => !activityIds.includes(a.id)))
            throw new Error('活动排序必须包含当天全部活动且不能重复');
        current.forEach(a => { a.sequence = activityIds.indexOf(a.id); a.revision += 1; a.updatedAt = new Date().toISOString(); });
        return this.store.save(id, row.value, revision);
    }
    setActivityEnabled(id, activityId, enabled, revision) {
        const row = this.get(id);
        const activity = row.value.activities.find(a => a.id === activityId);
        if (!activity)
            throw new Error('activity_not_found');
        activity.status = enabled ? 'planned' : 'cancelled';
        activity.revision += 1;
        activity.updatedAt = new Date().toISOString();
        return this.store.save(id, row.value, revision);
    }
    setDayDeparture(id, dayId, time, revision) {
        const row = this.get(id);
        const day = row.value.days.find(d => d.id === dayId);
        if (!day || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
            throw new Error('出发时间无效');
        day.departureAt = `${day.date}T${time}:00`;
        day.updatedAt = new Date().toISOString();
        day.revision += 1;
        return this.store.save(id, row.value, revision);
    }
    setDayLocations(id, dayId, startLocation, endLocation, revision) {
        const row = this.get(id);
        const day = row.value.days.find(item => item.id === dayId && item.planId === row.value.trip.currentPlanId);
        if (!day)
            throw new Error('day_not_found');
        day.startLocation = startLocation.trim();
        day.endLocation = endLocation.trim();
        day.updatedAt = new Date().toISOString();
        day.revision += 1;
        return this.store.save(id, row.value, revision);
    }
    updateAlternativeNote(id, note, revision) {
        const row = this.get(id);
        if (!note.trim())
            throw new Error('备选方案备注不能为空');
        const now = new Date().toISOString();
        let plan = row.value.plans.find(p => p.state === 'alternative');
        if (plan) {
            plan.changeSummary = note.trim();
            plan.updatedAt = now;
            plan.revision += 1;
        }
        else {
            plan = { id: id + ':alternative', tripId: id, parentVersionId: row.value.trip.currentPlanId, name: '备选方案', state: 'alternative', changeSummary: note.trim(), createdAt: now, updatedAt: now, revision: 1 };
            row.value.plans.push(plan);
        }
        return this.store.save(id, row.value, revision);
    }
    addBudgetItem(id, input, revision) {
        const row = this.get(id);
        const memberIds = row.value.participants.map(p => p.id);
        const selected = [...new Set(input.participantIds)];
        if (!input.id.trim() || row.value.budgetItems.some(i => i.id === input.id) || !input.category.trim() || !input.name.trim() || !Number.isSafeInteger(input.totalFen) || input.totalFen < 0 || !selected.length || selected.some(p => !memberIds.includes(p)))
            throw new Error('预算信息或分摊人员无效');
        const now = new Date().toISOString();
        const splitRule = input.mode === 'fixed'
            ? { type: 'fixed', allocations: Object.fromEntries((0, split_1.splitEvenly)(input.totalFen, selected).map(a => [a.participantId, a.amountFen])) }
            : { type: input.mode, participantIds: selected };
        row.value.budgetItems.push({ id: input.id, tripId: id, planId: row.value.trip.currentPlanId, category: input.category.trim(), name: input.name.trim(), lowFen: input.totalFen, highFen: input.totalFen, coverage: 'priced', beneficiaryIds: selected, splitRule, sourceId: null, remainingExpectedFen: input.totalFen, createdAt: now, updatedAt: now, revision: 1 });
        return this.store.save(id, row.value, revision);
    }
    addBooking(id, input, revision) {
        const row = this.get(id);
        const members = row.value.participants.map(p => p.id);
        const selected = [...new Set(input.participantIds)];
        if (!input.id.trim() || row.value.bookings.some(b => b.id === input.id) || !input.name.trim() || !validDate(input.useDate) || input.useDate < row.value.trip.startDate || input.useDate > row.value.trip.endDate || !selected.length || selected.some(p => !members.includes(p)) || (input.totalPriceFen !== null && (!Number.isSafeInteger(input.totalPriceFen) || input.totalPriceFen < 0)))
            throw new Error('预订信息无效');
        const now = new Date().toISOString();
        row.value.bookings.push({ id: input.id, tripId: id, name: input.name.trim(), useDate: input.useDate, applicableParticipantIds: selected, applicableVehicleIds: [], quantity: selected.length, totalPriceFen: input.totalPriceFen, purchaseStatus: 'not_purchased', reservationStatus: 'pending', usageStatus: 'unused', verificationStatus: 'needs_verification', createdAt: now, updatedAt: now, revision: 1 });
        return this.store.save(id, row.value, revision);
    }
    updateBookingStatus(id, bookingId, status, revision) {
        const row = this.get(id);
        const booking = row.value.bookings.find(b => b.id === bookingId);
        if (!booking || (!status.purchaseStatus && !status.reservationStatus))
            throw new Error('booking_not_found');
        if (status.purchaseStatus)
            booking.purchaseStatus = status.purchaseStatus;
        if (status.reservationStatus)
            booking.reservationStatus = status.reservationStatus;
        booking.updatedAt = new Date().toISOString();
        booking.revision += 1;
        return this.store.save(id, row.value, revision);
    }
    confirmExpense(id, expenseId, revision) {
        const row = this.get(id);
        const expense = row.value.expenses.find(e => e.id === expenseId);
        if (!expense || expense.status === 'rejected')
            throw new Error('invalid_expense');
        if (expense.status === 'confirmed')
            return row;
        expense.status = 'confirmed';
        expense.revision += 1;
        expense.updatedAt = new Date().toISOString();
        return this.store.save(id, row.value, revision);
    }
    submitRefund(id, input, revision) {
        const row = this.get(id);
        const memberIds = row.value.participants.map(participant => participant.id);
        if (!memberIds.includes(input.receiverId))
            throw new Error('invalid_participant');
        const expense = row.value.expenses.find(item => item.id === input.expenseId);
        if (!expense || expense.status !== 'confirmed')
            throw new Error('refund_requires_confirmed_expense');
        if (!input.id.trim() || row.value.refunds.some(refund => refund.id === input.id) || !Number.isSafeInteger(input.amountFen) || input.amountFen <= 0)
            throw new Error('invalid_refund');
        const priorRefundFen = row.value.refunds
            .filter(refund => refund.expenseId === expense.id)
            .reduce((sum, refund) => sum + refund.amountFen, 0);
        (0, ledger_1.validateRefund)(expense.totalFen, priorRefundFen, input.amountFen);
        const weights = Object.fromEntries(expense.allocations.map(allocation => [allocation.participantId, allocation.amountFen]));
        const now = new Date().toISOString();
        row.value.refunds.push({
            id: input.id,
            tripId: id,
            expenseId: expense.id,
            receiverId: input.receiverId,
            amountFen: input.amountFen,
            status: 'pending',
            allocations: (0, split_1.splitByWeights)(input.amountFen, weights),
            createdAt: now,
            updatedAt: now,
            revision: 1,
        });
        return this.store.save(id, row.value, revision);
    }
    confirmRefund(id, refundId, revision) {
        const row = this.get(id);
        const refund = row.value.refunds.find(item => item.id === refundId);
        if (!refund)
            throw new Error('refund_not_found');
        if (refund.status === 'confirmed')
            return row;
        const expense = row.value.expenses.find(item => item.id === refund.expenseId);
        if (!expense || expense.status !== 'confirmed')
            throw new Error('refund_requires_confirmed_expense');
        const priorConfirmedFen = row.value.refunds
            .filter(item => item.expenseId === expense.id && item.id !== refund.id && item.status === 'confirmed')
            .reduce((sum, item) => sum + item.amountFen, 0);
        (0, ledger_1.validateRefund)(expense.totalFen, priorConfirmedFen, refund.amountFen);
        refund.status = 'confirmed';
        refund.updatedAt = new Date().toISOString();
        refund.revision += 1;
        return this.store.save(id, row.value, revision);
    }
    reportTransfer(id, input, revision) {
        const row = this.get(id);
        const memberIds = row.value.participants.map(participant => participant.id);
        if (!memberIds.includes(input.fromParticipantId) || !memberIds.includes(input.toParticipantId))
            throw new Error('invalid_participant');
        if (!input.id.trim() || row.value.transfers.some(transfer => transfer.id === input.id) || input.fromParticipantId === input.toParticipantId || !Number.isSafeInteger(input.amountFen) || input.amountFen <= 0)
            throw new Error('invalid_transfer');
        const now = new Date().toISOString();
        row.value.transfers.push({
            id: input.id,
            tripId: id,
            fromParticipantId: input.fromParticipantId,
            toParticipantId: input.toParticipantId,
            amountFen: input.amountFen,
            status: 'reported',
            confirmedAt: null,
            createdAt: now,
            updatedAt: now,
            revision: 1,
        });
        return this.store.save(id, row.value, revision);
    }
    confirmTransfer(id, transferId, revision) {
        const row = this.get(id);
        const transfer = row.value.transfers.find(item => item.id === transferId);
        if (!transfer)
            throw new Error('transfer_not_found');
        if (transfer.status === 'confirmed')
            return row;
        const now = new Date().toISOString();
        transfer.status = 'confirmed';
        transfer.confirmedAt = now;
        transfer.updatedAt = now;
        transfer.revision += 1;
        return this.store.save(id, row.value, revision);
    }
    archiveTrip(id, revision) {
        const row = this.get(id);
        row.value.trip.status = 'archived';
        row.value.trip.updatedAt = new Date().toISOString();
        row.value.trip.revision += 1;
        return this.store.save(id, row.value, revision);
    }
    restoreTrip(id, revision) {
        const row = this.get(id);
        row.value.trip.status = 'planning';
        row.value.trip.updatedAt = new Date().toISOString();
        row.value.trip.revision += 1;
        return this.store.save(id, row.value, revision);
    }
}
exports.TripService = TripService;
