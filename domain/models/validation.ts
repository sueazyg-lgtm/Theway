import type { Trip } from './types'

export function validateTrip(input: Pick<Trip, 'startDate' | 'endDate'>): void {
  if (input.endDate < input.startDate) {
    throw new Error('返程日期不能早于出发日期')
  }
}
