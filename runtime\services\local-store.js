"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStore = void 0;
function copy(value) { return JSON.parse(JSON.stringify(value)); }
/** Synchronous storage keeps read/check/write atomic within one local runtime. */
class LocalStore {
    constructor(port) {
        this.port = port;
        this.key = 'travel-planner:demo:v1';
    }
    read() {
        const raw = this.port.get(this.key);
        if (raw === undefined || raw === null || raw === '')
            return { schemaVersion: 1, savedAt: '', trips: [] };
        if (typeof raw !== 'object')
            throw new Error('storage_corrupt');
        const data = raw;
        if (data.schemaVersion !== 1)
            throw new Error('storage_schema_unsupported');
        if (!Array.isArray(data.trips) || data.trips.some(row => !row || typeof row.id !== 'string' || !Number.isSafeInteger(row.revision) || row.revision < 1 || row.value === undefined))
            throw new Error('storage_corrupt');
        if (new Set(data.trips.map(row => row.id)).size !== data.trips.length)
            throw new Error('storage_corrupt');
        return copy(data);
    }
    list() { return this.read().trips; }
    get(id) { var _a; return (_a = this.list().find(row => row.id === id)) !== null && _a !== void 0 ? _a : null; }
    lastSavedAt() { return this.read().savedAt || null; }
    save(id, value, expectedRevision) {
        var _a;
        if (!id.trim() || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0)
            throw new Error('invalid_write');
        const data = this.read();
        const existing = data.trips.find(row => row.id === id);
        if (((_a = existing === null || existing === void 0 ? void 0 : existing.revision) !== null && _a !== void 0 ? _a : 0) !== expectedRevision)
            throw new Error('version_conflict');
        const saved = { id, revision: expectedRevision + 1, value: copy(value) };
        data.trips = data.trips.filter(row => row.id !== id).concat(saved);
        data.savedAt = new Date().toISOString();
        this.port.set(this.key, copy(data));
        return copy(saved);
    }
}
exports.LocalStore = LocalStore;
