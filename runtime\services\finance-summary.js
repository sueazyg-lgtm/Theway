"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeSummary = financeSummary;
const budget_1 = require("../domain/calculations/budget");
const settlement_1 = require("../domain/calculations/settlement");
function financeSummary(input) {
    const expenses = input.expenses.filter(e => e.status === 'confirmed');
    const refunds = input.refunds.filter(e => e.status === 'confirmed');
    const balances = (0, settlement_1.calculateBalances)(input.participants.map(p => p.id), expenses.map(e => ({ ...e, amountFen: e.totalFen })), refunds, input.transfers.filter(t => t.status === 'confirmed'));
    return { budget: (0, budget_1.calculateBudget)(input.budgetItems), actualFen: expenses.reduce((s, e) => s + e.totalFen, 0) - refunds.reduce((s, e) => s + e.amountFen, 0), pendingFen: input.expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.totalFen, 0), balances, suggestions: (0, settlement_1.suggestTransfers)(balances) };
}
