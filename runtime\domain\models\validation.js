"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateTrip = validateTrip;
function validateTrip(input) {
    if (input.endDate < input.startDate) {
        throw new Error('返程日期不能早于出发日期');
    }
}
