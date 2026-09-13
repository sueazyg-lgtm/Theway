import type { Allocation } from '../models/types'

function assertFen(amountFen: number): void {
  if (!Number.isSafeInteger(amountFen) || amountFen < 0) throw new Error('金额必须是非负整数分')
}

export function splitByWeights(amountFen: number, weights: Record<string, number>): Allocation[] {
  assertFen(amountFen)
  const entries = Object.entries(weights).sort(([a], [b]) => a.localeCompare(b))
  if (!entries.length || entries.some(([, weight]) => weight < 0)) throw new Error('分摊权重无效')
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (totalWeight <= 0) throw new Error('至少一人权重必须大于零')

  const rows = entries.map(([participantId, weight]) => {
    const exact = amountFen * weight / totalWeight
    return { participantId, amountFen: Math.floor(exact), remainder: exact - Math.floor(exact) }
  })
  let centsLeft = amountFen - rows.reduce((sum, row) => sum + row.amountFen, 0)
  const remainderOrder = [...rows].sort((a, b) => b.remainder - a.remainder || a.participantId.localeCompare(b.participantId))
  for (let i = 0; i < centsLeft; i += 1) remainderOrder[i % remainderOrder.length]!.amountFen += 1
  return rows.map(({ participantId, amountFen: allocatedFen }) => ({ participantId, amountFen: allocatedFen }))
}

export function splitEvenly(amountFen: number, participantIds: string[]): Allocation[] {
  return splitByWeights(amountFen, Object.fromEntries(participantIds.map(id => [id, 1])))
}

export function splitFixed(amountFen: number, allocations: Record<string, number>): Allocation[] {
  assertFen(amountFen)
  const rows = Object.entries(allocations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([participantId, value]) => {
      assertFen(value)
      return { participantId, amountFen: value }
    })
  if (rows.reduce((sum, row) => sum + row.amountFen, 0) !== amountFen) {
    throw new Error('固定分配合计必须等于费用金额')
  }
  return rows
}
