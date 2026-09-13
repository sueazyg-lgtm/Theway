"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBudget = calculateBudget;
exports.compareDiscount = compareDiscount;
function calculateBudget(items) {
    const known = items.filter(item => item.lowFen !== null && item.highFen !== null);
    return {
        lowFen: known.reduce((sum, item) => sum + item.lowFen, 0),
        highFen: known.reduce((sum, item) => sum + item.highFen, 0),
        unknownCount: items.length - known.length,
        complete: known.length === items.length,
    };
}
function compareDiscount(normalFen, optionFen, additionalFen, conditionsConfirmed) {
    const withOptionFen = optionFen + additionalFen;
    return { withOptionFen, savingsFen: normalFen - withOptionFen, complete: conditionsConfirmed };
}
