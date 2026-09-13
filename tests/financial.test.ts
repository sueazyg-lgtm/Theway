import { describe, expect, it } from 'vitest'
import { calculateBudget, compareDiscount } from '../domain/calculations/budget'
import { splitEvenly, splitFixed, splitByWeights } from '../domain/calculations/split'
import { calculateNetExpenses } from '../domain/calculations/ledger'
import { calculateBalances, suggestTransfers } from '../domain/calculations/settlement'

describe('financial calculations', () => {
  it('F01 distributes remainder by stable participant id', () => {
    expect(splitEvenly(10_000, ['C', 'A', 'B'])).toEqual([
      { participantId: 'A', amountFen: 3334 },
      { participantId: 'B', amountFen: 3333 },
      { participantId: 'C', amountFen: 3333 },
    ])
  })

  it('F02 supports room-specific beneficiaries', () => {
    expect([...splitEvenly(40_000, ['A', 'B']), ...splitEvenly(30_000, ['C'])])
      .toEqual([
        { participantId: 'A', amountFen: 20_000 },
        { participantId: 'B', amountFen: 20_000 },
        { participantId: 'C', amountFen: 30_000 },
      ])
  })

  it('F03 only splits to the supplied date beneficiaries', () => {
    expect(splitEvenly(12_000, ['A', 'B'])).toEqual([
      { participantId: 'A', amountFen: 6000 },
      { participantId: 'B', amountFen: 6000 },
    ])
  })

  it('F04 creates balanced receivable and payable amounts', () => {
    const balances = calculateBalances(['A', 'B', 'C'], [{ payerId: 'A', amountFen: 30_000, allocations: splitEvenly(30_000, ['A', 'B', 'C']) }], [], [])
    expect(balances).toEqual([
      { participantId: 'A', amountFen: 20_000 },
      { participantId: 'B', amountFen: -10_000 },
      { participantId: 'C', amountFen: -10_000 },
    ])
  })

  it('F05 applies a confirmed refund to payment and allocation', () => {
    const balances = calculateBalances(
      ['A', 'B', 'C'],
      [{ payerId: 'A', amountFen: 30_000, allocations: splitEvenly(30_000, ['A', 'B', 'C']) }],
      [{ receiverId: 'A', amountFen: 6000, allocations: splitEvenly(6000, ['A', 'B', 'C']) }],
      [],
    )
    expect(balances.map(x => x.amountFen)).toEqual([16_000, -8000, -8000])
  })

  it('F06 confirmed transfers change balance but not consumption', () => {
    const balances = calculateBalances(
      ['A', 'B', 'C'],
      [{ payerId: 'A', amountFen: 30_000, allocations: splitEvenly(30_000, ['A', 'B', 'C']) }],
      [],
      [{ fromParticipantId: 'B', toParticipantId: 'A', amountFen: 10_000 }],
    )
    expect(balances.map(x => x.amountFen)).toEqual([10_000, 0, -10_000])
  })

  it('F07 keeps unknown budget items visible', () => {
    expect(calculateBudget([{ lowFen: 10_000, highFen: 15_000 }, { lowFen: null, highFen: null }]))
      .toEqual({ lowFen: 10_000, highFen: 15_000, unknownCount: 1, complete: false })
  })

  it('F08 represents deposit without double counting final estimate', () => {
    expect(calculateBudget([{ lowFen: 100_000, highFen: 100_000 }])).toMatchObject({ highFen: 100_000 })
    expect(calculateNetExpenses([{ amountFen: 20_000 }], [])).toBe(20_000)
  })

  it('F09 rejects incomplete fixed allocations and supports weights', () => {
    expect(() => splitFixed(10_000, { A: 9000 })).toThrow('固定分配合计必须等于费用金额')
    expect(splitByWeights(100, { A: 2, B: 1 })).toEqual([
      { participantId: 'A', amountFen: 67 },
      { participantId: 'B', amountFen: 33 },
    ])
  })

  it('F10 compares the same discount scope', () => {
    expect(compareDiscount(30_000, 18_000, 4000, true)).toEqual({ withOptionFen: 22_000, savingsFen: 8000, complete: true })
    expect(compareDiscount(30_000, 18_000, 4000, false).complete).toBe(false)
  })

  it('suggests deterministic transfers that clear balances', () => {
    expect(suggestTransfers([
      { participantId: 'A', amountFen: 20_000 },
      { participantId: 'B', amountFen: -10_000 },
      { participantId: 'C', amountFen: -10_000 },
    ])).toEqual([
      { fromParticipantId: 'B', toParticipantId: 'A', amountFen: 10_000 },
      { fromParticipantId: 'C', toParticipantId: 'A', amountFen: 10_000 },
    ])
  })
})
