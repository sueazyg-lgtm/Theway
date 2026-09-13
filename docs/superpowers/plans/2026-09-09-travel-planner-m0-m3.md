# Travel Planner M0-M3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an importable native WeChat Mini Program that persists trips locally, calculates itinerary and financial results independently, loads the Xinjiang case as traceable seed data, and exposes M0-M3 behavior without pretending missing cloud or map configuration is connected.

**Architecture:** Pure TypeScript domain modules own models and calculations. Mini Program pages call application services through repository interfaces; the initial `DemoLocalRepository` uses `wx` storage while cloud and map adapters fail explicitly when unconfigured. Generic fixtures and Xinjiang fixtures remain separate.

**Tech Stack:** Native WeChat Mini Program, TypeScript 7.0.2, Vitest 5.0.0, miniprogram-api-typings 5.2.3, Node.js 24.16.0, npm 11.13.0.

## Global Constraints

- Money is stored and calculated as integer RMB fen.
- Booking or purchase status never creates an actual expense automatically.
- Planning versions never roll back confirmed expenses, refunds, or transfers.
- Unknown money and time values remain null and produce incomplete results.
- Participant count, destination, transport mode, vehicle model, and Xinjiang-specific conditions are data, never global defaults.
- Demo-local mode is visibly isolated and must not claim real login, sharing, cloud sync, maps, prices, payments, or notifications.
- Formal brand identity remains replaceable through configuration and three-layer design tokens.
- Work proceeds in the current `master` checkout because the user explicitly authorized code here and will import this directory into WeChat Developer Tools.

---

### Task 1: M0 Tooling, Models, and Design Tokens

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`
- Create: `project.config.json`, `project.private.config.example.json`
- Create: `miniprogram/app.ts`, `miniprogram/app.json`, `miniprogram/app.wxss`, `miniprogram/sitemap.json`
- Create: `miniprogram/config/brand.ts`, `miniprogram/styles/tokens.wxss`
- Create: `domain/models/types.ts`, `domain/models/validation.ts`, `tests/models.test.ts`

**Interfaces:**
- Produces: `TripAggregate`, `Participant`, `PlanVersion`, `BudgetItem`, `Expense`, `Refund`, `SettlementTransfer`, `Booking`, `ConflictRecord`.
- Produces: primitive → semantic → component WXSS variables and neutral brand configuration.

- [ ] **Step 1: Write the failing model test**

```ts
import { describe, expect, it } from 'vitest'
import { validateTrip } from '../domain/models/validation'

it('rejects an end date before the start date', () => {
  expect(() => validateTrip({ startDate: '2026-10-02', endDate: '2026-10-01' }))
    .toThrowError('返程日期不能早于出发日期')
})
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/models.test.ts`
Expected: FAIL because `validation` does not exist.

- [ ] **Step 3: Add exact dependencies and minimal models**

`package.json` scripts must include `test: vitest run`, `test:watch: vitest`, and `typecheck: tsc --noEmit`. Add exact dev dependencies `typescript@7.0.2`, `vitest@5.0.0`, and `miniprogram-api-typings@5.2.3`.

- [ ] **Step 4: Implement `validateTrip` and token layers**

```ts
export function validateTrip(input: Pick<Trip, 'startDate' | 'endDate'>): void {
  if (input.endDate < input.startDate) throw new Error('返程日期不能早于出发日期')
}
```

Use neutral warm-white surfaces, ink text, muted blue-green primary, amber warning, and brick error semantic tokens. Components reference semantic variables only.

- [ ] **Step 5: Run GREEN and typecheck**

Run: `npm test -- tests/models.test.ts; npm run typecheck`
Expected: model test passes and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore project.config.json project.private.config.example.json miniprogram domain tests
git commit -m "feat: scaffold native mini program domain"
```

### Task 2: Core Budget, Split, Ledger, and Settlement Calculations

**Files:**
- Create: `domain/calculations/budget.ts`, `split.ts`, `ledger.ts`, `settlement.ts`
- Create: `tests/financial.test.ts`

