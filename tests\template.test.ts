import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('keeps JavaScript operators unescaped in every registered page WXML expression', () => {
  const app = JSON.parse(readFileSync('app.json', 'utf8')) as { pages: string[] }
  const files = [
    ...app.pages.map(page => `${page}.wxml`),
    'components/trip-tabbar/index.wxml',
  ]
  let expressionCount = 0

  for (const file of files) {
    const template = readFileSync(file, 'utf8')
    const expressions = template.match(/\{\{[\s\S]*?\}\}/g) ?? []
    expressionCount += expressions.length
    for (const expression of expressions) {
      expect(expression, file).not.toMatch(/&(?:amp|lt|gt|quot);/)
    }
  }

  expect(expressionCount).toBeGreaterThan(20)
})
