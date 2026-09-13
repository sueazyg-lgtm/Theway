import { describe, expect, it } from 'vitest'
import { validateTrip } from '../domain/models/validation'

describe('trip validation', () => {
  it('rejects an end date before the start date', () => {
    expect(() => validateTrip({ startDate: '2026-10-02', endDate: '2026-10-01' }))
      .toThrowError('返程日期不能早于出发日期')
  })

  it('accepts a same-day trip', () => {
    expect(() => validateTrip({ startDate: '2026-10-01', endDate: '2026-10-01' }))
      .not.toThrow()
  })
})
