export interface StoragePort {
  get(key: string): unknown
  set(key: string, value: unknown): void
}
export interface Stored<T> { id: string; revision: number; value: T }
interface Envelope<T> { schemaVersion: 1; savedAt: string; trips: Stored<T>[] }
function copy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) }

/** Synchronous storage keeps read/check/write atomic within one local runtime. */
export class LocalStore<T> {
  private readonly key = 'travel-planner:demo:v1'
  constructor(private readonly port: StoragePort) {}

  private read(): Envelope<T> {
    const raw = this.port.get(this.key)
    if (raw === undefined || raw === null || raw === '') return { schemaVersion: 1, savedAt: '', trips: [] }
    if (typeof raw !== 'object') throw new Error('storage_corrupt')
    const data = raw as Envelope<T>
    if (data.schemaVersion !== 1) throw new Error('storage_schema_unsupported')
    if (!Array.isArray(data.trips) || data.trips.some(row => !row || typeof row.id !== 'string' || !Number.isSafeInteger(row.revision) || row.revision < 1 || row.value === undefined)) throw new Error('storage_corrupt')
    if (new Set(data.trips.map(row => row.id)).size !== data.trips.length) throw new Error('storage_corrupt')
    return copy(data)
  }

  list(): Stored<T>[] { return this.read().trips }
  get(id: string): Stored<T> | null { return this.list().find(row => row.id === id) ?? null }
  lastSavedAt(): string | null { return this.read().savedAt || null }
  save(id: string, value: T, expectedRevision: number): Stored<T> {
    if (!id.trim() || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('invalid_write')
    const data = this.read()
    const existing = data.trips.find(row => row.id === id)
    if ((existing?.revision ?? 0) !== expectedRevision) throw new Error('version_conflict')
    const saved = { id, revision: expectedRevision + 1, value: copy(value) }
    data.trips = data.trips.filter(row => row.id !== id).concat(saved)
    data.savedAt = new Date().toISOString()
    this.port.set(this.key, copy(data))
    return copy(saved)
  }
}
