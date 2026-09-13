import { expect, it } from 'vitest'
import { LocalStore } from '../services/local-store'

function storage() {
  const data = new Map<string, unknown>()
  return { get: (key: string) => data.get(key), set: (key: string, value: unknown) => { data.set(key, value) } }
}
it('persists independent trips across repository instances and rejects stale writes', () => {
  const port = storage()
  const first = new LocalStore<{ title: string }>(port)
  expect(first.save('a', { title: '旅行' }, 0).revision).toBe(1)
  const second = new LocalStore<{ title: string }>(port)
  expect(second.get('a')?.value.title).toBe('旅行')
  second.save('a', { title: '新计划' }, 1)
  expect(() => first.save('a', { title: '旧计划' }, 1)).toThrow('version_conflict')
  first.save('b', { title: '另一趟' }, 0)
  expect(second.list()).toHaveLength(2)
})
it('returns detached values and never overwrites corrupt or future storage', () => {
  const port = storage()
  const repo = new LocalStore<{ title: string }>(port)
  repo.save('a', { title: '原值' }, 0)
  repo.get('a')!.value.title = '外部修改'
  expect(repo.get('a')!.value.title).toBe('原值')
  port.set('travel-planner:demo:v1', { schemaVersion: 2 })
  expect(() => repo.save('b', { title: '新值' }, 0)).toThrow('storage_schema_unsupported')
  port.set('travel-planner:demo:v1', '{broken')
  expect(() => repo.list()).toThrow('storage_corrupt')
})
it('surfaces write failures without claiming a successful save', () => {
  const repo = new LocalStore({ get: () => undefined, set: () => { throw new Error('quota exceeded') } })
  expect(() => repo.save('a', {}, 0)).toThrow('quota exceeded')
})

it('exposes the last successful local save time without changing stored data', () => {
  const port = storage()
  const repo = new LocalStore<{ title: string }>(port)
  expect(repo.lastSavedAt()).toBeNull()

  repo.save('a', { title: '旅行' }, 0)
  const savedAt = repo.lastSavedAt()

  expect(savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  expect(repo.get('a')?.value.title).toBe('旅行')
})
