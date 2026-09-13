import { describe, expect, it } from 'vitest'
import { checkBookingConditions, checkVehicleContinuity } from '../domain/rules/conflicts'

describe('planning conflict rules', () => {
  it('reports a vehicle departure while the vehicle is parked elsewhere', () => {
    const conflicts = checkVehicleContinuity(
      [{ vehicleId: 'v1', placeId: 'parking-a', parkedAt: '2026-10-01T09:00:00+08:00', retrievedAt: '2026-10-01T12:00:00+08:00' }],
      [{ id: 'leg-1', vehicleId: 'v1', fromPlaceId: 'parking-b', departureAt: '2026-10-01T10:00:00+08:00' }],
      { tripId: 'trip-1', now: '2026-09-09T12:00:00+08:00' },
    )
    expect(conflicts.map(item => item.code)).toContain('VEHICLE_LOCATION_CONFLICT')
  })

  it('does not report a vehicle after it has been retrieved', () => {
    expect(checkVehicleContinuity(
      [{ vehicleId: 'v1', placeId: 'parking-a', parkedAt: '2026-10-01T09:00:00+08:00', retrievedAt: '2026-10-01T10:00:00+08:00' }],
      [{ id: 'leg-1', vehicleId: 'v1', fromPlaceId: 'parking-b', departureAt: '2026-10-01T10:30:00+08:00' }],
      { tripId: 'trip-1', now: '2026-09-09T12:00:00+08:00' },
    )).toHaveLength(0)
  })

  it('keeps purchase and reservation requirements independent', () => {
    const conflicts = checkBookingConditions(
      [{ id: 'ticket-1', purchaseStatus: 'purchased', reservationStatus: 'pending', verificationStatus: 'confirmed' }],
      [{ bookingId: 'ticket-1', requirePurchase: true, requireReservation: true, requireCurrentVerification: false }],
      { tripId: 'trip-1', now: '2026-09-09T12:00:00+08:00' },
    )
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toMatchObject({ code: 'BOOKING_RESERVATION_REQUIRED', status: 'conflict' })
  })

  it('reports missing booking data as insufficient information', () => {
    const conflicts = checkBookingConditions(
      [],
      [{ bookingId: 'missing', requirePurchase: true, requireReservation: false, requireCurrentVerification: false }],
      { tripId: 'trip-1', now: '2026-09-09T12:00:00+08:00' },
    )
    expect(conflicts[0]).toMatchObject({ code: 'BOOKING_INFORMATION_MISSING', status: 'insufficient_information' })
  })
})