**Interfaces:**
- Produces: `calculateBudget(items): BudgetSummary`
- Produces: `splitEvenly(amountFen, participantIds): Allocation[]`
- Produces: `splitByWeights(amountFen, weights): Allocation[]`
- Produces: `calculateNetExpenses(expenses, refunds): number`
- Produces: `calculateBalances(participantIds, expenses, refunds, transfers): Balance[]`
- Produces: `suggestTransfers(balances): TransferSuggestion[]`

- [ ] **Step 1: Write F01-F10 as failing tests**

```ts
expect(splitEvenly(10_000, ['A', 'B', 'C'])).toEqual([
  { participantId: 'A', amountFen: 3334 },
  { participantId: 'B', amountFen: 3333 },
  { participantId: 'C', amountFen: 3333 },
])
expect(calculateBudget([{ lowFen: 10_000, highFen: 15_000 }, { lowFen: null, highFen: null }]))
  .toMatchObject({ lowFen: 10_000, highFen: 15_000, unknownCount: 1, complete: false })
```

Cover room splits, date-specific beneficiaries, basic settlement, refund, partial transfer, deposit, idempotency validation, and discount comparison.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/financial.test.ts`
Expected: FAIL because calculation modules do not exist.

- [ ] **Step 3: Implement minimal deterministic calculations**

Use floor-to-fen plus remainder order by fractional remainder then stable participant ID. Reject negative values, zero total weights, fixed allocations that do not sum, and refunds above confirmed expense totals.

- [ ] **Step 4: Run GREEN and full regression**

Run: `npm test -- tests/financial.test.ts; npm test; npm run typecheck`
Expected: all tests pass and all balances sum to zero.

- [ ] **Step 5: Commit**

```powershell
git add domain/calculations tests/financial.test.ts
git commit -m "feat: add financial calculations and settlement"
```

### Task 3: Timeline, Vehicle Location, and Conflict Rules

**Files:**
- Create: `domain/calculations/timeline.ts`, `domain/rules/conflicts.ts`
- Create: `tests/timeline.test.ts`, `tests/conflicts.test.ts`

**Interfaces:**
- Produces: `calculateTimeline(day, activities, legs): TimelineResult`
- Produces: `evaluateArrivalWindow(window, deadline): CheckResult`
- Produces: `checkVehicleContinuity(events, legs): ConflictRecord[]`
- Produces: `checkBookingConditions(bookings, conditions): ConflictRecord[]`

- [ ] **Step 1: Write T01-T08 and vehicle-location failing tests**

```ts
expect(evaluateArrivalWindow({ earliest: '11:20', latest: '11:50' }, '11:30').status)
  .toBe('possible_conflict')
