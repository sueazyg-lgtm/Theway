import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)

describe('mini program page architecture', () => {
  it('registers one trip list plus five focused trip workspace pages', () => {
    const app = JSON.parse(readFileSync(new URL('app.json', root), 'utf8')) as { pages: string[] }

    expect(app.pages).toEqual(expect.arrayContaining([
      'pages/index/index',
      'pages/overview/index',
      'pages/itinerary/index',
      'pages/budget/index',
      'pages/bookings/index',
      'pages/adjustments/index',
    ]))
  })

  it('keeps every workspace page importable by WeChat Developer Tools', () => {
    for (const page of ['overview', 'itinerary', 'budget', 'bookings', 'adjustments']) {
      for (const extension of ['js', 'json', 'wxml', 'wxss']) {
        expect(() => readFileSync(new URL(`pages/${page}/index.${extension}`, root), 'utf8'))
          .not.toThrow()
      }
    }
  })

  it('keeps the trip list page focused on create, import and open actions', () => {
    const indexTemplate = readFileSync(new URL('pages/index/index.wxml', root), 'utf8')

    expect(indexTemplate).not.toContain('activeTab')
    expect(indexTemplate).not.toContain('实际账本')
    expect(indexTemplate).not.toContain('方案调整')
  })

  it('wires refund entry and confirmation into the budget page', () => {
    const budgetTemplate = readFileSync(new URL('pages/budget/index.wxml', root), 'utf8')
    const budgetScript = readFileSync(new URL('pages/budget/index.js', root), 'utf8')

    expect(budgetTemplate).toContain('bindtap="submitRefund"')
    expect(budgetTemplate).toContain('bindtap="confirmRefund"')
    expect(budgetScript).toContain('submitRefund()')
    expect(budgetScript).toContain('confirmRefund(event)')
  })

  it('wires editable daily start and end locations into the itinerary page', () => {
    const itineraryTemplate = readFileSync(new URL('pages/itinerary/index.wxml', root), 'utf8')
    const itineraryScript = readFileSync(new URL('pages/itinerary/index.js', root), 'utf8')

    expect(itineraryTemplate).toContain('bindtap="saveDayLocations"')
    expect(itineraryScript).toContain('saveDayLocations()')
  })

  it('wires reversible archive controls into the trip list', () => {
    const indexTemplate = readFileSync(new URL('pages/index/index.wxml', root), 'utf8')
    const indexScript = readFileSync(new URL('pages/index/index.js', root), 'utf8')

    expect(indexTemplate).toContain('catchtap="archive"')
    expect(indexTemplate).toContain('catchtap="restore"')
    expect(indexScript).toContain('archive(event)')
    expect(indexScript).toContain('restore(event)')
  })

  it('lets each actual expense choose its own split participants', () => {
    const budgetTemplate = readFileSync(new URL('pages/budget/index.wxml', root), 'utf8')
    const budgetScript = readFileSync(new URL('pages/budget/index.js', root), 'utf8')

    expect(budgetTemplate).toContain('bindchange="expensePeople"')
    expect(budgetScript).toContain('expensePeople(event)')
    expect(budgetScript).toContain('beneficiaryIds: this.data.expenseParticipantIds')
  })

  it('uses the shared user-facing error mapper in list and workspace pages', () => {
    const indexScript = readFileSync(new URL('pages/index/index.js', root), 'utf8')
    const helpersScript = readFileSync(new URL('adapters/page-helpers.js', root), 'utf8')
    const overviewScript = readFileSync(new URL('pages/overview/index.js', root), 'utf8')
    const shareScript = readFileSync(new URL('pages/share/index.js', root), 'utf8')

    expect(indexScript).toContain("require('../../runtime/services/error-messages')")
    expect(indexScript).toContain('toUserMessage(error)')
    expect(helpersScript).toContain("require('../runtime/services/error-messages')")
    expect(helpersScript).toContain('toUserMessage(error)')
    expect(overviewScript).toContain("require('../../runtime/services/error-messages')")
    expect(overviewScript).toContain('toUserMessage(error)')
    expect(shareScript).toContain("require('../../runtime/services/error-messages')")
    expect(shareScript).toContain('toUserMessage(error)')
  })

  it('wires reported and confirmed settlement transfers into the budget page', () => {
    const budgetTemplate = readFileSync(new URL('pages/budget/index.wxml', root), 'utf8')
    const budgetScript = readFileSync(new URL('pages/budget/index.js', root), 'utf8')

    expect(budgetTemplate).toContain('bindtap="reportTransfer"')
    expect(budgetTemplate).toContain('bindtap="confirmTransfer"')
    expect(budgetScript).toContain('reportTransfer(event)')
    expect(budgetScript).toContain('confirmTransfer(event)')
  })

  it('shows the last successful local save time on the trip overview', () => {
    const overviewTemplate = readFileSync(new URL('pages/overview/index.wxml', root), 'utf8')
    const helpersScript = readFileSync(new URL('adapters/page-helpers.js', root), 'utf8')

    expect(overviewTemplate).toContain('selected.lastLocalSave')
    expect(helpersScript).toContain('service.lastSavedAt()')
  })
})
