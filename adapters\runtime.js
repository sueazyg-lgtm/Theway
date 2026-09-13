const { LocalStore } = require('../runtime/services/local-store')
const { TripService } = require('../runtime/services/trip-service')

const storage = new LocalStore({
  get: key => wx.getStorageSync(key),
  set: (key, value) => wx.setStorageSync(key, value),
})

const service = new TripService(storage)

module.exports = { service }
