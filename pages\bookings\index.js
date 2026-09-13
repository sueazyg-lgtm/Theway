const { service, readTripId, loadTrip, run, bindField, backToTrips } = require('../../adapters/page-helpers')

Page({
  data: {
    tripId: '',
    selected: null,
    error: '',
    bookingName: '',
    bookingDate: '',
    bookingAmount: '',
  },

  onLoad(options) {
    run(this, () => this.setData({ tripId: readTripId(options) }))
  },

  onShow() {
    if (!this.data.tripId) return
    run(this, () => {
      const selected = loadTrip(this)
      if (!this.data.bookingDate) this.setData({ bookingDate: selected.startDate })
    })
  },

  backToTrips,
  field(event) { bindField(this, event) },

  addBooking() {
    run(this, () => {
      if (this.data.bookingAmount && !/^\d+(\.\d{1,2})?$/.test(this.data.bookingAmount)) {
        throw new Error('请输入最多两位小数的预订金额')
      }
      const selected = this.data.selected
      service.addBooking(selected.id, {
        id: `booking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: this.data.bookingName,
        useDate: this.data.bookingDate,
        participantIds: selected.participants.map(participant => participant.id),
        totalPriceFen: this.data.bookingAmount === ''
          ? null
          : Math.round(Number(this.data.bookingAmount) * 100),
      }, selected.revision)
      this.setData({ bookingName: '', bookingAmount: '' })
      loadTrip(this)
    })
  },

  markPurchased(event) {
    run(this, () => {
      service.updateBookingStatus(
        this.data.selected.id,
        event.currentTarget.dataset.id,
        { purchaseStatus: 'purchased' },
        this.data.selected.revision,
      )
      loadTrip(this)
    })
  },

  markReserved(event) {
    run(this, () => {
      service.updateBookingStatus(
        this.data.selected.id,
        event.currentTarget.dataset.id,
        { reservationStatus: 'reserved' },
        this.data.selected.revision,
      )
      loadTrip(this)
    })
  },
})
