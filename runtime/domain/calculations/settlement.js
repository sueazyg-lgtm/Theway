"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBalances = calculateBalances;
exports.suggestTransfers = suggestTransfers;
function calculateBalances(participantIds, expenses, refunds, transfers) {
    const values = new Map(participantIds.map(id => [id, 0]));
    const add = (id, amount) => { var _a; return values.set(id, ((_a = values.get(id)) !== null && _a !== void 0 ? _a : 0) + amount); };
    for (const expense of expenses) {
        add(expense.payerId, expense.amountFen);
        for (const allocation of expense.allocations)
            add(allocation.participantId, -allocation.amountFen);
    }
    for (const refund of refunds) {
        add(refund.receiverId, -refund.amountFen);
        for (const allocation of refund.allocations)
            add(allocation.participantId, allocation.amountFen);
    }
    for (const transfer of transfers) {
        add(transfer.fromParticipantId, transfer.amountFen);
        add(transfer.toParticipantId, -transfer.amountFen);
    }
    const result = [...values.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([participantId, amountFen]) => ({ participantId, amountFen }));
    if (result.reduce((sum, item) => sum + item.amountFen, 0) !== 0)
        throw new Error('结算余额不守恒');
    return result;
}
function suggestTransfers(balances) {
    const creditors = balances.filter(item => item.amountFen > 0).sort((a, b) => a.participantId.localeCompare(b.participantId)).map(item => ({ ...item }));
    const debtors = balances.filter(item => item.amountFen < 0).sort((a, b) => a.participantId.localeCompare(b.participantId)).map(item => ({ ...item, amountFen: -item.amountFen }));
    const result = [];
    let ci = 0;
    let di = 0;
    while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const amountFen = Math.min(creditor.amountFen, debtor.amountFen);
        result.push({ fromParticipantId: debtor.participantId, toParticipantId: creditor.participantId, amountFen });
        creditor.amountFen -= amountFen;
        debtor.amountFen -= amountFen;
        if (creditor.amountFen === 0)
            ci += 1;
        if (debtor.amountFen === 0)
            di += 1;
    }
    return result;
}
