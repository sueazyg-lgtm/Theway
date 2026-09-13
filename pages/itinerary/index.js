const { service, readTripId, loadTrip, run, bindField, backToTrips } = require('../../adapters/page-helpers')

Page({
  data: {
    tripId: '',
    selected: null,
    error: '',
    dayIndex: 0,
    typeIndex: 0,
    activityName: '',
    activityDuration: '',
    activityTypes: ['游玩', '地点', '交通', '住宿'],
    activityTypeValues: ['attraction', 'custom', 'transfer', 'checkin'],
    routeDayIndex: 0,
    startLocation: '',
    endLocation: '',
  },

  onLoad(options) {
    run(this, () => this.setData({ tripId: readTripId(options) }))
  },

  onShow() {
    if (this.data.tripId) run(this, () => {
      const selected = loadTrip(this)
      const index = Math.min(Number(this.data.routeDayIndex), selected.days.length - 1)
      const day = selected.days[index]
      this.setData({
        routeDayIndex: index,
        startLocation: day.startLocation,
        endLocation: day.endLocation,
      })
    })
  },

  backToTrips,
  field(event) { bindField(this, event) },

  selectRouteDay(event) {
    const routeDayIndex = Number(event.detail.value)
    const day = this.data.selected.days[routeDayIndex]
    this.setData({
      routeDayIndex,
      startLocation: day.startLocation,
      endLocation: day.endLocation,
    })
  },

  saveDayLocations() {
    run(this, () => {
      const selected = this.data.selected
      const day = selected.days[Number(this.data.routeDayIndex)]
      service.setDayLocations(
        selected.id,
        day.id,
        this.data.startLocation,
        this.data.endLocation,
        selected.revision,
      )
      loadTrip(this)
      wx.showToast({ title: '每日路线已保存' })
    })
  },

  addActivity() {
    run(this, () => {
      const selected = this.data.selected
      const duration = this.data.activityDuration === '' ? null : Number(this.data.activityDuration)
      service.addActivity(selected.id, {
        id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        dayId: selected.days[Number(this.data.dayIndex)].id,
        name: this.data.activityName,
        type: this.data.activityTypeValues[Number(this.data.typeIndex)],
        durationMin: duration,
      }, selected.revision)
      this.setData({ activityName: '', activityDuration: '' })
      loadTrip(this)
    })
  },

  moveActivity(event) {
    run(this, () => {
      const selected = this.data.selected
      const day = selected.days.find(item => item.id === event.currentTarget.dataset.day)
      const ids = day.activities.map(activity => activity.id)
      const from = ids.indexOf(event.currentTarget.dataset.id)
      const to = from + Number(event.currentTarget.dataset.direction)
      if (to < 0 || to >= ids.length) return
      ;[ids[from], ids[to]] = [ids[to], ids[from]]
      service.reorderActivities(selected.id, day.id, ids, selected.revision)
      loadTrip(this)
    })
  },

  setDeparture(event) {
    run(this, () => {
      service.setDayDeparture(
        this.data.selected.id,
        event.currentTarget.dataset.day,
        event.detail.value,
        this.data.selected.revision,
      )
      loadTrip(this)
    })
  },
})
