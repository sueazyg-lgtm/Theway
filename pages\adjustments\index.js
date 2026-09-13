const { service, readTripId, loadTrip, run, bindField, backToTrips } = require('../../adapters/page-helpers')

Page({
  data: {
    tripId: '',
    selected: null,
    error: '',
    alternativeNote: '',
  },

  onLoad(options) {
    run(this, () => this.setData({ tripId: readTripId(options) }))
  },

  onShow() {
    if (!this.data.tripId) return
    run(this, () => {
      const selected = loadTrip(this)
      this.setData({ alternativeNote: selected.alternativeNote })
    })
  },

  backToTrips,
  field(event) { bindField(this, event) },

  saveAlternative() {
    run(this, () => {
      service.updateAlternativeNote(
        this.data.selected.id,
        this.data.alternativeNote,
        this.data.selected.revision,
      )
      loadTrip(this)
      wx.showToast({ title: '备选备注已保存' })
    })
  },

  toggleActivity(event) {
    run(this, () => {
      service.setActivityEnabled(
        this.data.selected.id,
        event.currentTarget.dataset.id,
        event.currentTarget.dataset.status === 'cancelled',
        this.data.selected.revision,
      )
      const selected = loadTrip(this)
      this.setData({ alternativeNote: selected.alternativeNote })
    })
  },
})
