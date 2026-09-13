import type { ConflictRecord, VerificationStatus } from '../models/types'

interface ConflictContext {
  tripId: string
  now: string
}

interface ParkingEventInput {
  vehicleId: string
  placeId: string
  parkedAt: string
  retrievedAt: string | null
}

interface VehicleLegInput {
  id: string
  vehicleId: string | null
  fromPlaceId: string | null
  departureAt: string | null
}

interface BookingInput {
  id: string
  purchaseStatus: 'not_purchased' | 'partially_purchased' | 'purchased' | 'cancelled'
  reservationStatus: 'not_required' | 'pending' | 'reserved' | 'failed' | 'expired'
  verificationStatus: VerificationStatus
}

interface BookingConditionInput {
  bookingId: string
  requirePurchase: boolean
  requireReservation: boolean
  requireCurrentVerification: boolean
}

function conflict(
  context: ConflictContext,
  code: string,
  title: string,
  status: ConflictRecord['status'],
  suffix: string,
): ConflictRecord {
  return {
    id: `${code}:${suffix}`,
    tripId: context.tripId,
    code,
    title,
    status,
    sourceSections: [],
    adoptedValue: null,
    resolutionReason: null,
    userConfirmed: false,
    createdAt: context.now,
    updatedAt: context.now,
    revision: 0,
  }
}

export function checkVehicleContinuity(
  events: ParkingEventInput[],
  legs: VehicleLegInput[],
  context: ConflictContext,
): ConflictRecord[] {
  const results: ConflictRecord[] = []
  for (const leg of legs) {
    if (leg.vehicleId === null || leg.departureAt === null || leg.fromPlaceId === null) continue
    const departure = new Date(leg.departureAt).getTime()
    const blocking = events.find(event => {
      if (event.vehicleId !== leg.vehicleId || event.placeId === leg.fromPlaceId) return false
      const parked = new Date(event.parkedAt).getTime()
      const retrieved = event.retrievedAt === null ? Number.POSITIVE_INFINITY : new Date(event.retrievedAt).getTime()
      return departure >= parked && departure < retrieved
    })
    if (blocking) results.push(conflict(context, 'VEHICLE_LOCATION_CONFLICT', '车辆在出发时仍停放于其他地点', 'conflict', leg.id))
  }
  return results
}

export function checkBookingConditions(
  bookings: BookingInput[],
  conditions: BookingConditionInput[],
  context: ConflictContext,
): ConflictRecord[] {
  const results: ConflictRecord[] = []
  for (const condition of conditions) {
    const booking = bookings.find(item => item.id === condition.bookingId)
    if (!booking) {
      results.push(conflict(context, 'BOOKING_INFORMATION_MISSING', '缺少预约或购票信息', 'insufficient_information', condition.bookingId))
      continue
    }
    if (condition.requirePurchase && booking.purchaseStatus !== 'purchased') {
      results.push(conflict(context, 'BOOKING_PURCHASE_REQUIRED', '尚未满足购票条件', 'conflict', booking.id))
    }
    if (condition.requireReservation && booking.reservationStatus !== 'reserved') {
      results.push(conflict(context, 'BOOKING_RESERVATION_REQUIRED', '尚未满足预约条件', 'conflict', booking.id))
    }
    if (condition.requireCurrentVerification && booking.verificationStatus !== 'confirmed') {
      results.push(conflict(context, 'BOOKING_VERIFICATION_REQUIRED', '预约信息需要重新核验', 'conflict', booking.id))
    }
  }
  return results
}
