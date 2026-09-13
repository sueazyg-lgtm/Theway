const { service } = require('./runtime')
const { createTripWorkspaceView } = require('../runtime/services/view-models')
const { toUserMessage } = require('../runtime/services/error-messages')

function readTripId(options) {
  const tripId = decodeURIComponent((options && options.tripId) || '')
  if (!tripId) throw new Error('缺少行程标识，请从旅行列表重新进入')
  return tripId
}

function formatLocalTime(value) {
  if (!value) return '尚未保存'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '保存时间不可用'
  const pad = number => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function loadTrip(page) {
  const row = service.get(page.data.tripId)
  const selected = createTripWorkspaceView(row.value, row.revision)
  selected.lastLocalSave = formatLocalTime(service.lastSavedAt())
  page.setData({ selected, error: '' })
  wx.setNavigationBarTitle({ title: selected.title })
  return selected
}

function run(page, action) {
  try {
    page.setData({ error: '' })
    return action()
  } catch (error) {
    const message = toUserMessage(error)
    page.setData({ error: message })
    wx.showToast({ title: message, icon: 'none' })
    return undefined
  }
}

function bindField(page, event) {
  page.setData({ [event.currentTarget.dataset.field]: event.detail.value })
}

function backToTrips() {
  wx.reLaunch({ url: '/pages/index/index' })
}

module.exports = { service, readTripId, loadTrip, run, bindField, backToTrips }
