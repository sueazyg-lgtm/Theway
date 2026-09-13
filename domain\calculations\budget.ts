export interface BudgetInput { lowFen: number | null; highFen: number | null }
export interface BudgetSummary { lowFen: number; highFen: number; unknownCount: number; complete: boolean }

export function calculateBudget(items: BudgetInput[]): BudgetSummary {
  const known = items.filter(item => item.lowFen !== null && item.highFen !== null)
  return {
    lowFen: known.reduce((sum, item) => sum + item.lowFen!, 0),
    highFen: known.reduce((sum, item) => sum + item.highFen!, 0),
    unknownCount: items.length - known.length,
    complete: known.length === items.length,
  }
}

export function compareDiscount(normalFen: number, optionFen: number, additionalFen: number, conditionsConfirmed: boolean) {
  const withOptionFen = optionFen + additionalFen
  return { withOptionFen, savingsFen: normalFen - withOptionFen, complete: conditionsConfirmed }
}
