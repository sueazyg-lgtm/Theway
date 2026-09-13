import { describe, expect, it } from 'vitest'
import { calculateTimeline, evaluateArrivalWindow } from '../domain/calculations/timeline'

describe('timeline calculations', () => {
  it('T01 marks an arrival before the deadline as ok', () => {
    expect(evaluateArrivalWindow({ earliest: '11:00', latest: '11:20' }, '11:30').status).toBe('ok')
  })

  it('T02 marks an interval crossing the deadline as a possible conflict', () => {
    expect(evaluateArrivalWindow({ earliest: '11:20', latest: '11:50' }, '11:30').status).toBe('possible_conflict')
  })

  it('T03 marks an earliest arrival after the deadline as a conflict', () => {
    expect(evaluateArrivalWindow({ earliest: '11:40', latest: '12:00' }, '11:30').status).toBe('conflict')
  })

  it('T04 preserves insufficient information', () => {
    expect(evaluateArrivalWindow({ earliest: null, latest: null }, '11:30').status).toBe('insufficient_information')
  })

  it('T05 propagates activity and travel duration intervals', () => {
    const result = calculateTimeline(
      { date: '2026-10-01', departureAt: '2026-10-01T09:00:00+08:00' },
      [
        { id: 'a', name: 'A', durationMin: 30, durationMax: 45, fixedStartAt: null },
        { id: 'b', name: 'B', durationMin: 20, durationMax: 20, fixedStartAt: null },
      ],
      [{ fromActivityId: 'a', toActivityId: 'b', durationMin: 10, durationMax: 20, direction: 'one_way' }],
    )
    expect(result.items[1]).toMatchObject({ earliestStartAt: '2026-10-01T09:40:00+08:00', latestStartAt: '2026-10-01T10:05:00+08:00' })
    expect(result.complete).toBe(true)
  })

  it('T06 keeps a fixed activity time and reports lateness', () => {
    const result = calculateTimeline(
      { date: '2026-10-01', departureAt: '2026-10-01T09:00:00+08:00' },
      [
        { id: 'a', name: 'A', durationMin: 60, durationMax: 70, fixedStartAt: null },
        { id: 'b', name: 'B', durationMin: 20, durationMax: 20, fixedStartAt: '2026-10-01T10:00:00+08:00' },
      ],
      [{ fromActivityId: 'a', toActivityId: 'b', durationMin: 10, durationMax: 10, direction: 'one_way' }],
    )
    expect(result.items[1]).toMatchObject({ earliestStartAt: '2026-10-01T10:00:00+08:00', latestStartAt: '2026-10-01T10:00:00+08:00', status: 'conflict' })
  })

  it('T07 does not halve or duplicate a declared round-trip duration', () => {
    const result = calculateTimeline(
      { date: '2026-10-01', departureAt: '2026-10-01T09:00:00+08:00' },
      [
        { id: 'a', name: 'A', durationMin: 0, durationMax: 0, fixedStartAt: null },
        { id: 'b', name: 'B', durationMin: 0, durationMax: 0, fixedStartAt: null },
      ],
      [{ fromActivityId: 'a', toActivityId: 'b', durationMin: 120, durationMax: 120, direction: 'round_trip' }],
    )
    expect(result.items[1]!.earliestStartAt).toBe('2026-10-01T11:00:00+08:00')
  })

  it('T08 propagates an unknown leg as incomplete instead of inventing a duration', () => {
    const result = calculateTimeline(
      { date: '2026-10-01', departureAt: '2026-10-01T09:00:00+08:00' },
      [
        { id: 'a', name: 'A', durationMin: 30, durationMax: 30, fixedStartAt: null },
        { id: 'b', name: 'B', durationMin: 20, durationMax: 20, fixedStartAt: null },
      ],
      [{ fromActivityId: 'a', toActivityId: 'b', durationMin: null, durationMax: null, direction: 'one_way' }],
    )
    expect(result.items[1]!.status).toBe('insufficient_information')
    expect(result.complete).toBe(false)
  })
  it('keeps local wall-clock timestamps without inventing a timezone',()=>{
    const result=calculateTimeline({date:'2026-10-01',departureAt:'2026-10-01T08:30:00'},[{id:'a',name:'A',durationMin:60,durationMax:60,fixedStartAt:null}],[])
    expect(result.items[0]!.earliestEndAt).toBe('2026-10-01T09:30:00')
  })
})

