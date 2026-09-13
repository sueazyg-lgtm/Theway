export type Id = string
export type IsoDate = string
export type IsoDateTime = string
export type Fen = number
export type Certainty = 'explicit' | 'inferred' | 'missing' | 'source_claim'
export type VerificationStatus = 'confirmed' | 'needs_verification' | 'estimated' | 'expired'

export interface Versioned {
  id: Id
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  revision: number
}

export interface Trip extends Versioned {
  ownerId: Id
  title: string
  startDate: IsoDate
  endDate: IsoDate
  timezone: string
  currency: 'CNY'
  status: 'planning' | 'active' | 'completed' | 'archived'
  budgetLimitFen: Fen | null
  currentPlanId: Id
  origin?: string
  notes?: string
}

export interface ParticipationRange { startDate: IsoDate; endDate: IsoDate }
export interface Participant extends Versioned {
  tripId: Id
  displayName: string
  linkedUserId: Id | null
  groupId: Id | null
  participationRanges: ParticipationRange[]
}
export interface Group extends Versioned { tripId: Id; name: string; memberIds: Id[] }
export interface Vehicle extends Versioned {
  tripId: Id
  name: string
  seats: number
  energyType: 'fuel' | 'electric' | 'hybrid' | 'other'
}

export interface PlanVersion extends Versioned {
  tripId: Id
  parentVersionId: Id | null
  name: string
  state: 'current' | 'alternative' | 'history'
  changeSummary: string
}
export interface TripDay extends Versioned {
  tripId: Id
  planId: Id
  date: IsoDate
  startLocation: string
  endLocation: string
  departureAt: IsoDateTime | null
}
export type ActivityType = 'attraction' | 'meal' | 'shopping' | 'rest' | 'refuel' | 'parking' | 'transfer' | 'checkin' | 'custom'
export interface Activity extends Versioned {
  tripId: Id
  planId: Id
  dayId: Id
  sequence: number
  type: ActivityType
  name: string
  placeId: Id | null
  durationMin: number | null
  durationMax: number | null
  fixedStartAt: IsoDateTime | null
  participantIds: Id[]
  priority: 'must' | 'prefer' | 'optional'
  status: 'planned' | 'completed' | 'cancelled'
  notes?: string
}
export interface TransportLeg extends Versioned {
  tripId: Id
  planId: Id
  fromActivityId: Id | null
  toActivityId: Id | null
  mode: string
  distanceMeters: number | null
  durationMin: number | null
  durationMax: number | null
  direction: 'one_way' | 'round_trip'
  vehicleId: Id | null
  sourceId: Id | null
}
export interface ParkingSession extends Versioned {
  tripId: Id
  planId: Id
  vehicleId: Id
  placeId: Id
  parkedAt: IsoDateTime
  retrievedAt: IsoDateTime | null
  relatedActivityIds: Id[]
  verificationStatus: VerificationStatus
}

export type CostCoverage = 'priced' | 'unknown' | 'excluded' | 'included' | 'free' | 'not_applicable'
export type SplitRule =
  | { type: 'equal'; participantIds: Id[] }
  | { type: 'weighted'; weights: Record<Id, number> }
  | { type: 'fixed'; allocations: Record<Id, Fen> }
  | { type: 'room'; participantIds: Id[] }
export interface BudgetItem extends Versioned {
  tripId: Id
  planId: Id
  category: string
  name: string
  lowFen: Fen | null
  highFen: Fen | null
  coverage: CostCoverage
  beneficiaryIds: Id[]
  splitRule: SplitRule
  sourceId: Id | null
  remainingExpectedFen: Fen | null
}
export interface Allocation { participantId: Id; amountFen: Fen }
export interface Expense extends Versioned {
  tripId: Id
  payerId: Id
  paidAt: IsoDateTime
  totalFen: Fen
  status: 'pending' | 'confirmed' | 'rejected'
  requestId: string
  allocations: Allocation[]
}
export interface Refund extends Versioned {
  tripId: Id
  expenseId: Id
  receiverId: Id
  amountFen: Fen
  status: 'pending' | 'confirmed'
  allocations: Allocation[]
}
export interface SettlementTransfer extends Versioned {
  tripId: Id
  fromParticipantId: Id
  toParticipantId: Id
  amountFen: Fen
  status: 'suggested' | 'reported' | 'confirmed'
  confirmedAt: IsoDateTime | null
}

export interface RoomNight extends Versioned {
  tripId: Id
  planId: Id
  date: IsoDate
  lodgingName: string
  roomLabel: string
  capacity: number
  occupantIds: Id[]
  priceFen: Fen | null
  certainty: Certainty
  bookingId: Id | null
  noLodgingReason?: string
}
export interface Booking extends Versioned {
  tripId: Id
  name: string
  useDate: IsoDate
  applicableParticipantIds: Id[]
  applicableVehicleIds: Id[]
  quantity: number
  totalPriceFen: Fen | null
  purchaseStatus: 'not_purchased' | 'partially_purchased' | 'purchased' | 'cancelled'
  reservationStatus: 'not_required' | 'pending' | 'reserved' | 'failed' | 'expired'
  usageStatus: 'unused' | 'used' | 'invalid'
  verificationStatus: VerificationStatus
}

export interface ConflictRecord extends Versioned {
  tripId: Id
  code: string
  title: string
  status: 'conflict' | 'insufficient_information' | 'resolved'
  sourceSections: string[]
  adoptedValue: string | null
  resolutionReason: string | null
  userConfirmed: boolean
}
export interface InformationSource extends Versioned {
  tripId: Id
  title: string
  url: string | null
  declaredCheckedAt: IsoDateTime | null
  verificationStatus: VerificationStatus
}
export interface ImportRecord extends Versioned {
  tripId: Id
  sourceSection: string
  rawText: string
  value: string | number | null
  unit: string | null
  certainty: Certainty
  sourceDeclaredCheckedAt: IsoDateTime | null
  importedAt: IsoDateTime
  planScope: Id | null
  conflictGroup: string | null
}

export interface TripAggregate {
  trip: Trip
  participants: Participant[]
  groups: Group[]
  vehicles: Vehicle[]
  plans: PlanVersion[]
  days: TripDay[]
  activities: Activity[]
  transportLegs: TransportLeg[]
  parkingSessions: ParkingSession[]
  roomNights: RoomNight[]
  budgetItems: BudgetItem[]
  bookings: Booking[]
  expenses: Expense[]
  refunds: Refund[]
  transfers: SettlementTransfer[]
  conflicts: ConflictRecord[]
  sources: InformationSource[]
  imports: ImportRecord[]
}
