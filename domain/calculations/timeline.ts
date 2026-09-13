export interface ArrivalWindow {
  earliest: string | null
  latest: string | null
}

export type TimelineStatus = 'ok' | 'possible_conflict' | 'conflict' | 'insufficient_information'

export interface CheckResult {
  status: TimelineStatus
}

export interface TimelineDayInput {
  date: string
  departureAt: string | null
}

export interface TimelineActivityInput {
  id: string
  name: string
  durationMin: number | null
  durationMax: number | null
  fixedStartAt: string | null
}

export interface TimelineLegInput {
  fromActivityId: string | null
  toActivityId: string | null
  durationMin: number | null
  durationMax: number | null
  direction: 'one_way' | 'round_trip'
}

export interface TimelineItem {
  activityId: string
  name: string
  earliestStartAt: string | null
  latestStartAt: string | null
  earliestEndAt: string | null
  latestEndAt: string | null
  status: TimelineStatus
}

export interface TimelineResult {
  items: TimelineItem[]
  complete: boolean
}

function timeToMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error(`无效时间：${value}`)
  return Number(match[1]) * 60 + Number(match[2])
}

export function evaluateArrivalWindow(window: ArrivalWindow, deadline: string): CheckResult {
  if (window.earliest === null || window.latest === null) return { status: 'insufficient_information' }
  const earliest = timeToMinutes(window.earliest)
  const latest = timeToMinutes(window.latest)
  const limit = timeToMinutes(deadline)
  if (earliest > limit) return { status: 'conflict' }
  if (latest > limit) return { status: 'possible_conflict' }
  return { status: 'ok' }
}

function offsetDetails(value: string): { suffix: string; minutes: number } {
  if (value.endsWith('Z')) return { suffix: 'Z', minutes: 0 }
  const match = /([+-])(\d{2}):(\d{2})$/.exec(value)
  if (!match) return { suffix: '', minutes: 0 }
  const magnitude = Number(match[2]) * 60 + Number(match[3])
  return { suffix: match[0], minutes: match[1] === '+' ? magnitude : -magnitude }
}

function addMinutes(value: string, minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) throw new Error('时长必须是非负数')
  const offset = offsetDetails(value)
  const localMatch=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(value)
  const epoch=localMatch?Date.UTC(Number(localMatch[1]),Number(localMatch[2])-1,Number(localMatch[3]),Number(localMatch[4]),Number(localMatch[5]),Number(localMatch[6])):new Date(value).getTime()+offset.minutes*60_000
  const local = new Date(epoch + minutes * 60_000)
  const iso = local.toISOString().slice(0, 19)
  return `${iso}${offset.suffix}`
}

function compareDateTime(left: string, right: string): number {
  return new Date(left).getTime() - new Date(right).getTime()
}

export function calculateTimeline(
  day: TimelineDayInput,
  activities: TimelineActivityInput[],
  legs: TimelineLegInput[],
): TimelineResult {
  let earliestCursor = day.departureAt
  let latestCursor = day.departureAt
  let complete = day.departureAt !== null
  const items: TimelineItem[] = []

  for (let index = 0; index < activities.length; index += 1) {
    const activity = activities[index]!
    let earliestStartAt = earliestCursor
    let latestStartAt = latestCursor
    let status: TimelineStatus = earliestCursor === null || latestCursor === null ? 'insufficient_information' : 'ok'

    if (activity.fixedStartAt !== null) {
      if (earliestCursor !== null && compareDateTime(earliestCursor, activity.fixedStartAt) > 0) status = 'conflict'
      else if (latestCursor !== null && compareDateTime(latestCursor, activity.fixedStartAt) > 0) status = 'possible_conflict'
      earliestStartAt = activity.fixedStartAt
      latestStartAt = activity.fixedStartAt
    }

    const durationKnown = activity.durationMin !== null && activity.durationMax !== null
    const earliestEndAt = earliestStartAt !== null && durationKnown ? addMinutes(earliestStartAt, activity.durationMin!) : null
    const latestEndAt = latestStartAt !== null && durationKnown ? addMinutes(latestStartAt, activity.durationMax!) : null
    if (!durationKnown) {
      complete = false
      status = 'insufficient_information'
    }

    items.push({ activityId: activity.id, name: activity.name, earliestStartAt, latestStartAt, earliestEndAt, latestEndAt, status })

    const next = activities[index + 1]
    if (!next) continue
    const leg = legs.find(candidate => candidate.fromActivityId === activity.id && candidate.toActivityId === next.id)
    const legKnown = leg !== undefined && leg.durationMin !== null && leg.durationMax !== null
    if (earliestEndAt === null || latestEndAt === null || !legKnown) {
      earliestCursor = null
      latestCursor = null
      complete = false
    } else {
      // The supplied duration already represents its declared direction. Never infer half/double duration.
      earliestCursor = addMinutes(earliestEndAt, leg.durationMin!)
      latestCursor = addMinutes(latestEndAt, leg.durationMax!)
    }
  }

  return { items, complete }
}
