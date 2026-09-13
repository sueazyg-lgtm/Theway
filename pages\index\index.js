const { service } = require('../../adapters/runtime')
const { xinjiangSeed } = require('../../runtime/fixtures/xinjiang/seed')
const { toUserMessage } = require('../../runtime/services/error-messages')

Page({
  data: {
    trips: [],
    archivedTrips: [],
    creating: false,
    error: '',
    title: '',
    startDate: '',
    endDate: '',
    names: '',
  },

  onShow() {
    this.refresh()
  },

  run(action) {
    try {
      this.setData({ error: '' })
      action()
    } catch (error) {
      const message = toUserMessage(error)
      this.setData({ error: message })
      wx.showToast({ title: message, icon: 'none' })
    }
  },

  refresh() {
    this.run(() => {
      const allTrips = service.list().map(row => ({
        id: row.id,
        revision: row.revision,
        title: row.value.trip.title,
        start: row.value.trip.startDate,
        end: row.value.trip.endDate,
        count: row.value.participants.length,
        status: row.value.trip.status,
      }))
      this.setData({
        trips: allTrips.filter(trip => trip.status !== 'archived'),
        archivedTrips: allTrips.filter(trip => trip.status === 'archived'),
      })
    })
  },

  startCreate() {
    this.setData({ creating: true, error: '' })
  },

  cancelCreate() {
    this.setData({ creating: false, error: '' })
  },

  field(event) {
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  create() {
    this.run(() => {
      const row = service.createTrip({
        id: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: this.data.title,
        startDate: this.data.startDate,
        endDate: this.data.endDate,
        participantNames: this.data.names
          .split(/[,，\n]/)
          .map(name => name.trim())
          .filter(Boolean),
      })
      this.setData({ creating: false, title: '', startDate: '', endDate: '', names: '' })
      this.openTrip(row.id)
    })
  },

  importXinjiang() {
    this.run(() => {
      const saved = service.importTrip(xinjiangSeed)
      this.openTrip(saved.id)
    })
  },

  open(event) {
    this.openTrip(event.currentTarget.dataset.id)
  },

  openTrip(tripId) {
    wx.navigateTo({
      url: `/pages/overview/index?tripId=${encodeURIComponent(tripId)}`,
    })
  },

  archive(event) {
    const { id, revision } = event.currentTarget.dataset
    wx.showModal({
      title: '归档这趟旅行？',
      content: '归档不会删除任何行程、预算或账本数据，之后可以随时恢复。',
      success: result => {
        if (!result.confirm) return
        this.run(() => {
          service.archiveTrip(id, Number(revision))
          this.refresh()
        })
      },
    })
  },

  restore(event) {
    this.run(() => {
      service.restoreTrip(
        event.currentTarget.dataset.id,
        Number(event.currentTarget.dataset.revision),
      )
      this.refresh()
      wx.showToast({ title: '旅行已恢复' })
    })
  },
})