expect(evaluateArrivalWindow({ earliest: null, latest: null }, '11:30').status)
  .toBe('insufficient_information')
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/timeline.test.ts tests/conflicts.test.ts`
Expected: FAIL because timeline and rule modules do not exist.

- [ ] **Step 3: Implement interval propagation and rule outputs**

Unknown durations propagate incomplete state. Fixed activities keep their fixed time and report lateness. A round-trip duration is never duplicated or halved without a selected direction value.

- [ ] **Step 4: Run GREEN and regression**

Run: `npm test; npm run typecheck`
Expected: F, T, and conflict suites pass.

- [ ] **Step 5: Commit**

```powershell
git add domain/calculations/timeline.ts domain/rules tests
git commit -m "feat: calculate timelines and planning conflicts"
```

### Task 4: Repository, Application Service, and Persistent Demo Mode

**Files:**
- Create: `services/repositories/trip-repository.ts`
- Create: `services/demo-local/storage-port.ts`, `demo-local-repository.ts`
- Create: `services/cloud/cloud-repository.ts`, `services/map/manual-map-provider.ts`
- Create: `services/trip-service.ts`, `tests/repository.test.ts`, `tests/trip-service.test.ts`

**Interfaces:**
- Produces: `TripRepository.list/get/save/archive`
- Produces: `TripService.createTrip/updateTrip/importFixture/previewChange/applyChange/submitExpense/confirmExpense`
- Consumes: injectable `StoragePort` with `get/set/remove` methods.

- [ ] **Step 1: Write failing repository contract tests**

```ts
const repo = new DemoLocalRepository({
  values: new Map<string, unknown>(),
  get(key) { return this.values.get(key) },
  set(key, value) { this.values.set(key, value) },
  remove(key) { this.values.delete(key) },
})
const saved = await repo.save(seed, 0)
await expect(repo.save(seed, 0)).rejects.toMatchObject({ code: 'version_conflict' })
expect((await repo.get(seed.trip.id))?.revision).toBe(saved.revision)
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/repository.test.ts tests/trip-service.test.ts`
Expected: FAIL because repository and service modules do not exist.

- [ ] **Step 3: Implement storage envelope, revisions, and idempotency**

Persist `{ schemaVersion: 1, savedAt, trips }`. Cloud and map adapters return `external_unavailable` when unconfigured. Never silently switch a real-mode request to local storage.

- [ ] **Step 4: Run GREEN and regression**

Run: `npm test; npm run typecheck`
Expected: save/reload, version conflict, request replay, and adapter failure tests pass.

- [ ] **Step 5: Commit**

```powershell
git add services tests
git commit -m "feat: persist trip aggregates in demo mode"
```

### Task 5: Xinjiang Seed, Conflicts, and X01-X20

**Files:**
- Create: `fixtures/xinjiang/seed.ts`, `fixtures/xinjiang/conflicts.ts`, `fixtures/xinjiang/acceptance.ts`
- Create: `fixtures/generic/financial.ts`, `fixtures/generic/timeline.ts`
- Create: `tests/xinjiang.test.ts`, `docs/xinjiang-seed-notes.md`

**Interfaces:**
- Produces: `xinjiangSeed: TripAggregate`
- Produces: `xinjiangSourceConflicts: ConflictRecord[]`
- Produces: case assertions grouped as extraction, calculation, and external-unverified.

- [ ] **Step 1: Write failing X01-X20 tests**

```ts
expect(xinjiangSeed.expenses).toHaveLength(0)
expect(xinjiangSeed.roomNights.reduce((sum, night) => sum + (night.priceFen ?? 0), 0))
  .toBe(1_130_968)
expect(xinjiangSeed.bookings
  .filter(x => x.purchaseStatus === 'purchased')
  .reduce((sum, booking) => sum + (booking.totalPriceFen ?? 0), 0))
  .toBe(100_500)
