import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const root = new URL('../', import.meta.url)
const pages = ['index', 'overview', 'itinerary', 'budget', 'bookings', 'adjustments', 'share']
const tabIcons = ['overview', 'itinerary', 'budget', 'bookings', 'adjustments']

describe('Apple-style mini program design system', () => {
  it('defines mobile semantic tokens and accessible touch targets', () => {
    const tokens = readFileSync(new URL('styles/tokens.wxss', root), 'utf8')
    const workspace = readFileSync(new URL('styles/workspace.wxss', root), 'utf8')

    expect(tokens).toContain('--color-primary: var(--moss-600)')
    expect(tokens).toContain('--color-background-grouped:')
    expect(tokens).toContain('--material-tabbar:')
    expect(workspace).toContain('min-height: 88rpx')
    expect(workspace).not.toContain('.eyebrow')
  })

  it('uses local SVG assets for every tab and selected state', () => {
    const template = readFileSync(new URL('components/trip-tabbar/index.wxml', root), 'utf8')
    const script = readFileSync(new URL('components/trip-tabbar/index.js', root), 'utf8')

    expect(template).toContain('<image')
    expect(template).toContain('item.activeIcon')
    expect(script).toContain("icon: '/assets/icons/")

    for (const icon of tabIcons) {
      for (const state of ['', '-active']) {
        const path = new URL(`assets/icons/${icon}${state}.svg`, root)
        expect(existsSync(path)).toBe(true)
        expect(readFileSync(path, 'utf8')).toContain('<svg')
      }
    }
  })

  it('keeps page templates free of emoji and legacy English eyebrows', () => {
    const emoji = /\p{Extended_Pictographic}/u

    for (const page of pages) {
      const template = readFileSync(new URL(`pages/${page}/index.wxml`, root), 'utf8')
      expect(template).not.toMatch(emoji)
      expect(template).not.toContain('class="eyebrow"')
      expect(template).not.toMatch(/TRAVEL PLANNER|TRIP OVERVIEW|ITINERARY|BUDGET &amp; LEDGER|BOOKINGS &amp; TODOS|PLAN ADJUSTMENTS/)
    }
  })

  it('records the locked multi-page design system and preflight', () => {
    expect(existsSync(new URL('design.md', root))).toBe(true)
    expect(existsSync(new URL('tokens.css', root))).toBe(true)
    expect(existsSync(new URL('.hallmark/preflight.json', root))).toBe(true)
    expect(existsSync(new URL('.hallmark/log.json', root))).toBe(true)
  })

  it('uses a restrained grouped trip list and vertically centered controls', () => {
    const indexTemplate = readFileSync(new URL('pages/index/index.wxml', root), 'utf8')
    const indexStyles = readFileSync(new URL('pages/index/index.wxss', root), 'utf8')
    const workspace = readFileSync(new URL('styles/workspace.wxss', root), 'utf8')

    expect(indexTemplate).toContain('class="trip-list"')
    expect(indexTemplate).toContain('class="header-action"')
    expect(indexTemplate).not.toContain('class="open-link"')
    expect(indexTemplate).not.toContain('<button class="primary" bindtap="startCreate">')
    expect(indexStyles).toContain('.trip-row + .trip-row')
    expect(workspace).toMatch(/button\s*\{[^}]*display:\s*flex;/s)
    expect(workspace).toMatch(/button\s*\{[^}]*align-items:\s*center;/s)
    expect(workspace).toMatch(/button\s*\{[^}]*justify-content:\s*center;/s)
  })

  it('uses the approved warm outdoor visual language with vector nature art', () => {
    const tokens = readFileSync(new URL('styles/tokens.wxss', root), 'utf8')
    const workspace = readFileSync(new URL('styles/workspace.wxss', root), 'utf8')
    const home = readFileSync(new URL('pages/index/index.wxml', root), 'utf8')
    const tabbar = readFileSync(new URL('components/trip-tabbar/index.wxml', root), 'utf8')
    const landscape = new URL('assets/illustrations/nature-hero.svg', root)

    expect(tokens).toContain('--ivory-100: #f7f3e8')
    expect(tokens).toContain('--moss-600:')
    expect(tokens).toContain('--sunset-500:')
    expect(tokens).not.toContain('--ios-blue:')
    expect(workspace).toContain('linear-gradient(135deg')
    expect(home).toContain('class="nature-hero"')
    expect(home).toContain('/assets/illustrations/nature-hero.svg')
    expect(tabbar).toContain("item.key === 'budget' ? 'tab-primary' : ''")
    expect(existsSync(landscape)).toBe(true)
    expect(readFileSync(landscape, 'utf8')).toContain('<svg')
  })
})