expect(xinjiangSourceConflicts.map(x => x.code)).toContain('C03')
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/xinjiang.test.ts`
Expected: FAIL because case fixture does not exist.

- [ ] **Step 3: Build the marked fixture**

Encode 10 days, 9 nights, placeholder participants, two groups, one vehicle, current/original/weather plan versions, room-night derivations, booking statuses, C01-C10, source certainty, and excluded-cost notes. Do not include real payment, refund, or transfer rows.

- [ ] **Step 4: Run GREEN and non-hardcoding checks**

Run: `npm test -- tests/xinjiang.test.ts; rg -n "新疆|坦克300|三人" domain services miniprogram/config`
Expected: X tests pass; case strings appear only in fixture-facing UI copy, never generic domain defaults.

- [ ] **Step 5: Commit**

```powershell
git add fixtures tests/xinjiang.test.ts docs/xinjiang-seed-notes.md
git commit -m "feat: add traceable Xinjiang acceptance fixture"
```

### Task 6: M1-M2 Mini Program Pages

**Files:**
- Create: `miniprogram/adapters/runtime.ts`, `miniprogram/adapters/view-models.ts`
- Create pages under `miniprogram/pages/trips`, `overview`, `itinerary`, `budget`, `bookings`, `adjustments`
- Create: `miniprogram/components/state-banner/*`, `metric-card/*`, `status-chip/*`, `timeline-item/*`
- Create: `tests/view-models.test.ts`

**Interfaces:**
- Consumes: `TripService`, calculations, repository.
- Produces: five stable navigation entries plus trip list and working create/import/edit actions.

- [ ] **Step 1: Write failing view-model tests**

Test that overview separates known budget, unknown items, confirmed actual expenses, and pending expenses; test that booking purchase and reservation labels remain independent.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/view-models.test.ts`
Expected: FAIL because view models do not exist.

- [ ] **Step 3: Implement pages and three-layer WXSS tokens**

Use 44px-or-larger touch targets, text plus color for status, persistent demo-mode banner, clear empty/error/permission states, and actual add/edit/save/import behaviors. Avoid hover-only interaction.

- [ ] **Step 4: Run GREEN, typecheck, and config validation**

Run: `npm test; npm run typecheck; node scripts/validate-project.mjs`
Expected: tests pass and every configured page has `.ts`, `.json`, `.wxml`, `.wxss` files.

- [ ] **Step 5: Commit**

```powershell
git add miniprogram scripts tests/view-models.test.ts
git commit -m "feat: add itinerary and finance mini program flows"
```

### Task 7: M3 Adjustment, Permission, Share Preview, and Archive

**Files:**
- Create: `domain/services/change-preview.ts`, `domain/services/access.ts`
- Create: `cloudfunctions/trip-command/index.ts`, `cloudfunctions/share-read/index.ts`
- Modify: adjustment, overview, and trip-list pages
- Create: `tests/change-preview.test.ts`, `tests/access.test.ts`, `tests/archive.test.ts`

**Interfaces:**
- Produces: immutable preview result keyed by base revision.
- Produces: owner/member/visitor field filtering and command authorization.
- Produces: archive/read/reopen operations with audit records.

- [ ] **Step 1: Write failing M3 behavior tests**

Test T07-T08, visitor redaction, revoked share rejection, stale preview rejection, financial facts surviving plan changes, and archive history.

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/change-preview.test.ts tests/access.test.ts tests/archive.test.ts`
Expected: FAIL because M3 services do not exist.

- [ ] **Step 3: Implement M3 services and page actions**

Cloud functions validate identity, grant, revision, and request ID. Without cloud config, share UI renders a local preview and `真实分享未接通` instead of a success token.

- [ ] **Step 4: Run GREEN and regression**

Run: `npm test; npm run typecheck; node scripts/validate-project.mjs`
Expected: all suites and structural validation pass.

- [ ] **Step 5: Commit**

```powershell
git add domain/services cloudfunctions miniprogram tests
git commit -m "feat: add plan previews permissions and archive"
```

### Task 8: Documentation and Final Verification

**Files:**
- Create: `README.md`, `.env.example`, `docs/data-model.md`, `docs/manual-acceptance.md`, `docs/verification-report.md`
- Modify: `docs/requirements-mapping.md`, `docs/decisions.md`

**Interfaces:**
- Produces: exact import path, npm commands, demo seed flow, cloud/map configuration boundaries, and evidence-based M0-M3 status.

- [ ] **Step 1: Update requirement rows with real implementation paths and test names**

No row may be marked complete solely because a page or model exists.

- [ ] **Step 2: Run complete automated verification**

Run: `npm ci; npm test; npm run typecheck; node scripts/validate-project.mjs; git diff --check`
Expected: every command exits zero and the report records actual test counts.

- [ ] **Step 3: Inspect in WeChat Developer Tools**

Import the repository root, compile, load Xinjiang seed, create a generic trip, edit and reopen it, inspect all five entries, add/confirm/refund an expense, generate settlement, preview a plan change, and verify demo sharing is labeled local-only.

- [ ] **Step 4: Record external limitations honestly**

Keep true cloud login/share, cross-device sync, maps, live prices, payments, notifications, and unperformed device checks marked unconnected or unverified.

- [ ] **Step 5: Commit**

```powershell
git add README.md .env.example docs
git commit -m "docs: add setup and M0-M3 verification report"
```
